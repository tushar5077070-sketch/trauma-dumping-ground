import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  DiaryEntry,
  InnerJournalEntry,
  InnerPrivacyPrefs,
  InnerReflectionMemory,
  SavedMemory,
  VoiceJournal,
} from '../types/garden';
import {
  clearActiveVaultPassphrase,
  decryptTextWithPassphrase,
  encryptTextWithPassphrase,
  isEncryptedPayload,
} from '../utils/vaultCrypto';

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return cleaned || `id_${Date.now()}`;
}

export interface VaultExportBundle {
  exportedAt: string;
  platform: 'Unsaid';
  accountEmail: string;
  vaultWasUnlockedDuringExport: boolean;
  privacyNotice: string;
  counts: {
    personalDiary: number;
    voiceJournals: number;
    memories: number;
    innerJournalEntries: number;
    innerReflections: number;
  };
  data: {
    personalDiary: DiaryEntry[];
    voiceJournals: VoiceJournal[];
    memories: SavedMemory[];
    innerJournalEntries: InnerJournalEntry[];
    innerReflections: InnerReflectionMemory[];
    innerPrivacyPrefs: InnerPrivacyPrefs | null;
  };
}

/**
 * Generates and downloads a complete JSON backup of all private user records directly in the browser.
 * Zero backend round-trip.
 */
export function downloadUserVaultExport(params: {
  userEmail: string;
  vaultUnlocked: boolean;
  diaryEntries: DiaryEntry[];
  voiceJournals: VoiceJournal[];
  memories: SavedMemory[];
  innerEntries: InnerJournalEntry[];
  innerReflections: InnerReflectionMemory[];
  innerPrivacyPrefs: InnerPrivacyPrefs | null;
}): void {
  const today = new Date().toISOString().slice(0, 10);
  const bundle: VaultExportBundle = {
    exportedAt: new Date().toISOString(),
    platform: 'Unsaid',
    accountEmail: params.userEmail || 'Signed-in Member',
    vaultWasUnlockedDuringExport: params.vaultUnlocked,
    privacyNotice:
      'Exported locally in your browser from your strictly owner-only Unsaid private vault. Public anonymous flowers are not linked to your account and are never included.',
    counts: {
      personalDiary: params.diaryEntries.length,
      voiceJournals: params.voiceJournals.length,
      memories: params.memories.length,
      innerJournalEntries: params.innerEntries.length,
      innerReflections: params.innerReflections.length,
    },
    data: {
      personalDiary: params.diaryEntries,
      voiceJournals: params.voiceJournals,
      memories: params.memories,
      innerJournalEntries: params.innerEntries,
      innerReflections: params.innerReflections,
      innerPrivacyPrefs: params.innerPrivacyPrefs,
    },
  };

  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `unsaid-private-vault-${today}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface WipeVaultReport {
  totalDeleted: number;
  byCollection: {
    personalDiary: number;
    voiceJournals: number;
    memories: number;
    innerJournalEntries: number;
    innerReflections: number;
    innerPrivacyPrefs: number;
  };
}

async function deleteOwnedSubcollection(
  uid: string,
  subcollectionName: string
): Promise<number> {
  const path = `userAccounts/${uid}/${subcollectionName}`;
  try {
    const q = query(collection(db, path), where('userId', '==', uid));
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    let deleted = 0;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      const slice = docs.slice(i, i + 400);
      slice.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deleted += slice.length;
    }
    return deleted;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Permanently erases all private records owned by the user across all 6 owner-only Firestore subcollections
 * plus local browser caches and in-memory passphrase state.
 */
export async function permanentlyWipeUserVault(
  userId: string
): Promise<WipeVaultReport> {
  const uid = sanitizeId(userId);

  const [
    personalDiary,
    voiceJournals,
    memories,
    innerJournalEntries,
    innerReflections,
    innerPrivacyPrefs,
  ] = await Promise.all([
    deleteOwnedSubcollection(uid, 'personalDiary'),
    deleteOwnedSubcollection(uid, 'voiceJournals'),
    deleteOwnedSubcollection(uid, 'memories'),
    deleteOwnedSubcollection(uid, 'innerJournalEntries'),
    deleteOwnedSubcollection(uid, 'innerReflections'),
    deleteOwnedSubcollection(uid, 'innerPrivacyPrefs'),
  ]);

  clearActiveVaultPassphrase();
  try {
    localStorage.removeItem('tdg_free_garden_customisation_v1');
    localStorage.removeItem('tdg_local_stories_v1');
    localStorage.removeItem('tdg_local_messages_v1');
  } catch {
    // Ignore storage errors
  }

  return {
    totalDeleted:
      personalDiary +
      voiceJournals +
      memories +
      innerJournalEntries +
      innerReflections +
      innerPrivacyPrefs,
    byCollection: {
      personalDiary,
      voiceJournals,
      memories,
      innerJournalEntries,
      innerReflections,
      innerPrivacyPrefs,
    },
  };
}

/**
 * Retroactively encrypts all currently unencrypted Personal Diary, Inner Garden Journal,
 * and Inner Reflection documents in Firestore using client-side AES-256-GCM.
 */
export async function encryptExistingVaultEntries(
  userId: string,
  passphrase: string,
  rawDiaryEntries: DiaryEntry[],
  rawInnerEntries: InnerJournalEntry[],
  rawReflections: InnerReflectionMemory[]
): Promise<{ encryptedCount: number; skippedCount: number }> {
  const uid = sanitizeId(userId);
  let encryptedCount = 0;
  let skippedCount = 0;

  for (const d of rawDiaryEntries) {
    if (!d.content || isEncryptedPayload(d.content)) continue;
    const cipher = await encryptTextWithPassphrase(d.content, passphrase);
    if (cipher.length > 5000) {
      skippedCount += 1;
      continue;
    }
    const path = `userAccounts/${uid}/personalDiary/${d.entryId}`;
    try {
      await updateDoc(doc(db, 'userAccounts', uid, 'personalDiary', d.entryId), {
        content: cipher,
        updatedAt: serverTimestamp(),
      });
      encryptedCount += 1;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  for (const e of rawInnerEntries) {
    if (!e.transcript || isEncryptedPayload(e.transcript)) continue;
    const cipher = await encryptTextWithPassphrase(e.transcript, passphrase);
    if (cipher.length > 8000) {
      skippedCount += 1;
      continue;
    }
    const path = `userAccounts/${uid}/innerJournalEntries/${e.entryId}`;
    try {
      await updateDoc(
        doc(db, 'userAccounts', uid, 'innerJournalEntries', e.entryId),
        {
          transcript: cipher,
          updatedAt: serverTimestamp(),
        }
      );
      encryptedCount += 1;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  for (const r of rawReflections) {
    if (!r.reflectionText || isEncryptedPayload(r.reflectionText)) continue;
    const cipher = await encryptTextWithPassphrase(
      r.reflectionText,
      passphrase
    );
    if (cipher.length > 4000) {
      skippedCount += 1;
      continue;
    }
    const path = `userAccounts/${uid}/innerReflections/${r.reflectionId}`;
    try {
      await updateDoc(
        doc(db, 'userAccounts', uid, 'innerReflections', r.reflectionId),
        {
          reflectionText: cipher,
          updatedAt: serverTimestamp(),
        }
      );
      encryptedCount += 1;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  return { encryptedCount, skippedCount };
}

/**
 * Decrypts previously Zero-Knowledge encrypted entries back to standard Firestore AES-256 at-rest storage.
 */
export async function decryptExistingVaultEntries(
  userId: string,
  passphrase: string,
  rawDiaryEntries: DiaryEntry[],
  rawInnerEntries: InnerJournalEntry[],
  rawReflections: InnerReflectionMemory[]
): Promise<{ decryptedCount: number; failedCount: number }> {
  const uid = sanitizeId(userId);
  let decryptedCount = 0;
  let failedCount = 0;

  for (const d of rawDiaryEntries) {
    if (!isEncryptedPayload(d.content)) continue;
    try {
      const plain = await decryptTextWithPassphrase(d.content, passphrase);
      await updateDoc(doc(db, 'userAccounts', uid, 'personalDiary', d.entryId), {
        content: plain.slice(0, 5000),
        updatedAt: serverTimestamp(),
      });
      decryptedCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  for (const e of rawInnerEntries) {
    if (!isEncryptedPayload(e.transcript)) continue;
    try {
      const plain = await decryptTextWithPassphrase(e.transcript, passphrase);
      await updateDoc(
        doc(db, 'userAccounts', uid, 'innerJournalEntries', e.entryId),
        {
          transcript: plain.slice(0, 8000),
          updatedAt: serverTimestamp(),
        }
      );
      decryptedCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  for (const r of rawReflections) {
    if (!isEncryptedPayload(r.reflectionText)) continue;
    try {
      const plain = await decryptTextWithPassphrase(
        r.reflectionText,
        passphrase
      );
      await updateDoc(
        doc(db, 'userAccounts', uid, 'innerReflections', r.reflectionId),
        {
          reflectionText: plain.slice(0, 4000),
          updatedAt: serverTimestamp(),
        }
      );
      decryptedCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  return { decryptedCount, failedCount };
}

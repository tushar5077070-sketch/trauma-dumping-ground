import {
  collection,
  getDocs,
  query,
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

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return cleaned || `id_${Date.now()}`;
}

export interface VaultExportBundle {
  exportedAt: string;
  platform: 'Unsaid';
  accountEmail: string;
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
    privacyNotice:
      'Exported locally in your browser from your strictly owner-only Unsaid private space. Public anonymous flowers are not linked to your account and are never included.',
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
  anchor.download = `unsaid-private-data-${today}.json`;
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
 * plus local browser caches.
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

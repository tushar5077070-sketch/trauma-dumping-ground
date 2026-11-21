import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  InnerEmotionItem,
  InnerEntryKind,
  InnerJournalEntry,
  InnerPrivacyPrefs,
  InnerReflectionMemory,
  InnerStorageChoice,
} from '../types/garden';
import { getTodayIsoDate } from './secretGardenService';
import { maybeEncryptForStorage } from '../utils/vaultCrypto';

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return cleaned || `id_${Date.now()}`;
}

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === 'string' || typeof val === 'number') {
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function normalizeAudioDataUrl(rawUrl: string): string {
  if (!rawUrl || !rawUrl.trim()) return '';
  const commaIdx = rawUrl.indexOf(',');
  if (commaIdx === -1) return '';
  const header = rawUrl.slice(0, commaIdx);
  const base64 = rawUrl.slice(commaIdx + 1).replace(/\s+/g, '');
  if (!base64) return '';
  const cleanHeader = header.startsWith('data:audio/')
    ? header.replace(/\s+/g, '')
    : 'data:audio/webm;base64';
  if (!cleanHeader.endsWith(';base64')) {
    return `data:audio/webm;base64,${base64}`;
  }
  return `${cleanHeader},${base64}`;
}

function combineEmotions(labels: unknown, intensities: unknown): InnerEmotionItem[] {
  if (!Array.isArray(labels)) return [];
  const ints = Array.isArray(intensities) ? intensities : [];
  return labels.slice(0, 6).map((lbl, idx) => ({
    label: String(lbl || 'Reflective').slice(0, 40),
    intensity: Math.max(1, Math.min(100, Math.round(Number(ints[idx] ?? 55)))),
  }));
}

function splitEmotions(emotions: InnerEmotionItem[] | undefined): {
  emotionLabels: string[];
  emotionIntensities: number[];
} {
  const safe = Array.isArray(emotions) ? emotions.slice(0, 6) : [];
  return {
    emotionLabels: safe.map((e) => String(e.label || 'Reflective').slice(0, 40)),
    emotionIntensities: safe.map((e) =>
      Math.max(1, Math.min(100, Math.round(Number(e.intensity || 50))))
    ),
  };
}

// =========================================================================
// PRIVACY & CONSENT PREFERENCES (Owner-Only)
// =========================================================================

export function subscribeToInnerPrivacyPrefs(
  userId: string,
  onUpdate: (prefs: InnerPrivacyPrefs | null) => void,
  onError?: (err: Error) => void
): () => void {
  const uid = sanitizeId(userId);
  const path = `userAccounts/${uid}/innerPrivacyPrefs/settings`;
  return onSnapshot(
    doc(db, 'userAccounts', uid, 'innerPrivacyPrefs', 'settings'),
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      const d = snap.data();
      onUpdate({
        prefId: String(d.prefId || 'settings'),
        userId: String(d.userId || uid),
        allowAudioStorageConsent: Boolean(d.allowAudioStorageConsent),
        allowAiProcessingConsent: Boolean(d.allowAiProcessingConsent),
        consentAcknowledgedAt: String(d.consentAcknowledgedAt || ''),
        createdAt: toDate(d.createdAt),
        updatedAt: toDate(d.updatedAt),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export async function saveInnerPrivacyPrefs(
  userId: string,
  input: {
    allowAudioStorageConsent: boolean;
    allowAiProcessingConsent: boolean;
  }
): Promise<void> {
  const uid = sanitizeId(userId);
  const path = `userAccounts/${uid}/innerPrivacyPrefs/settings`;
  const docRef = doc(db, 'userAccounts', uid, 'innerPrivacyPrefs', 'settings');
  const nowIso = new Date().toISOString().slice(0, 32);

  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, {
        prefId: 'settings',
        userId: uid,
        allowAudioStorageConsent: Boolean(input.allowAudioStorageConsent),
        allowAiProcessingConsent: Boolean(input.allowAiProcessingConsent),
        consentAcknowledgedAt: nowIso,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(docRef, {
        allowAudioStorageConsent: Boolean(input.allowAudioStorageConsent),
        allowAiProcessingConsent: Boolean(input.allowAiProcessingConsent),
        consentAcknowledgedAt: nowIso,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// =========================================================================
// PRIVATE INNER JOURNAL ENTRIES (Voice + Text + Opt-in AI Metadata)
// =========================================================================

export function subscribeToInnerJournalEntries(
  userId: string,
  onUpdate: (entries: InnerJournalEntry[]) => void,
  onError?: (err: Error) => void
): () => void {
  const uid = sanitizeId(userId);
  const path = `userAccounts/${uid}/innerJournalEntries`;
  const q = query(collection(db, path), where('userId', '==', uid));

  return onSnapshot(
    q,
    (snap) => {
      const list: InnerJournalEntry[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          entryId: String(d.entryId || docSnap.id),
          userId: String(d.userId || uid),
          entryKind: (d.entryKind as InnerEntryKind) || 'text',
          storageChoice: (d.storageChoice as InnerStorageChoice) || 'transcript',
          title: String(d.title || ''),
          transcript: String(d.transcript || ''),
          durationSeconds: Number(d.durationSeconds || 0),
          mimeType: String(d.mimeType || ''),
          audioDataUrl: String(d.audioDataUrl || ''),
          recordedDate: String(d.recordedDate || ''),
          allowAiAnalysis: Boolean(d.allowAiAnalysis),
          aiSummary: String(d.aiSummary || ''),
          aiReflection: String(d.aiReflection || ''),
          primaryEmotion: String(d.primaryEmotion || ''),
          emotions: combineEmotions(d.emotionLabels, d.emotionIntensities),
          themes: Array.isArray(d.themes)
            ? d.themes.slice(0, 6).map((t) => String(t))
            : [],
          emotionConfidenceNote: String(d.emotionConfidenceNote || ''),
          createdAt: toDate(d.createdAt),
          updatedAt: toDate(d.updatedAt),
        });
      });
      list.sort((a, b) => {
        const dateCmp = (b.recordedDate || '').localeCompare(a.recordedDate || '');
        if (dateCmp !== 0) return dateCmp;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      onUpdate(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export interface CreateInnerEntryInput {
  entryKind: InnerEntryKind;
  storageChoice: InnerStorageChoice;
  title: string;
  transcript: string;
  durationSeconds?: number;
  mimeType?: string;
  audioDataUrl?: string;
  recordedDate?: string;
  allowAiAnalysis: boolean;
  aiSummary?: string;
  aiReflection?: string;
  primaryEmotion?: string;
  emotions?: InnerEmotionItem[];
  themes?: string[];
  emotionConfidenceNote?: string;
}

export async function createInnerJournalEntry(
  userId: string,
  input: CreateInnerEntryInput
): Promise<string> {
  const uid = sanitizeId(userId);
  const entryId = `inner_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const path = `userAccounts/${uid}/innerJournalEntries/${entryId}`;

  const cleanAudio =
    input.storageChoice === 'transcript'
      ? ''
      : normalizeAudioDataUrl(input.audioDataUrl || '');

  if (
    (input.storageChoice === 'audio' || input.storageChoice === 'both') &&
    !cleanAudio
  ) {
    throw new Error('Recorded audio data was empty. Try saving transcript only or re-recording.');
  }

  if (cleanAudio.length > 500000) {
    throw new Error(
      'Audio exceeds the ~500KB cloud storage limit. Choose "Transcript Only" or record a shorter clip.'
    );
  }

  const rawTranscript =
    input.storageChoice === 'audio' ? '' : (input.transcript || '').trim();

  if (input.storageChoice !== 'audio' && rawTranscript.length === 0 && !cleanAudio) {
    throw new Error('Please write or transcribe your journal thought before saving.');
  }

  const cleanTranscript = rawTranscript
    ? await maybeEncryptForStorage(rawTranscript, 8000)
    : '';

  const { emotionLabels, emotionIntensities } = splitEmotions(input.emotions);
  const clampedDuration = Math.max(
    0,
    Math.min(300, Math.round(Number(input.durationSeconds || 0)))
  );

  try {
    await setDoc(doc(db, 'userAccounts', uid, 'innerJournalEntries', entryId), {
      entryId,
      userId: uid,
      entryKind: input.entryKind,
      storageChoice: input.storageChoice,
      title: (input.title || '').trim().slice(0, 140),
      transcript: cleanTranscript,
      durationSeconds: cleanAudio ? clampedDuration : 0,
      mimeType: cleanAudio
        ? (input.mimeType || 'audio/webm').split(';')[0].trim().slice(0, 80)
        : '',
      audioDataUrl: cleanAudio,
      recordedDate: (input.recordedDate || getTodayIsoDate()).slice(0, 40),
      allowAiAnalysis: Boolean(input.allowAiAnalysis),
      aiSummary: (input.aiSummary || '').trim().slice(0, 1000),
      aiReflection: (input.aiReflection || '').trim().slice(0, 2500),
      primaryEmotion: (input.primaryEmotion || '').trim().slice(0, 50),
      emotionLabels,
      emotionIntensities,
      themes: (input.themes || []).slice(0, 6).map((t) => String(t).slice(0, 60)),
      emotionConfidenceNote: (input.emotionConfidenceNote || '').trim().slice(0, 300),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return entryId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateInnerJournalEntry(
  userId: string,
  entryId: string,
  updates: Partial<{
    entryKind: InnerEntryKind;
    storageChoice: InnerStorageChoice;
    title: string;
    transcript: string;
    durationSeconds: number;
    mimeType: string;
    audioDataUrl: string;
    recordedDate: string;
    allowAiAnalysis: boolean;
    aiSummary: string;
    aiReflection: string;
    primaryEmotion: string;
    emotions: InnerEmotionItem[];
    themes: string[];
    emotionConfidenceNote: string;
  }>
): Promise<void> {
  const uid = sanitizeId(userId);
  const cleanId = sanitizeId(entryId);
  const path = `userAccounts/${uid}/innerJournalEntries/${cleanId}`;
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.entryKind !== undefined) payload.entryKind = updates.entryKind;
  if (updates.storageChoice !== undefined)
    payload.storageChoice = updates.storageChoice;
  if (updates.title !== undefined)
    payload.title = updates.title.trim().slice(0, 140);
  if (updates.transcript !== undefined) {
    payload.transcript = updates.transcript.trim()
      ? await maybeEncryptForStorage(updates.transcript, 8000)
      : '';
  }
  if (updates.durationSeconds !== undefined)
    payload.durationSeconds = Math.max(
      0,
      Math.min(300, Math.round(updates.durationSeconds))
    );
  if (updates.mimeType !== undefined)
    payload.mimeType = updates.mimeType.trim().slice(0, 80);
  if (updates.audioDataUrl !== undefined)
    payload.audioDataUrl =
      updates.audioDataUrl === ''
        ? ''
        : normalizeAudioDataUrl(updates.audioDataUrl);
  if (updates.recordedDate !== undefined)
    payload.recordedDate = updates.recordedDate.slice(0, 40);
  if (updates.allowAiAnalysis !== undefined)
    payload.allowAiAnalysis = Boolean(updates.allowAiAnalysis);
  if (updates.aiSummary !== undefined)
    payload.aiSummary = updates.aiSummary.trim().slice(0, 1000);
  if (updates.aiReflection !== undefined)
    payload.aiReflection = updates.aiReflection.trim().slice(0, 2500);
  if (updates.primaryEmotion !== undefined)
    payload.primaryEmotion = updates.primaryEmotion.trim().slice(0, 50);
  if (updates.emotions !== undefined) {
    const split = splitEmotions(updates.emotions);
    payload.emotionLabels = split.emotionLabels;
    payload.emotionIntensities = split.emotionIntensities;
  }
  if (updates.themes !== undefined)
    payload.themes = updates.themes.slice(0, 6).map((t) => String(t).slice(0, 60));
  if (updates.emotionConfidenceNote !== undefined)
    payload.emotionConfidenceNote = updates.emotionConfidenceNote
      .trim()
      .slice(0, 300);

  try {
    await updateDoc(
      doc(db, 'userAccounts', uid, 'innerJournalEntries', cleanId),
      payload
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteInnerJournalEntry(
  userId: string,
  entryId: string
): Promise<void> {
  const uid = sanitizeId(userId);
  const cleanId = sanitizeId(entryId);
  const path = `userAccounts/${uid}/innerJournalEntries/${cleanId}`;
  try {
    await deleteDoc(
      doc(db, 'userAccounts', uid, 'innerJournalEntries', cleanId)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// =========================================================================
// WEEKLY & MONTHLY AI REFLECTION MEMORIES (Owner-Only)
// =========================================================================

export function subscribeToInnerReflections(
  userId: string,
  onUpdate: (items: InnerReflectionMemory[]) => void,
  onError?: (err: Error) => void
): () => void {
  const uid = sanitizeId(userId);
  const path = `userAccounts/${uid}/innerReflections`;
  const q = query(collection(db, path), where('userId', '==', uid));

  return onSnapshot(
    q,
    (snap) => {
      const list: InnerReflectionMemory[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          reflectionId: String(d.reflectionId || docSnap.id),
          userId: String(d.userId || uid),
          periodType: d.periodType === 'monthly' ? 'monthly' : 'weekly',
          periodLabel: String(d.periodLabel || ''),
          periodStart: String(d.periodStart || ''),
          periodEnd: String(d.periodEnd || ''),
          title: String(d.title || 'Garden Reflection'),
          reflectionText: String(d.reflectionText || ''),
          gentleTakeaway: String(d.gentleTakeaway || ''),
          recurringThemes: Array.isArray(d.recurringThemes)
            ? d.recurringThemes.slice(0, 8).map((t) => String(t))
            : [],
          sourceEntryIds: Array.isArray(d.sourceEntryIds)
            ? d.sourceEntryIds.slice(0, 50).map((id) => String(id))
            : [],
          entryCountAnalyzed: Number(d.entryCountAnalyzed || 0),
          createdAt: toDate(d.createdAt),
          updatedAt: toDate(d.updatedAt),
        });
      });
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      onUpdate(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export async function createInnerReflectionMemory(
  userId: string,
  input: {
    periodType: 'weekly' | 'monthly';
    periodLabel: string;
    periodStart: string;
    periodEnd: string;
    title: string;
    reflectionText: string;
    gentleTakeaway: string;
    recurringThemes: string[];
    sourceEntryIds: string[];
    entryCountAnalyzed: number;
  }
): Promise<string> {
  const uid = sanitizeId(userId);
  const reflectionId = `refl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const path = `userAccounts/${uid}/innerReflections/${reflectionId}`;

  const storedReflectionText = await maybeEncryptForStorage(
    input.reflectionText,
    4000
  );

  try {
    await setDoc(doc(db, 'userAccounts', uid, 'innerReflections', reflectionId), {
      reflectionId,
      userId: uid,
      periodType: input.periodType,
      periodLabel: input.periodLabel.trim().slice(0, 80) || 'Recent Days',
      periodStart: input.periodStart.slice(0, 40),
      periodEnd: input.periodEnd.slice(0, 40),
      title: input.title.trim().slice(0, 140) || 'Garden Reflection',
      reflectionText: storedReflectionText,
      gentleTakeaway: input.gentleTakeaway.trim().slice(0, 400),
      recurringThemes: input.recurringThemes
        .slice(0, 8)
        .map((t) => String(t).slice(0, 60)),
      sourceEntryIds: input.sourceEntryIds
        .slice(0, 50)
        .map((id) => String(id).slice(0, 64)),
      entryCountAnalyzed: Math.max(0, Math.min(500, Math.round(input.entryCountAnalyzed))),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return reflectionId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateInnerReflectionMemory(
  userId: string,
  reflectionId: string,
  updates: {
    title: string;
    reflectionText: string;
    gentleTakeaway: string;
  }
): Promise<void> {
  const uid = sanitizeId(userId);
  const cleanId = sanitizeId(reflectionId);
  const path = `userAccounts/${uid}/innerReflections/${cleanId}`;
  const storedReflectionText = await maybeEncryptForStorage(
    updates.reflectionText,
    4000
  );
  try {
    await updateDoc(doc(db, 'userAccounts', uid, 'innerReflections', cleanId), {
      title: updates.title.trim().slice(0, 140),
      reflectionText: storedReflectionText,
      gentleTakeaway: updates.gentleTakeaway.trim().slice(0, 400),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteInnerReflectionMemory(
  userId: string,
  reflectionId: string
): Promise<void> {
  const uid = sanitizeId(userId);
  const cleanId = sanitizeId(reflectionId);
  const path = `userAccounts/${uid}/innerReflections/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'userAccounts', uid, 'innerReflections', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

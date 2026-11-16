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
  DEFAULT_GARDEN_CUSTOMISATION,
  DiaryEntry,
  ExclusiveFloraPresetId,
  GardenBackgroundId,
  GardenCustomisationSettings,
  GardenEffectId,
  GardenThemeId,
  MemoryFolder,
  SavedMemory,
  SecretGardenBillingCycle,
  SecretGardenMembership,
  SecretGardenPaymentMode,
  SecretGardenPlanId,
  SecretGardenStatus,
  Story,
  SupportiveMessage,
  VoiceJournal,
} from '../types/garden';

const LOCAL_CUSTOMISATION_KEY = 'tdg_free_garden_customisation_v1';

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

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(baseDate: Date, days: number): string {
  const d = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function hasEffectiveSecretGardenAccess(
  membership: SecretGardenMembership | null,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  if (!membership) return false;
  if (membership.status === 'active') return true;
  if (membership.status === 'trialing') {
    if (!membership.trialEndsAt) return true;
    const ends = new Date(membership.trialEndsAt + 'T23:59:59Z').getTime();
    return isNaN(ends) || ends >= Date.now();
  }
  return false;
}

export function isTrialExpired(membership: SecretGardenMembership | null): boolean {
  if (!membership || membership.status !== 'trialing' || !membership.trialEndsAt) {
    return false;
  }
  const ends = new Date(membership.trialEndsAt + 'T23:59:59Z').getTime();
  return !isNaN(ends) && ends < Date.now();
}

export function loadLocalGardenCustomisation(): GardenCustomisationSettings {
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOMISATION_KEY);
    if (!raw) return DEFAULT_GARDEN_CUSTOMISATION;
    const parsed = JSON.parse(raw) as Partial<GardenCustomisationSettings>;
    return {
      gardenTheme: parsed.gardenTheme || 'meadow',
      gardenBackground: parsed.gardenBackground || 'classic_sky',
      gardenEffect: parsed.gardenEffect || 'breeze',
      exclusiveFloraPreset: parsed.exclusiveFloraPreset || 'classic',
    };
  } catch {
    return DEFAULT_GARDEN_CUSTOMISATION;
  }
}

export function saveLocalGardenCustomisation(
  settings: GardenCustomisationSettings
): void {
  try {
    localStorage.setItem(LOCAL_CUSTOMISATION_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

function mapMembershipDoc(
  userId: string,
  d: Record<string, unknown>
): SecretGardenMembership {
  return {
    userId: String(d.userId || userId),
    planId: (d.planId as SecretGardenPlanId) || 'free',
    status: (d.status as SecretGardenStatus) || 'free',
    hasUsedFreeTrial: Boolean(d.hasUsedFreeTrial),
    trialStartedAt: String(d.trialStartedAt || ''),
    trialEndsAt: String(d.trialEndsAt || ''),
    billingCycle: (d.billingCycle as SecretGardenBillingCycle) || 'none',
    priceInr: Number(d.priceInr ?? 0),
    startedAt: String(d.startedAt || ''),
    nextBillingAt: String(d.nextBillingAt || ''),
    autoRenew: Boolean(d.autoRenew),
    paymentMode: (d.paymentMode as SecretGardenPaymentMode) || 'none',
    gardenTheme: (d.gardenTheme as GardenThemeId) || 'meadow',
    gardenBackground:
      (d.gardenBackground as GardenBackgroundId) || 'classic_sky',
    gardenEffect: (d.gardenEffect as GardenEffectId) || 'breeze',
    exclusiveFloraPreset:
      (d.exclusiveFloraPreset as ExclusiveFloraPresetId) || 'classic',
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  };
}

export function subscribeToSecretGardenMembership(
  userId: string,
  onUpdate: (membership: SecretGardenMembership | null) => void,
  onError?: (err: Error) => void
): () => void {
  const uid = sanitizeId(userId);
  const path = `secretGardenMemberships/${uid}`;
  return onSnapshot(
    doc(db, 'secretGardenMemberships', uid),
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      onUpdate(mapMembershipDoc(uid, snap.data()));
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

export async function startSecretGardenFreeTrial(
  userId: string,
  chosenPlan: 'secret_garden_monthly' | 'secret_garden_annual'
): Promise<void> {
  const uid = sanitizeId(userId);
  const path = `secretGardenMemberships/${uid}`;
  const docRef = doc(db, 'secretGardenMemberships', uid);
  const today = getTodayIsoDate();
  const trialEnd = addDaysIso(new Date(), 30);

  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, {
        userId: uid,
        planId: chosenPlan,
        status: 'trialing',
        hasUsedFreeTrial: true,
        trialStartedAt: today,
        trialEndsAt: trialEnd,
        billingCycle: chosenPlan === 'secret_garden_annual' ? 'annual' : 'monthly',
        priceInr: 0,
        startedAt: today,
        nextBillingAt: trialEnd,
        autoRenew: false,
        paymentMode: 'trial_no_card',
        gardenTheme: 'meadow',
        gardenBackground: 'classic_sky',
        gardenEffect: 'breeze',
        exclusiveFloraPreset: 'classic',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existing = snap.data();
      if (existing?.hasUsedFreeTrial) {
        throw new Error('Your 30-day free trial has already been used.');
      }
      await updateDoc(docRef, {
        planId: chosenPlan,
        status: 'trialing',
        hasUsedFreeTrial: true,
        trialStartedAt: today,
        trialEndsAt: trialEnd,
        billingCycle: chosenPlan === 'secret_garden_annual' ? 'annual' : 'monthly',
        priceInr: 0,
        startedAt: today,
        nextBillingAt: trialEnd,
        autoRenew: false,
        paymentMode: 'trial_no_card',
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('already been used')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function activateDemoPaidSubscription(
  userId: string,
  chosenPlan: 'secret_garden_monthly' | 'secret_garden_annual',
  currentMembership: SecretGardenMembership | null
): Promise<void> {
  const uid = sanitizeId(userId);
  const path = `secretGardenMemberships/${uid}`;
  const docRef = doc(db, 'secretGardenMemberships', uid);
  const today = getTodayIsoDate();
  const days = chosenPlan === 'secret_garden_annual' ? 365 : 30;
  const nextDate = addDaysIso(new Date(), days);
  const priceInr = chosenPlan === 'secret_garden_annual' ? 799 : 99;
  const billingCycle: SecretGardenBillingCycle =
    chosenPlan === 'secret_garden_annual' ? 'annual' : 'monthly';

  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, {
        userId: uid,
        planId: chosenPlan,
        status: 'active',
        hasUsedFreeTrial: Boolean(currentMembership?.hasUsedFreeTrial),
        trialStartedAt: currentMembership?.trialStartedAt || '',
        trialEndsAt: currentMembership?.trialEndsAt || '',
        billingCycle,
        priceInr,
        startedAt: today,
        nextBillingAt: nextDate,
        autoRenew: false,
        paymentMode: 'demo_checkout',
        gardenTheme: 'meadow',
        gardenBackground: 'classic_sky',
        gardenEffect: 'breeze',
        exclusiveFloraPreset: 'classic',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existing = snap.data();
      await updateDoc(docRef, {
        planId: chosenPlan,
        status: 'active',
        hasUsedFreeTrial: Boolean(existing?.hasUsedFreeTrial),
        billingCycle,
        priceInr,
        startedAt: today,
        nextBillingAt: nextDate,
        autoRenew: false,
        paymentMode: 'demo_checkout',
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function cancelOrExpireMembership(
  userId: string,
  targetStatus: 'cancelled' | 'expired'
): Promise<void> {
  const uid = sanitizeId(userId);
  const path = `secretGardenMemberships/${uid}`;
  try {
    await updateDoc(doc(db, 'secretGardenMemberships', uid), {
      planId: 'free',
      status: targetStatus,
      priceInr: 0,
      billingCycle: 'none',
      nextBillingAt: '',
      autoRenew: false,
      gardenTheme: DEFAULT_GARDEN_CUSTOMISATION.gardenTheme,
      gardenBackground: DEFAULT_GARDEN_CUSTOMISATION.gardenBackground,
      gardenEffect: DEFAULT_GARDEN_CUSTOMISATION.gardenEffect,
      exclusiveFloraPreset: DEFAULT_GARDEN_CUSTOMISATION.exclusiveFloraPreset,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveGardenCustomisationForUser(
  userId: string,
  settings: GardenCustomisationSettings,
  hasPremiumAccess: boolean,
  currentMembership: SecretGardenMembership | null
): Promise<void> {
  const sanitizedSettings = hasPremiumAccess
    ? settings
    : DEFAULT_GARDEN_CUSTOMISATION;

  const uid = sanitizeId(userId);
  const path = `secretGardenMemberships/${uid}`;
  const docRef = doc(db, 'secretGardenMemberships', uid);

  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, {
        userId: uid,
        planId: hasPremiumAccess ? 'secret_garden_annual' : 'free',
        status: hasPremiumAccess ? 'active' : 'free',
        hasUsedFreeTrial: false,
        trialStartedAt: '',
        trialEndsAt: '',
        billingCycle: hasPremiumAccess ? 'annual' : 'none',
        priceInr: 0,
        startedAt: getTodayIsoDate(),
        nextBillingAt: '',
        autoRenew: false,
        paymentMode: hasPremiumAccess ? 'admin_assigned' : 'none',
        gardenTheme: sanitizedSettings.gardenTheme,
        gardenBackground: sanitizedSettings.gardenBackground,
        gardenEffect: sanitizedSettings.gardenEffect,
        exclusiveFloraPreset: sanitizedSettings.exclusiveFloraPreset,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingData = snap.data();
      const status = (existingData?.status as string) || 'free';
      const existingCanCustomise =
        status === 'trialing' || status === 'active';

      if (hasPremiumAccess && !existingCanCustomise) {
        await updateDoc(docRef, {
          planId: 'secret_garden_annual',
          status: 'active',
          billingCycle: 'annual',
          priceInr: 0,
          paymentMode: 'admin_assigned',
          gardenTheme: sanitizedSettings.gardenTheme,
          gardenBackground: sanitizedSettings.gardenBackground,
          gardenEffect: sanitizedSettings.gardenEffect,
          exclusiveFloraPreset: sanitizedSettings.exclusiveFloraPreset,
          updatedAt: serverTimestamp(),
        });
      } else {
        const toWrite = existingCanCustomise
          ? sanitizedSettings
          : DEFAULT_GARDEN_CUSTOMISATION;

        await updateDoc(docRef, {
          gardenTheme: toWrite.gardenTheme,
          gardenBackground: toWrite.gardenBackground,
          gardenEffect: toWrite.gardenEffect,
          exclusiveFloraPreset: toWrite.exclusiveFloraPreset,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// =========================================================================
// FEATURE 1: PERSONAL DIARY (Strictly Private Owner-Only Subcollection)
// =========================================================================

export function subscribeToPersonalDiary(
  userId: string,
  onUpdate: (entries: DiaryEntry[]) => void,
  onError?: (err: Error) => void
): () => void {
  const uid = sanitizeId(userId);
  const path = `userAccounts/${uid}/personalDiary`;
  const q = query(collection(db, path), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: DiaryEntry[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          entryId: String(d.entryId || docSnap.id),
          userId: String(d.userId || uid),
          title: String(d.title || ''),
          content: String(d.content || ''),
          moodTag: String(d.moodTag || 'Quiet'),
          entryDate: String(d.entryDate || ''),
          isMemorySaved: Boolean(d.isMemorySaved),
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

export async function createDiaryEntry(
  userId: string,
  input: {
    title: string;
    content: string;
    moodTag: string;
    entryDate: string;
  }
): Promise<string> {
  const uid = sanitizeId(userId);
  const entryId = `diary_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const path = `userAccounts/${uid}/personalDiary/${entryId}`;
  try {
    await setDoc(doc(db, 'userAccounts', uid, 'personalDiary', entryId), {
      entryId,
      userId: uid,
      title: input.title.trim().slice(0, 120),
      content: input.content.trim().slice(0, 5000),
      moodTag: input.moodTag.trim().slice(0, 40) || 'Quiet',
      entryDate: input.entryDate.trim().slice(0, 40) || getTodayIsoDate(),
      isMemorySaved: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return entryId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateDiaryEntry(
  userId: string,
  entryId: string,
  input: {
    title: string;
    content: string;
    moodTag: string;
    entryDate: string;
    isMemorySaved?: boolean;
  }
): Promise<void> {
  const uid = sanitizeId(userId);
  const cleanEntryId = sanitizeId(entryId);
  const path = `userAccounts/${uid}/personalDiary/${cleanEntryId}`;
  try {
    const payload: Record<string, unknown> = {
      title: input.title.trim().slice(0, 120),
      content: input.content.trim().slice(0, 5000),
      moodTag: input.moodTag.trim().slice(0, 40) || 'Quiet',
      entryDate: input.entryDate.trim().slice(0, 40) || getTodayIsoDate(),
      updatedAt: serverTimestamp(),
    };
    if (typeof input.isMemorySaved === 'boolean') {
      payload.isMemorySaved = input.isMemorySaved;
    }
    await updateDoc(
      doc(db, 'userAccounts', uid, 'personalDiary', cleanEntryId),
      payload
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteDiaryEntry(
  userId: string,
  entryId: string
): Promise<void> {
  const uid = sanitizeId(userId);
  const cleanEntryId = sanitizeId(entryId);
  const path = `userAccounts/${uid}/personalDiary/${cleanEntryId}`;
  try {
    await deleteDoc(doc(db, 'userAccounts', uid, 'personalDiary', cleanEntryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// =========================================================================
// FEATURE 2: VOICE JOURNALS (Strictly Private Owner-Only Subcollection)
// =========================================================================

export function subscribeToVoiceJournals(
  userId: string,
  onUpdate: (items: VoiceJournal[]) => void,
  onError?: (err: Error) => void
): () => void {
  const uid = sanitizeId(userId);
  const path = `userAccounts/${uid}/voiceJournals`;
  const q = query(collection(db, path), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: VoiceJournal[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          voiceId: String(d.voiceId || docSnap.id),
          userId: String(d.userId || uid),
          title: String(d.title || ''),
          durationSeconds: Number(d.durationSeconds || 1),
          mimeType: String(d.mimeType || 'audio/webm'),
          audioDataUrl: String(d.audioDataUrl || ''),
          recordedDate: String(d.recordedDate || ''),
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

function normalizeAudioDataUrl(rawUrl: string): string {
  const commaIdx = rawUrl.indexOf(',');
  if (commaIdx === -1) return rawUrl;
  const header = rawUrl.slice(0, commaIdx);
  const base64 = rawUrl.slice(commaIdx + 1).replace(/\s+/g, '');
  const cleanHeader = header.startsWith('data:audio/')
    ? header.replace(/\s+/g, '')
    : 'data:audio/webm;base64';
  if (!cleanHeader.endsWith(';base64')) {
    return `data:audio/webm;base64,${base64}`;
  }
  return `${cleanHeader},${base64}`;
}

export async function createVoiceJournal(
  userId: string,
  input: {
    title: string;
    durationSeconds: number;
    mimeType: string;
    audioDataUrl: string;
    recordedDate?: string;
  }
): Promise<string> {
  const uid = sanitizeId(userId);
  const voiceId = `voice_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const path = `userAccounts/${uid}/voiceJournals/${voiceId}`;
  const cleanUrl = normalizeAudioDataUrl(input.audioDataUrl);

  if (cleanUrl.length > 500000) {
    throw new Error(
      'Recording exceeds the ~500KB cloud voice-note limit. Please keep notes under 90 seconds or trim length.'
    );
  }

  const clampedDuration = Math.max(
    1,
    Math.min(300, Math.round(input.durationSeconds || 1))
  );
  const cleanMime = (input.mimeType || 'audio/webm').trim().slice(0, 80);

  try {
    await setDoc(doc(db, 'userAccounts', uid, 'voiceJournals', voiceId), {
      voiceId,
      userId: uid,
      title: input.title.trim().slice(0, 120),
      durationSeconds: clampedDuration,
      mimeType: cleanMime.length >= 5 ? cleanMime : 'audio/webm',
      audioDataUrl: cleanUrl,
      recordedDate: (input.recordedDate || getTodayIsoDate()).slice(0, 40),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return voiceId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateVoiceJournalTitle(
  userId: string,
  voiceId: string,
  title: string
): Promise<void> {
  const uid = sanitizeId(userId);
  const cleanId = sanitizeId(voiceId);
  const path = `userAccounts/${uid}/voiceJournals/${cleanId}`;
  try {
    await updateDoc(doc(db, 'userAccounts', uid, 'voiceJournals', cleanId), {
      title: title.trim().slice(0, 120),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteVoiceJournal(
  userId: string,
  voiceId: string
): Promise<void> {
  const uid = sanitizeId(userId);
  const cleanId = sanitizeId(voiceId);
  const path = `userAccounts/${uid}/voiceJournals/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'userAccounts', uid, 'voiceJournals', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// =========================================================================
// FEATURE 3: MY MEMORIES (Strictly Private Owner-Only Keepsake Subcollection)
// =========================================================================

export function subscribeToSavedMemories(
  userId: string,
  onUpdate: (items: SavedMemory[]) => void,
  onError?: (err: Error) => void
): () => void {
  const uid = sanitizeId(userId);
  const path = `userAccounts/${uid}/memories`;
  const q = query(collection(db, path), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: SavedMemory[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          memoryId: String(d.memoryId || docSnap.id),
          userId: String(d.userId || uid),
          sourceType:
            (d.sourceType as SavedMemory['sourceType']) || 'community_story',
          sourceId: String(d.sourceId || ''),
          anonymousLabel: String(d.anonymousLabel || 'Anonymous Soul'),
          title: String(d.title || ''),
          excerpt: String(d.excerpt || ''),
          flowerVariant: String(d.flowerVariant || 'pink-tulip'),
          folder: (d.folder as MemoryFolder) || 'Unsorted',
          personalNote: String(d.personalNote || ''),
          savedAt: toDate(d.savedAt),
        });
      });
      list.sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());
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

export async function saveCommunityStoryMemory(
  userId: string,
  story: Story,
  folder: MemoryFolder = 'Quiet Comfort',
  personalNote = ''
): Promise<string> {
  const uid = sanitizeId(userId);
  const cleanSourceId = sanitizeId(story.storyId);
  const memoryId = `mem_story_${cleanSourceId}`.slice(0, 64);
  const path = `userAccounts/${uid}/memories/${memoryId}`;

  const docRef = doc(db, 'userAccounts', uid, 'memories', memoryId);
  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      return memoryId;
    }
    await setDoc(docRef, {
      memoryId,
      userId: uid,
      sourceType: 'community_story',
      sourceId: cleanSourceId,
      anonymousLabel: (story.anonymousId || 'Anonymous Soul').slice(0, 60),
      title: `Flower planted by ${(story.anonymousId || 'Anonymous Soul').slice(0, 40)}`,
      excerpt: (story.content || 'A quiet story in the meadow.').slice(0, 2000),
      flowerVariant: (story.flowerVariant || 'pink-tulip').slice(0, 40),
      folder,
      personalNote: personalNote.trim().slice(0, 300),
      savedAt: serverTimestamp(),
    });
    return memoryId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function saveSupportiveReplyMemory(
  userId: string,
  message: SupportiveMessage,
  storyFlowerVariant: string,
  folder: MemoryFolder = 'Kind Words',
  personalNote = ''
): Promise<string> {
  const uid = sanitizeId(userId);
  const cleanSourceId = sanitizeId(message.messageId);
  const memoryId = `mem_msg_${cleanSourceId}`.slice(0, 64);
  const path = `userAccounts/${uid}/memories/${memoryId}`;

  const docRef = doc(db, 'userAccounts', uid, 'memories', memoryId);
  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      return memoryId;
    }
    await setDoc(docRef, {
      memoryId,
      userId: uid,
      sourceType: 'supportive_reply',
      sourceId: cleanSourceId,
      anonymousLabel: (message.anonymousId || 'Kind Gardener').slice(0, 60),
      title: `Kind note from ${(message.anonymousId || 'Kind Gardener').slice(0, 40)}`,
      excerpt: (message.content || '').slice(0, 2000),
      flowerVariant: (storyFlowerVariant || 'daisy').slice(0, 40),
      folder,
      personalNote: personalNote.trim().slice(0, 300),
      savedAt: serverTimestamp(),
    });
    return memoryId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function saveDiaryEntryAsMemory(
  userId: string,
  entry: DiaryEntry,
  folder: MemoryFolder = 'Personal Milestones',
  personalNote = ''
): Promise<string> {
  const uid = sanitizeId(userId);
  const cleanSourceId = sanitizeId(entry.entryId);
  const memoryId = `mem_diary_${cleanSourceId}`.slice(0, 64);
  const path = `userAccounts/${uid}/memories/${memoryId}`;

  const docRef = doc(db, 'userAccounts', uid, 'memories', memoryId);
  try {
    const existingSnap = await getDoc(docRef);
    if (!existingSnap.exists()) {
      await setDoc(docRef, {
        memoryId,
        userId: uid,
        sourceType: 'diary_entry',
        sourceId: cleanSourceId,
        anonymousLabel: 'My Private Diary',
        title: (entry.title || `Diary Reflection · ${entry.entryDate}`).slice(0, 140),
        excerpt: (entry.content || '').slice(0, 2000),
        flowerVariant: 'lavender',
        folder,
        personalNote: personalNote.trim().slice(0, 300),
        savedAt: serverTimestamp(),
      });
    }
    if (!entry.isMemorySaved) {
      await updateDoc(doc(db, 'userAccounts', uid, 'personalDiary', cleanSourceId), {
        isMemorySaved: true,
        updatedAt: serverTimestamp(),
      });
    }
    return memoryId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateSavedMemory(
  userId: string,
  memoryId: string,
  updates: {
    folder: MemoryFolder;
    personalNote: string;
    title: string;
  }
): Promise<void> {
  const uid = sanitizeId(userId);
  const cleanId = sanitizeId(memoryId);
  const path = `userAccounts/${uid}/memories/${cleanId}`;
  try {
    await updateDoc(doc(db, 'userAccounts', uid, 'memories', cleanId), {
      folder: updates.folder,
      personalNote: updates.personalNote.trim().slice(0, 300),
      title: updates.title.trim().slice(0, 140),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSavedMemory(
  userId: string,
  memoryId: string
): Promise<void> {
  const uid = sanitizeId(userId);
  const cleanId = sanitizeId(memoryId);
  const path = `userAccounts/${uid}/memories/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'userAccounts', uid, 'memories', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

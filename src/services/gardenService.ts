import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  AMBIENT_MEADOW_FLOWERS,
  AmbientMeadowFlower,
  FlowerVariant,
  ReactionType,
  SeedType,
  Story,
  SupportiveMessage,
} from '../types/garden';
import {
  checkPlantedStoryLocal,
  checkSupportiveReplyLocal,
  moderatePublicContent,
} from '../utils/contentModeration';

const LOCAL_FALLBACK_KEY = 'tdg_local_stories_v1';
const LAST_PLANT_TIMESTAMP_KEY = 'tdg_last_plant_ts';

// Launch-era prefix so pre-launch seeded/test documents are never displayed in the fresh launch meadow
export const LAUNCH_STORY_ID_PREFIX = 'bloom_';

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) {
    return val.toDate();
  }
  if (val instanceof Date) {
    return val;
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export function generateAnonymousSoulId(): string {
  const num = Math.floor(1000 + Math.random() * 8999);
  return `Anonymous Soul #${num}`;
}

export function generateKindGardenerId(): string {
  const num = Math.floor(100 + Math.random() * 899);
  return `Kind Gardener #${num}`;
}

export function pickFlowerVariantForSeed(seedType: SeedType): FlowerVariant {
  if (seedType === 'daisy') {
    const pool: FlowerVariant[] = ['daisy', 'pink-tulip', 'pink-tulip'];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  if (seedType === 'sunflower') {
    const pool: FlowerVariant[] = ['sunflower', 'yellow-tulip', 'orange-tulip'];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  const pool: FlowerVariant[] = ['lavender', 'purple-wildflower', 'pink-tulip'];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Subscribes strictly to real post-launch community stories planted in Firestore.
 * Pre-seeded demo stories and pre-launch test records are never seeded or displayed.
 */
export function subscribeToApprovedStories(
  onUpdate: (stories: Story[], isCloudConnected: boolean) => void
): () => void {
  // Clear any legacy local pre-launch demo stories cache
  try {
    localStorage.removeItem(LOCAL_FALLBACK_KEY);
  } catch {
    // Ignore storage errors
  }

  const q = query(
    collection(db, 'stories'),
    where('moderationStatus', '==', 'approved')
  );
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const loaded: Story[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const storyId = String(data.storyId || docSnap.id);

        // Only surface real stories planted after the fresh market launch reset
        if (!storyId.startsWith(LAUNCH_STORY_ID_PREFIX)) {
          return;
        }

        const content = String(data.content || '');
        if (!checkPlantedStoryLocal(content).allowed) {
          return;
        }

        loaded.push({
          storyId,
          anonymousId: String(data.anonymousId || 'Anonymous Soul #1048'),
          content,
          seedType: (data.seedType as SeedType) || 'daisy',
          flowerVariant:
            (data.flowerVariant as FlowerVariant) || 'pink-tulip',
          contentWarning: String(data.contentWarning || ''),
          moderationStatus: 'approved',
          warmthCount: Number(data.warmthCount ?? 0),
          messageCount: Number(data.messageCount ?? 0),
          positionX: Number(data.positionX ?? 50),
          positionY: Number(data.positionY ?? 50),
          scale: Number(data.scale ?? 1),
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        });
      });

      loaded.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      onUpdate(loaded, true);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'stories');
      } catch {
        onUpdate([], false);
      }
    }
  );

  return unsubscribe;
}

/**
 * Admin-only utility to physically delete pre-launch or legacy documents from `/stories` in Firestore.
 * Uses the admin delete permission already configured in firestore.rules.
 */
export async function purgeLegacyGardenStories(): Promise<{
  deletedCount: number;
}> {
  const path = 'stories';
  try {
    const snap = await getDocs(collection(db, path));
    const docsToDelete = snap.docs.filter(
      (d) => !d.id.startsWith(LAUNCH_STORY_ID_PREFIX)
    );
    if (docsToDelete.length === 0) {
      return { deletedCount: 0 };
    }

    let deletedCount = 0;
    for (let i = 0; i < docsToDelete.length; i += 400) {
      const batch = writeBatch(db);
      const slice = docsToDelete.slice(i, i + 400);
      slice.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deletedCount += slice.length;
    }
    return { deletedCount };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface PlantStoryInput {
  content: string;
  seedType: SeedType;
  contentWarning?: string;
  anonymousId?: string;
  existingStories: Story[];
  targetFlower?: AmbientMeadowFlower | null;
}

export async function plantNewStory(input: PlantStoryInput): Promise<Story> {
  if (!auth.currentUser) {
    throw new Error(
      'Please sign in with Google before planting a seed in the meadow.'
    );
  }

  // Rate limiting check (minimum 6 seconds between plantings)
  const lastTs = Number(localStorage.getItem(LAST_PLANT_TIMESTAMP_KEY) || 0);
  if (Date.now() - lastTs < 6000) {
    throw new Error('Please take a gentle breath before planting another seed.');
  }

  // Strict sanitization & blueprint validation
  const trimmedContent = input.content.trim().slice(0, 2000);
  if (trimmedContent.length < 5) {
    throw new Error(
      'Please write at least a few words (minimum 5 characters) to plant your seed.'
    );
  }

  // Deterministic + Gemini AI moderation check
  const moderation = await moderatePublicContent({
    text: trimmedContent,
    contentType: 'story',
  });
  if (!moderation.allowed) {
    throw new Error(
      moderation.reason ||
        'This story contains harmful or abusive language and cannot be planted.'
    );
  }

  const cleanWarning = (input.contentWarning || '').trim().slice(0, 120);
  const storyId = `${LAUNCH_STORY_ID_PREFIX}${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 8)}`;
  const anonymousId =
    input.anonymousId && /^Anonymous Soul #[0-9]{3,6}$/.test(input.anonymousId)
      ? input.anonymousId
      : generateAnonymousSoulId();

  // If user clicked a specific empty meadow flower, bloom right on that flower's spot;
  // otherwise claim an unoccupied ambient flower slot first before picking a fresh coordinate.
  const chosenSlot =
    input.targetFlower || findAvailableAmbientSlot(input.existingStories);

  const flowerVariant =
    chosenSlot && chosenSlot.seedType === input.seedType
      ? chosenSlot.flowerVariant
      : pickFlowerVariantForSeed(input.seedType);

  const { positionX, positionY, scale } = chosenSlot
    ? {
        positionX: chosenSlot.positionX,
        positionY: chosenSlot.positionY,
        scale: chosenSlot.scale,
      }
    : findHarmoniousPosition(input.existingStories);

  const newStory: Story = {
    storyId,
    anonymousId,
    content: trimmedContent,
    seedType: input.seedType,
    flowerVariant,
    contentWarning: cleanWarning,
    moderationStatus: 'approved',
    warmthCount: 0,
    messageCount: 0,
    positionX,
    positionY,
    scale,
    createdAt: new Date(),
    updatedAt: new Date(),
    isNewlyPlanted: true,
  };

  const docPath = `stories/${storyId}`;
  try {
    await setDoc(doc(db, 'stories', storyId), {
      storyId: newStory.storyId,
      anonymousId: newStory.anonymousId,
      content: newStory.content,
      seedType: newStory.seedType,
      flowerVariant: newStory.flowerVariant,
      contentWarning: newStory.contentWarning,
      moderationStatus: 'approved',
      warmthCount: 0,
      messageCount: 0,
      positionX: newStory.positionX,
      positionY: newStory.positionY,
      scale: newStory.scale,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    localStorage.setItem(LAST_PLANT_TIMESTAMP_KEY, String(Date.now()));
    return newStory;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

function findAvailableAmbientSlot(
  existing: Story[]
): AmbientMeadowFlower | null {
  const freeSlots = AMBIENT_MEADOW_FLOWERS.filter((slot) =>
    existing.every((s) => {
      const dx = s.positionX - slot.positionX;
      const dy = s.positionY - slot.positionY;
      return Math.sqrt(dx * dx + dy * dy) > 3.5;
    })
  );
  if (freeSlots.length === 0) return null;
  return freeSlots[Math.floor(Math.random() * freeSlots.length)];
}

function findHarmoniousPosition(existing: Story[]): {
  positionX: number;
  positionY: number;
  scale: number;
} {
  let bestX = 50;
  let bestY = 48;
  let maxMinDist = -1;

  for (let attempt = 0; attempt < 24; attempt++) {
    const candidateX = Number((6 + Math.random() * 88).toFixed(2));
    const candidateY = Number((12 + Math.random() * 70).toFixed(2));

    let minDist = 9999;
    for (const s of existing) {
      const dx = s.positionX - candidateX;
      const dy = s.positionY - candidateY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) minDist = dist;
    }

    if (minDist > maxMinDist) {
      maxMinDist = minDist;
      bestX = candidateX;
      bestY = candidateY;
    }
  }

  // Scale naturally increases closer to the foreground (lower positionY = closer to viewer)
  const depthFactor = 1 - (bestY - 12) / 76;
  const computedScale = Number(
    Math.max(0.78, Math.min(1.3, 0.8 + depthFactor * 0.48)).toFixed(2)
  );

  return { positionX: bestX, positionY: bestY, scale: computedScale };
}

export async function sendWarmthReaction(
  story: Story,
  reactionType: ReactionType = 'warmth'
): Promise<void> {
  const reactionId = `rx_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  const storyRef = doc(db, 'stories', story.storyId);
  const reactionRef = doc(db, 'stories', story.storyId, 'reactions', reactionId);

  try {
    const batch = writeBatch(db);
    batch.set(reactionRef, {
      reactionId,
      storyId: story.storyId,
      reactionType,
      createdAt: serverTimestamp(),
    });
    batch.update(storyRef, {
      warmthCount: story.warmthCount + 1,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `stories/${story.storyId}/reactions/${reactionId}`
    );
  }
}

export async function leaveSupportiveMessage(
  story: Story,
  content: string
): Promise<SupportiveMessage> {
  const cleanContent = content.trim().slice(0, 500);
  if (cleanContent.length < 2) {
    throw new Error('Please write a kind message of at least 2 characters.');
  }

  // Enforce both instant deterministic safety filter AND server-side Gemini AI kindness moderation
  const moderation = await moderatePublicContent({
    text: cleanContent,
    contentType: 'supportive_message',
    storyContext: story.content,
  });

  if (!moderation.allowed) {
    throw new Error(
      moderation.reason ||
        'Unsaid only allows gentle, supportive replies. Hurtful or judgmental words cannot be sent.'
    );
  }

  const messageId = `msg_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  const anonymousId = generateKindGardenerId();

  const storyRef = doc(db, 'stories', story.storyId);
  const messageRef = doc(db, 'stories', story.storyId, 'messages', messageId);

  try {
    const batch = writeBatch(db);
    batch.set(messageRef, {
      messageId,
      storyId: story.storyId,
      anonymousId,
      content: cleanContent,
      moderationStatus: 'approved',
      createdAt: serverTimestamp(),
    });
    batch.update(storyRef, {
      messageCount: story.messageCount + 1,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();

    return {
      messageId,
      storyId: story.storyId,
      anonymousId,
      content: cleanContent,
      moderationStatus: 'approved',
      createdAt: new Date(),
    };
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `stories/${story.storyId}/messages/${messageId}`
    );
  }
}

export function subscribeToStoryMessages(
  storyId: string,
  onUpdate: (messages: SupportiveMessage[]) => void
): () => void {
  const cleanStoryId = storyId.trim();
  if (!cleanStoryId || !/^[a-zA-Z0-9_-]{1,64}$/.test(cleanStoryId)) {
    onUpdate([]);
    return () => {};
  }

  const path = `stories/${cleanStoryId}/messages`;
  const q = query(
    collection(db, 'stories', cleanStoryId, 'messages'),
    where('moderationStatus', '==', 'approved')
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const list: SupportiveMessage[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const msgContent = String(d.content || '');
        if (!checkSupportiveReplyLocal(msgContent).allowed) {
          return;
        }
        list.push({
          messageId: String(d.messageId || docSnap.id),
          storyId: String(d.storyId || cleanStoryId),
          anonymousId: String(d.anonymousId || 'Kind Gardener #402'),
          content: msgContent,
          moderationStatus: 'approved',
          createdAt: toDate(d.createdAt),
        });
      });

      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      onUpdate(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch {
        onUpdate([]);
      }
    }
  );

  return unsubscribe;
}

export async function reportStoryContent(
  storyId: string,
  reason: 'self-harm' | 'harassment' | 'spam' | 'pii' | 'other',
  details: string
): Promise<void> {
  const reportId = `rep_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  const cleanDetails = details.trim().slice(0, 500);
  const path = `reports/${reportId}`;

  try {
    await setDoc(doc(db, 'reports', reportId), {
      reportId,
      targetType: 'story',
      targetId: storyId,
      storyId,
      reason,
      details: cleanDetails,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

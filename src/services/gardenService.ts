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
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  FlowerVariant,
  INITIAL_GARDEN_STORIES,
  INITIAL_SUPPORTIVE_MESSAGES,
  ReactionType,
  SeedType,
  Story,
  SupportiveMessage,
} from '../types/garden';

const LOCAL_FALLBACK_KEY = 'tdg_local_stories_v1';
const LOCAL_MESSAGES_KEY = 'tdg_local_messages_v1';
const LAST_PLANT_TIMESTAMP_KEY = 'tdg_last_plant_ts';

let isSeedingInProgress = false;

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

export async function ensureInitialStoriesSeeded(): Promise<void> {
  if (isSeedingInProgress) return;
  isSeedingInProgress = true;
  const path = 'stories';
  try {
    const q = query(collection(db, path), where('moderationStatus', '==', 'approved'));
    const snap = await getDocs(q);
    const existingIds = new Set(snap.docs.map((d) => d.id));
    const missingStories = INITIAL_GARDEN_STORIES.filter(
      (item) => !existingIds.has(item.storyId)
    );

    if (missingStories.length === 0) {
      return;
    }

    const batch = writeBatch(db);
    for (const item of missingStories) {
      const storyRef = doc(db, 'stories', item.storyId);
      batch.set(storyRef, {
        storyId: item.storyId,
        anonymousId: item.anonymousId,
        content: item.content,
        seedType: item.seedType,
        flowerVariant: item.flowerVariant,
        contentWarning: item.contentWarning,
        moderationStatus: 'approved',
        warmthCount: item.warmthCount,
        messageCount: item.messageCount,
        positionX: item.positionX,
        positionY: item.positionY,
        scale: item.scale,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    console.warn('Initial seeding skipped or handled locally:', error);
  } finally {
    isSeedingInProgress = false;
  }
}

export function subscribeToApprovedStories(
  onUpdate: (stories: Story[], isCloudConnected: boolean) => void
): () => void {
  ensureInitialStoriesSeeded();

  const q = query(collection(db, 'stories'), where('moderationStatus', '==', 'approved'));
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const loaded: Story[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loaded.push({
          storyId: String(data.storyId || docSnap.id),
          anonymousId: String(data.anonymousId || 'Anonymous Soul #1048'),
          content: String(data.content || ''),
          seedType: (data.seedType as SeedType) || 'daisy',
          flowerVariant: (data.flowerVariant as FlowerVariant) || 'pink-tulip',
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

      if (loaded.length > 0) {
        loaded.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        onUpdate(loaded, true);
      } else {
        // While initial seed batch is committing, provide immediate meadow stories
        const fallback = INITIAL_GARDEN_STORIES.map((s, idx) => ({
          ...s,
          createdAt: new Date(Date.now() - (idx + 1) * 3600 * 1000 * 5),
          updatedAt: new Date(Date.now() - (idx + 1) * 3600 * 1000 * 5),
        }));
        onUpdate(fallback, true);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'stories');
      } catch {
        // Fallback to local stories if offline/quota hit
        const fallback = getLocalFallbackStories();
        onUpdate(fallback, false);
      }
    }
  );

  return unsubscribe;
}

function getLocalFallbackStories(): Story[] {
  try {
    const raw = localStorage.getItem(LOCAL_FALLBACK_KEY);
    const custom: Story[] = raw ? JSON.parse(raw) : [];
    const base = INITIAL_GARDEN_STORIES.map((s, idx) => ({
      ...s,
      createdAt: new Date(Date.now() - (idx + 1) * 3600 * 1000 * 6),
      updatedAt: new Date(Date.now() - (idx + 1) * 3600 * 1000 * 6),
    }));
    return [
      ...custom.map((c) => ({
        ...c,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      })),
      ...base,
    ];
  } catch {
    return INITIAL_GARDEN_STORIES.map((s) => ({
      ...s,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }
}

export interface PlantStoryInput {
  content: string;
  seedType: SeedType;
  contentWarning?: string;
  anonymousId?: string;
  existingStories: Story[];
}

export async function plantNewStory(input: PlantStoryInput): Promise<Story> {
  // Rate limiting check (minimum 6 seconds between plantings)
  const lastTs = Number(localStorage.getItem(LAST_PLANT_TIMESTAMP_KEY) || 0);
  if (Date.now() - lastTs < 6000) {
    throw new Error('Please take a gentle breath before planting another seed.');
  }

  // Strict sanitization & blueprint validation
  const trimmedContent = input.content.trim().slice(0, 2000);
  if (trimmedContent.length < 5) {
    throw new Error('Please write at least a few words (minimum 5 characters) to plant your seed.');
  }

  const cleanWarning = (input.contentWarning || '').trim().slice(0, 120);
  const storyId = `story_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const anonymousId =
    input.anonymousId && /^Anonymous Soul #[0-9]{3,6}$/.test(input.anonymousId)
      ? input.anonymousId
      : generateAnonymousSoulId();
  const flowerVariant = pickFlowerVariantForSeed(input.seedType);

  // Pick a balanced meadow coordinate that avoids overlapping existing flowers
  const { positionX, positionY, scale } = findHarmoniousPosition(input.existingStories);

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
  const reactionId = `rx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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
        list.push({
          messageId: String(d.messageId || docSnap.id),
          storyId: String(d.storyId || cleanStoryId),
          anonymousId: String(d.anonymousId || 'Kind Gardener #402'),
          content: String(d.content || ''),
          moderationStatus: 'approved',
          createdAt: toDate(d.createdAt),
        });
      });

      // Merge any pre-seeded initial supportive messages for initial stories
      const preset = INITIAL_SUPPORTIVE_MESSAGES[cleanStoryId] || [];
      for (const p of preset) {
        if (!list.some((m) => m.messageId === p.messageId)) {
          list.push({
            ...p,
            createdAt: new Date(Date.now() - 3600 * 1000 * 3),
          });
        }
      }

      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      onUpdate(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch {
        const raw = localStorage.getItem(LOCAL_MESSAGES_KEY);
        const allLocal: Record<string, SupportiveMessage[]> = raw ? JSON.parse(raw) : {};
        const preset = (INITIAL_SUPPORTIVE_MESSAGES[cleanStoryId] || []).map((p) => ({
          ...p,
          createdAt: new Date(Date.now() - 3600 * 1000 * 3),
        }));
        onUpdate(allLocal[cleanStoryId] || preset);
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
  const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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

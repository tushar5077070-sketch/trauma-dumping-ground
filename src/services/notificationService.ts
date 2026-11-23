import {
  collection,
  doc,
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
  KindMessageNotification,
  NotificationReadState,
  PlantedStoryReceipt,
  Story,
} from '../types/garden';
import { checkSupportiveReplyLocal } from '../utils/contentModeration';

const NOTIFICATION_STATE_DOC_ID = 'inbox';
const MAX_STORED_READ_IDS = 180;
const MAX_WATCHED_STORIES = 25;

function localStorageKey(userId: string): string {
  return `unsaid_notif_read_state_v1_${userId}`;
}

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

export function loadLocalNotificationReadState(
  userId: string
): NotificationReadState {
  try {
    const raw = localStorage.getItem(localStorageKey(userId));
    if (!raw) {
      return { lastReadAtMs: 0, readMessageIds: [], existsInCloud: false };
    }
    const parsed = JSON.parse(raw) as {
      lastReadAtMs?: unknown;
      readMessageIds?: unknown;
    };
    return {
      lastReadAtMs:
        typeof parsed.lastReadAtMs === 'number' && parsed.lastReadAtMs >= 0
          ? Math.floor(parsed.lastReadAtMs)
          : 0,
      readMessageIds: Array.isArray(parsed.readMessageIds)
        ? parsed.readMessageIds
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
            .slice(0, MAX_STORED_READ_IDS)
        : [],
      existsInCloud: false,
    };
  } catch {
    return { lastReadAtMs: 0, readMessageIds: [], existsInCloud: false };
  }
}

function saveLocalNotificationReadState(
  userId: string,
  state: NotificationReadState
): void {
  try {
    localStorage.setItem(
      localStorageKey(userId),
      JSON.stringify({
        lastReadAtMs: state.lastReadAtMs,
        readMessageIds: state.readMessageIds.slice(0, MAX_STORED_READ_IDS),
      })
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function isNotificationRead(
  notif: KindMessageNotification,
  readState: NotificationReadState
): boolean {
  if (readState.readMessageIds.includes(notif.messageId)) {
    return true;
  }
  if (
    readState.lastReadAtMs > 0 &&
    notif.createdAt.getTime() <= readState.lastReadAtMs
  ) {
    return true;
  }
  return false;
}

/**
 * Subscribes to the signed-in user's private notification read/seen state in Firestore,
 * merging cleanly with any localStorage cache so read status stays in sync across devices.
 */
export function subscribeToNotificationReadState(
  userId: string,
  onUpdate: (state: NotificationReadState) => void
): () => void {
  const cleanUid = userId.trim();
  if (!cleanUid || !/^[a-zA-Z0-9_-]{1,64}$/.test(cleanUid)) {
    onUpdate({ lastReadAtMs: 0, readMessageIds: [], existsInCloud: false });
    return () => {};
  }

  const localInitial = loadLocalNotificationReadState(cleanUid);
  onUpdate(localInitial);

  const path = `userAccounts/${cleanUid}/notificationState/${NOTIFICATION_STATE_DOC_ID}`;
  const docRef = doc(
    db,
    'userAccounts',
    cleanUid,
    'notificationState',
    NOTIFICATION_STATE_DOC_ID
  );

  return onSnapshot(
    docRef,
    (snap) => {
      const localCached = loadLocalNotificationReadState(cleanUid);
      if (!snap.exists()) {
        onUpdate({ ...localCached, existsInCloud: false });
        return;
      }

      const d = snap.data();
      const cloudLastRead =
        typeof d.lastReadAtMs === 'number' && d.lastReadAtMs >= 0
          ? Math.floor(d.lastReadAtMs)
          : 0;
      const cloudReadIds = Array.isArray(d.readMessageIds)
        ? d.readMessageIds.filter(
            (id): id is string => typeof id === 'string' && id.length > 0
          )
        : [];

      const mergedIds = Array.from(
        new Set([...cloudReadIds, ...localCached.readMessageIds])
      ).slice(0, MAX_STORED_READ_IDS);

      const merged: NotificationReadState = {
        lastReadAtMs: Math.max(cloudLastRead, localCached.lastReadAtMs),
        readMessageIds: mergedIds,
        existsInCloud: true,
      };
      saveLocalNotificationReadState(cleanUid, merged);
      onUpdate(merged);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch {
        // Keep local fallback working smoothly
      }
    }
  );
}

/**
 * Persists updated notification read state both locally (instant UI feedback)
 * and to `/userAccounts/{uid}/notificationState/inbox` in Firestore (cross-device sync).
 */
export async function persistNotificationReadState(
  userId: string,
  nextState: NotificationReadState
): Promise<NotificationReadState> {
  const cleanUid = userId.trim();
  const boundedIds = Array.from(
    new Set(
      nextState.readMessageIds.filter(
        (id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id)
      )
    )
  ).slice(0, MAX_STORED_READ_IDS);

  const boundedLastRead = Math.max(
    0,
    Math.min(9000000000000, Math.floor(nextState.lastReadAtMs))
  );

  const normalized: NotificationReadState = {
    lastReadAtMs: boundedLastRead,
    readMessageIds: boundedIds,
    existsInCloud: nextState.existsInCloud,
  };

  saveLocalNotificationReadState(cleanUid, normalized);

  if (!cleanUid || !/^[a-zA-Z0-9_-]{1,64}$/.test(cleanUid)) {
    return normalized;
  }

  const docRef = doc(
    db,
    'userAccounts',
    cleanUid,
    'notificationState',
    NOTIFICATION_STATE_DOC_ID
  );

  try {
    if (nextState.existsInCloud) {
      await updateDoc(docRef, {
        lastReadAtMs: boundedLastRead,
        readMessageIds: boundedIds,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        stateId: NOTIFICATION_STATE_DOC_ID,
        userId: cleanUid,
        lastReadAtMs: boundedLastRead,
        readMessageIds: boundedIds,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return { ...normalized, existsInCloud: true };
  } catch {
    // Fallback to create if update hit not-found race, or keep local persistence silently
    try {
      await setDoc(docRef, {
        stateId: NOTIFICATION_STATE_DOC_ID,
        userId: cleanUid,
        lastReadAtMs: boundedLastRead,
        readMessageIds: boundedIds,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { ...normalized, existsInCloud: true };
    } catch {
      return normalized;
    }
  }
}

/**
 * Subscribes in real time to approved kind messages left on ALL stories planted by
 * the currently signed-in user (derived privately from `/userAccounts/{uid}/plantedStories`).
 * Public stories remain 100% anonymous — no user identity is ever stored on stories or messages.
 */
export function subscribeToOwnStoryKindMessages(
  ownPlantedStories: PlantedStoryReceipt[],
  liveStories: Story[],
  onUpdate: (
    notifications: KindMessageNotification[],
    initialLoadComplete: boolean
  ) => void
): () => void {
  const receiptsToWatch = ownPlantedStories.slice(0, MAX_WATCHED_STORIES);

  if (receiptsToWatch.length === 0) {
    onUpdate([], true);
    return () => {};
  }

  const liveStoryMap = new Map<string, Story>();
  for (const s of liveStories) {
    liveStoryMap.set(s.storyId, s);
  }

  const messagesByStory = new Map<string, KindMessageNotification[]>();
  const initializedStories = new Set<string>();
  const unsubscribers: Array<() => void> = [];

  const emitMerged = () => {
    const merged: KindMessageNotification[] = [];
    for (const list of messagesByStory.values()) {
      merged.push(...list);
    }
    merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const allReady = initializedStories.size >= receiptsToWatch.length;
    onUpdate(merged, allReady);
  };

  for (const receipt of receiptsToWatch) {
    const cleanStoryId = receipt.storyId.trim();
    if (!cleanStoryId || !/^[a-zA-Z0-9_-]{1,64}$/.test(cleanStoryId)) {
      initializedStories.add(receipt.storyId);
      continue;
    }

    const q = query(
      collection(db, 'stories', cleanStoryId, 'messages'),
      where('moderationStatus', '==', 'approved')
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const liveStory = liveStoryMap.get(cleanStoryId);
        const storyPreview = (
          liveStory?.content ||
          receipt.preview ||
          'Your planted flower'
        ).slice(0, 140);

        const list: KindMessageNotification[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const msgContent = String(d.content || '').trim();
          if (!msgContent || !checkSupportiveReplyLocal(msgContent).allowed) {
            return;
          }
          list.push({
            messageId: String(d.messageId || docSnap.id),
            storyId: cleanStoryId,
            storyPreview,
            seedType: liveStory?.seedType || receipt.seedType,
            flowerVariant: liveStory?.flowerVariant || receipt.flowerVariant,
            messageContent: msgContent,
            createdAt: toDate(d.createdAt),
          });
        });

        messagesByStory.set(cleanStoryId, list);
        initializedStories.add(cleanStoryId);
        emitMerged();
      },
      () => {
        // If a story was deleted or inaccessible, mark initialized so other notifications stay responsive
        messagesByStory.delete(cleanStoryId);
        initializedStories.add(cleanStoryId);
        emitMerged();
      }
    );

    unsubscribers.push(unsub);
  }

  if (unsubscribers.length === 0) {
    onUpdate([], true);
  }

  return () => {
    for (const unsub of unsubscribers) {
      unsub();
    }
  };
}

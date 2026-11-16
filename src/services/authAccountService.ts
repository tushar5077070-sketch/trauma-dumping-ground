import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  LoginEvent,
  ModerationReportRecord,
  SubscriptionBillingCycle,
  SubscriptionCurrency,
  SubscriptionPlanTier,
  SubscriptionRecord,
  SubscriptionStatus,
  UserAccount,
} from '../types/garden';

export const ADMIN_EMAIL = 'tushar5077070@gmail.com';

export function isVerifiedAdminUser(user: User | null): boolean {
  if (!user || !user.email) return false;
  return (
    user.emailVerified === true &&
    user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );
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

export function getUserAgentSummary(): string {
  if (typeof navigator === 'undefined') return 'Unknown Browser';
  const ua = navigator.userAgent || '';
  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';

  let os = 'Device';
  if (/iPhone/i.test(ua)) os = 'iPhone';
  else if (/iPad/i.test(ua)) os = 'iPad';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return `${browser} on ${os}`.slice(0, 160);
}

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return cleaned || `id_${Date.now()}`;
}

export function subscribeToAuthState(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogleAndRecord(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  await recordUserLogin(result.user);
  return result.user;
}

export async function ensureUserAccountSynced(user: User): Promise<void> {
  const uid = sanitizeId(user.uid);
  const userRef = doc(db, 'userAccounts', uid);
  const path = `userAccounts/${uid}`;
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await recordUserLogin(user);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function recordUserLogin(user: User): Promise<void> {
  const uid = sanitizeId(user.uid);
  const email = (user.email || 'visitor@garden.local').trim().slice(0, 120);
  const displayName = (user.displayName || 'Garden Visitor')
    .trim()
    .slice(0, 100);
  const photoURL = (user.photoURL || '').trim().slice(0, 500);
  const providerId = (user.providerData?.[0]?.providerId || 'google.com')
    .trim()
    .slice(0, 40);
  const userAgentSummary = getUserAgentSummary();

  const userRef = doc(db, 'userAccounts', uid);
  const eventId = `login_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const eventRef = doc(db, 'loginEvents', eventId);

  try {
    const existingSnap = await getDoc(userRef);
    const batch = writeBatch(db);

    if (!existingSnap.exists()) {
      batch.set(userRef, {
        uid,
        email,
        displayName,
        photoURL,
        providerId,
        role: 'member',
        userAgentSummary,
        loginCount: 1,
        lastLoginAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const prevData = existingSnap.data();
      const prevCount = Math.max(1, Number(prevData?.loginCount || 1));
      batch.update(userRef, {
        email,
        displayName,
        photoURL,
        providerId,
        userAgentSummary,
        loginCount: Math.min(1000000, prevCount + 1),
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    batch.set(eventRef, {
      eventId,
      uid,
      email,
      displayName,
      photoURL,
      providerId,
      userAgentSummary,
      loggedInAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `userAccounts/${uid}`);
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeToOwnUserAccount(
  userId: string,
  onUpdate: (account: UserAccount | null) => void,
  onError?: (err: Error) => void
): () => void {
  const uid = sanitizeId(userId);
  const path = `userAccounts/${uid}`;
  return onSnapshot(
    doc(db, 'userAccounts', uid),
    (docSnap) => {
      if (!docSnap.exists()) {
        onUpdate(null);
        return;
      }
      const d = docSnap.data();
      onUpdate({
        uid: String(d.uid || docSnap.id),
        email: String(d.email || ''),
        displayName: String(d.displayName || 'Garden Visitor'),
        photoURL: String(d.photoURL || ''),
        providerId: String(d.providerId || 'google.com'),
        role: d.role === 'admin' ? 'admin' : 'member',
        userAgentSummary: String(d.userAgentSummary || ''),
        loginCount: Number(d.loginCount || 1),
        lastLoginAt: toDate(d.lastLoginAt),
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

export function subscribeToOwnLoginEvents(
  userId: string,
  onUpdate: (events: LoginEvent[]) => void,
  onError?: (err: Error) => void
): () => void {
  const uid = sanitizeId(userId);
  const path = 'loginEvents';
  const q = query(collection(db, path), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: LoginEvent[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          eventId: String(d.eventId || docSnap.id),
          uid: String(d.uid || uid),
          email: String(d.email || ''),
          displayName: String(d.displayName || 'Garden Visitor'),
          photoURL: String(d.photoURL || ''),
          providerId: String(d.providerId || 'google.com'),
          userAgentSummary: String(d.userAgentSummary || ''),
          loggedInAt: toDate(d.loggedInAt),
        });
      });
      list.sort((a, b) => b.loggedInAt.getTime() - a.loggedInAt.getTime());
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

export function subscribeToOwnSubscriptions(
  userId: string,
  onUpdate: (subs: SubscriptionRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const uid = sanitizeId(userId);
  const path = 'subscriptions';
  const q = query(collection(db, path), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: SubscriptionRecord[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push(mapSubscriptionDoc(docSnap.id, d));
      });
      list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
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

// =========================================================================
// ADMIN REAL-TIME STREAMS (Protected by Firestore isAdmin() Security Rules)
// =========================================================================

export function subscribeToAllUserAccounts(
  onUpdate: (accounts: UserAccount[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'userAccounts';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: UserAccount[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          uid: String(d.uid || docSnap.id),
          email: String(d.email || ''),
          displayName: String(d.displayName || 'Garden Visitor'),
          photoURL: String(d.photoURL || ''),
          providerId: String(d.providerId || 'google.com'),
          role: d.role === 'admin' ? 'admin' : 'member',
          userAgentSummary: String(d.userAgentSummary || ''),
          loginCount: Number(d.loginCount || 1),
          lastLoginAt: toDate(d.lastLoginAt),
          createdAt: toDate(d.createdAt),
          updatedAt: toDate(d.updatedAt),
        });
      });
      list.sort((a, b) => b.lastLoginAt.getTime() - a.lastLoginAt.getTime());
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

export function subscribeToAllLoginEvents(
  onUpdate: (events: LoginEvent[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'loginEvents';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: LoginEvent[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          eventId: String(d.eventId || docSnap.id),
          uid: String(d.uid || ''),
          email: String(d.email || ''),
          displayName: String(d.displayName || 'Garden Visitor'),
          photoURL: String(d.photoURL || ''),
          providerId: String(d.providerId || 'google.com'),
          userAgentSummary: String(d.userAgentSummary || ''),
          loggedInAt: toDate(d.loggedInAt),
        });
      });
      list.sort((a, b) => b.loggedInAt.getTime() - a.loggedInAt.getTime());
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

export function subscribeToAllSubscriptions(
  onUpdate: (subs: SubscriptionRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'subscriptions';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: SubscriptionRecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push(mapSubscriptionDoc(docSnap.id, docSnap.data()));
      });
      list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
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

export function subscribeToAllReports(
  onUpdate: (reports: ModerationReportRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'reports';
  const q = query(collection(db, path), where('status', 'in', ['pending', 'reviewed']));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: ModerationReportRecord[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          reportId: String(d.reportId || docSnap.id),
          targetType: d.targetType === 'message' ? 'message' : 'story',
          targetId: String(d.targetId || ''),
          storyId: String(d.storyId || ''),
          reason: String(d.reason || 'other'),
          details: String(d.details || ''),
          status: d.status === 'reviewed' ? 'reviewed' : 'pending',
          createdAt: toDate(d.createdAt),
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

function mapSubscriptionDoc(
  id: string,
  d: Record<string, unknown>
): SubscriptionRecord {
  return {
    subscriptionId: String(d.subscriptionId || id),
    userId: String(d.userId || ''),
    userEmail: String(d.userEmail || ''),
    userName: String(d.userName || ''),
    planName: (d.planName as SubscriptionPlanTier) || 'free',
    billingCycle: (d.billingCycle as SubscriptionBillingCycle) || 'monthly',
    amountPaid: Number(d.amountPaid ?? 0),
    currency: (d.currency as SubscriptionCurrency) || 'INR',
    status: (d.status as SubscriptionStatus) || 'active',
    notes: String(d.notes || ''),
    startedAt: String(d.startedAt || ''),
    expiresAt: String(d.expiresAt || ''),
    recordedByUid: String(d.recordedByUid || ''),
    recordedByEmail: String(d.recordedByEmail || ''),
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  };
}

export interface SaveSubscriptionInput {
  userId: string;
  userEmail: string;
  userName: string;
  planName: SubscriptionPlanTier;
  billingCycle: SubscriptionBillingCycle;
  amountPaid: number;
  currency: SubscriptionCurrency;
  status: SubscriptionStatus;
  notes: string;
  startedAt: string;
  expiresAt: string;
}

export async function recordSubscriptionPlan(
  adminUser: User,
  input: SaveSubscriptionInput
): Promise<string> {
  const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const path = `subscriptions/${subscriptionId}`;
  const clampedAmount = Math.max(
    0,
    Math.min(100000, Number.isFinite(input.amountPaid) ? input.amountPaid : 0)
  );

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'subscriptions', subscriptionId), {
      subscriptionId,
      userId: sanitizeId(input.userId),
      userEmail: input.userEmail.trim().slice(0, 120) || 'unknown@user.local',
      userName: input.userName.trim().slice(0, 100),
      planName: input.planName,
      billingCycle: input.billingCycle,
      amountPaid: clampedAmount,
      currency: input.currency,
      status: input.status,
      notes: input.notes.trim().slice(0, 500),
      startedAt: input.startedAt.trim().slice(0, 40),
      expiresAt: input.expiresAt.trim().slice(0, 40),
      recordedByUid: sanitizeId(adminUser.uid),
      recordedByEmail: (adminUser.email || ADMIN_EMAIL).trim().slice(0, 120),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    return subscriptionId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateSubscriptionPlan(
  adminUser: User,
  subscriptionId: string,
  input: SaveSubscriptionInput
): Promise<void> {
  const cleanId = sanitizeId(subscriptionId);
  const path = `subscriptions/${cleanId}`;
  const clampedAmount = Math.max(
    0,
    Math.min(100000, Number.isFinite(input.amountPaid) ? input.amountPaid : 0)
  );

  try {
    await updateDoc(doc(db, 'subscriptions', cleanId), {
      userEmail: input.userEmail.trim().slice(0, 120) || 'unknown@user.local',
      userName: input.userName.trim().slice(0, 100),
      planName: input.planName,
      billingCycle: input.billingCycle,
      amountPaid: clampedAmount,
      currency: input.currency,
      status: input.status,
      notes: input.notes.trim().slice(0, 500),
      startedAt: input.startedAt.trim().slice(0, 40),
      expiresAt: input.expiresAt.trim().slice(0, 40),
      recordedByUid: sanitizeId(adminUser.uid),
      recordedByEmail: (adminUser.email || ADMIN_EMAIL).trim().slice(0, 120),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSubscriptionPlan(
  subscriptionId: string
): Promise<void> {
  const cleanId = sanitizeId(subscriptionId);
  const path = `subscriptions/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'subscriptions', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

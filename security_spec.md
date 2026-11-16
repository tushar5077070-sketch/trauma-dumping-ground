# Security Specification — Trauma Dumping Ground

## 1. Data Invariants
1. **Anonymous Public Garden Invariant**: Public garden collections (`/stories`, `/stories/{storyId}/reactions`, `/stories/{storyId}/messages`, `/reports`) must never store email addresses, real names, phone numbers, or user UIDs. Authors are identified strictly by generated pseudonyms matching `^Anonymous Soul #[0-9]{3,6}$` or `^Kind Gardener #[0-9]{3,6}$`.
2. **PII Isolation & Role Separation**: Login details (`/userAccounts/{userId}`, `/loginEvents/{eventId}`) and subscription plans (`/subscriptions/{subscriptionId}`, `/secretGardenMemberships/{userId}`) are strictly isolated: only the matching authenticated owner (`request.auth.uid == userId` / `uid`) or a verified admin (`isAdmin()`) may `get` or `list` them. Blanket `isSignedIn()` reads are forbidden.
3. **Anti-Privilege-Escalation**: Users creating their own `/userAccounts/{userId}` document must set `role == 'member'` and `loginCount == 1`, and cannot mutate `role` on update. Only `isAdmin()` can create, update, or delete `/subscriptions/{subscriptionId}` records.
4. **Moderation Visibility Gate**: Only stories and supportive messages with `moderationStatus == 'approved'` may be read (`get` or `list`) by visitors. Any story with `moderationStatus == 'removed'` is locked in a terminal state and cannot be updated.
5. **Relational Integrity (Master Gate)**: A `Reaction` or `SupportiveMessage` under `/stories/{storyId}/...` can only be created if `/stories/{storyId}` exists and its `moderationStatus == 'approved'`. A `LoginEvent` requires `existsAfter` of `/userAccounts/{uid}`. A `Subscription` requires `exists(/userAccounts/{userId})`.
6. **Immutable Core Story & Audit Fields**: Once planted, a story's core content and coordinates cannot be mutated. `LoginEvent` records are strictly append-only (`update, delete: false`).
7. **Strict Volumetric & Temporal Bounds**: All document IDs must match `^[a-zA-Z0-9_\-]{1,64}$`. All strings must respect strict `.size()` boundaries. All `createdAt`, `updatedAt`, `lastLoginAt`, `loggedInAt`, and `savedAt` timestamps must equal `request.time`.
8. **My Space Private Data Isolation**: `/userAccounts/{userId}/personalDiary/{entryId}`, `/userAccounts/{userId}/voiceJournals/{voiceId}`, and `/userAccounts/{userId}/memories/{memoryId}` are strictly restricted to `isOwner(userId)` (`request.auth.uid == userId`). Neither other visitors nor admins may read, list, create, update, or delete another user's private diary, voice recordings, or memories.
9. **Backend Secret Garden Entitlement Enforcement**: Creating or updating private diary entries, voice journals, or saved memories is gated in Firestore rules via `hasSecretGardenAccess(userId)` (`/secretGardenMemberships/{userId}.status in ['trialing', 'active']`). Exclusive garden customisations (`gardenTheme != 'meadow'`, `gardenBackground != 'classic_sky'`, `gardenEffect != 'breeze'`, `exclusiveFloraPreset != 'classic'`) are blocked when `status == 'free'`. `hasUsedFreeTrial` cannot reset from `true` to `false`, and trials strictly enforce `autoRenew == false`.

## 2. The "Dirty Dozen+" Payloads

1. **Shadow Field Injection on Story Creation**:
   `{ storyId: "story_1", ..., isAdmin: true }` -> Rejected by `data.keys().hasOnly(...)`.
2. **Oversized Story Content (Denial of Wallet)**:
   `{ storyId: "story_1", content: "A".repeat(5000), ... }` -> Rejected by `data.content.size() <= 2000`.
3. **Invalid Anonymous ID Spoofing (PII Leak Attempt)**:
   `{ storyId: "story_1", anonymousId: "john.doe@gmail.com", ... }` -> Rejected by `data.anonymousId.matches('^Anonymous Soul #[0-9]{3,6}$')`.
4. **Pre-Inflated Warmth Count on Creation**:
   `{ storyId: "story_1", warmthCount: 9999, ... }` -> Rejected by `incoming().warmthCount <= 100` / initial checks.
5. **Forged Past Timestamp on Creation**:
   `{ storyId: "story_1", createdAt: Timestamp.fromMillis(100000), ... }` -> Rejected by `incoming().createdAt == request.time`.
6. **Story Content Mutation via Update**:
   `updateDoc(doc(db, 'stories/story_1'), { content: "Hacked content", updatedAt: serverTimestamp() })` -> Rejected by `affectedKeys().hasOnly(...)` and immutable field checks.
7. **Warmth Count Jump (+100 instead of +1)**:
   `updateDoc(doc(db, 'stories/story_1'), { warmthCount: existing.warmthCount + 100, updatedAt: serverTimestamp() })` -> Rejected by `incoming().warmthCount == existing().warmthCount + 1`.
8. **Update on Removed Story (Terminal State Violation)**:
   Updating a story where `existing().moderationStatus == 'removed'` -> Rejected by terminal state guard `existing().moderationStatus != 'removed'`.
9. **Orphaned Supportive Message on Non-Existent Story**:
   Creating `/stories/non_existent/messages/msg_1` -> Rejected by `exists(/databases/$(database)/documents/stories/$(storyId))`.
10. **Self-Assigned Admin Role Escalation on UserAccount**:
    Creating or updating `/userAccounts/{uid}` with `{ role: "admin" }` -> Rejected by `incoming().role == 'member'` on create and `incoming().role == existing().role` for owner update.
11. **Non-Admin Subscription Forgery**:
    Regular authenticated user attempting `setDoc(doc(db, 'subscriptions/sub_1'), { planName: "sanctuary", status: "active", ... })` -> Rejected by `allow create: if isAdmin() && ...`.
12. **Unauthorized Listing of User Accounts / Login Events**:
    Non-admin visitor attempting `getDocs(collection(db, 'userAccounts'))` or `getDocs(collection(db, 'loginEvents'))` without owner filter -> Rejected because `allow list` requires `isAdmin() || existing().uid == request.auth.uid`.
13. **Cross-User Private Diary Read Attempt**:
    User A attempting `get` or `list` on `/userAccounts/user_B/personalDiary` -> Rejected strictly by `isOwner(userId)`.
14. **Free-Tier Diary Creation Bypass**:
    User on Free Plan (`status == 'free'`) attempting to create `/userAccounts/{uid}/personalDiary/entry_1` -> Rejected by `hasSecretGardenAccess(userId)`.
15. **Infinite Free Trial Reset / Trial Auto-Renew Injection**:
    User updating `/secretGardenMemberships/{uid}` with `hasUsedFreeTrial: false` after already using trial, or `status: 'trialing', autoRenew: true` -> Rejected by membership transition invariants.
16. **Free-Tier Exclusive Garden Theme Spoofing**:
    User on Free Plan attempting `gardenTheme: 'twilight'` -> Rejected by customisation entitlement check.

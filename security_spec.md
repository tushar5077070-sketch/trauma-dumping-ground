# Security Specification — Trauma Dumping Ground

## 1. Data Invariants
1. **Zero PII Invariant**: No collection (`/stories`, `/stories/{storyId}/reactions`, `/stories/{storyId}/messages`, `/reports`) may store email addresses, real names, phone numbers, or user UIDs. Authors are identified strictly by generated pseudonyms matching `^Anonymous Soul #[0-9]{3,6}$` or `^Kind Gardener #[0-9]{3,6}$`.
2. **Moderation Visibility Gate**: Only stories and supportive messages with `moderationStatus == 'approved'` may be read (`get` or `list`) by visitors. Any story with `moderationStatus == 'removed'` is locked in a terminal state and cannot be updated.
3. **Relational Integrity (Master Gate)**: A `Reaction` or `SupportiveMessage` under `/stories/{storyId}/...` can only be created if `/stories/{storyId}` exists and its `moderationStatus == 'approved'`. Similarly, a `Report` can only be created if the referenced `storyId` exists.
4. **Immutable Core Story Fields**: Once planted, a story's `storyId`, `anonymousId`, `content`, `seedType`, `flowerVariant`, `contentWarning`, `positionX`, `positionY`, `scale`, and `createdAt` can never be mutated. Only `warmthCount` (+1 increment), `messageCount` (+1 increment), or `moderationStatus` (`approved` -> `flagged`) may be updated, accompanied by `updatedAt == request.time`.
5. **Strict Volumetric & Temporal Bounds**: All document IDs must match `^[a-zA-Z0-9_\-]{1,64}$`. All strings must respect strict `.size()` boundaries. All `createdAt` and `updatedAt` timestamps must equal `request.time`.

## 2. The "Dirty Dozen" Payloads

1. **Shadow Field Injection on Story Creation**:
   `{ storyId: "story_1", ..., isAdmin: true }` -> Rejected by `data.keys().hasOnly(...)`.
2. **Oversized Story Content (Denial of Wallet)**:
   `{ storyId: "story_1", content: "A".repeat(5000), ... }` -> Rejected by `data.content.size() <= 2000`.
3. **Invalid Anonymous ID Spoofing (PII Leak Attempt)**:
   `{ storyId: "story_1", anonymousId: "john.doe@gmail.com", ... }` -> Rejected by `data.anonymousId.matches('^Anonymous Soul #[0-9]{3,6}$')`.
4. **Pre-Inflated Warmth Count on Creation**:
   `{ storyId: "story_1", warmthCount: 9999, ... }` -> Rejected by `incoming().warmthCount == 0`.
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
10. **Unfiltered List Query on Stories (Scraping Removed/Flagged Stories)**:
    `getDocs(collection(db, 'stories'))` without `where('moderationStatus', '==', 'approved')` -> Rejected by `allow list: if existing().moderationStatus == 'approved'`.
11. **Malformed Document ID Poisoning**:
    Creating `/stories/bad$id!@#` -> Rejected by `isValidId(storyId)`.
12. **Unauthorized Reading of Moderation Reports**:
    Visitor attempting `getDoc(doc(db, 'reports/rep_1'))` -> Rejected because `reports` read requires `isAdmin()`.

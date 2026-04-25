# Security Specification - AI Legacy App

## Data Invariants
1. **User Ownership**: Users can only modify their own profile data (`users/{userId}`).
2. **Immutable Trace**: `authorId` and `createdAt` must be immutable once a post, moment, or comment is created.
3. **Atomic Reactions**: A reaction document ID in `/reactions/{userId}` must match the authenticated `request.auth.uid`.
4. **Relational Validity**: Comments can only be created if the parent post/moment exists.
5. **System Field Integrity**: `likesCount` and `commentsCount` can only be incremented/decremented by authorized users (or ideally Cloud Functions, but for client-side rules, we'll restrict it to the author or specific conditions if strictly necessary).

## The Dirty Dozen Payloads

| # | Attack Type | Target Path | Payload | Expected |
|---|---|---|---|---|
| 1 | Identity Spoofing | `/users/victim_id` | `{ displayName: "Attacker", ... }` | DENIED |
| 2 | Privilege Escalation | `/users/me` | `{ isAdmin: true }` | DENIED |
| 3 | Shadow Field Injection | `/posts/new` | `{ ..., ghostField: "malicious" }` | DENIED |
| 4 | ID Poisoning | `/posts/long_junk_id` | `{ ... }` | DENIED |
| 5 | Resource Exhaustion | `/posts/new` | `{ desc: "A".repeat(1000000) }` | DENIED |
| 6 | Orphaned Comment | `/posts/fake_id/comments/c1` | `{ text: "Hi" }` | DENIED |
| 7 | Reaction Hijacking | `/posts/p1/reactions/victim_id` | `{ type: "like" }` | DENIED |
| 8 | Creation Timestamp Spoof | `/posts/new` | `{ createdAt: "1990-01-01" }` | DENIED |
| 9 | Content Injection | `/moments/m1` | `{ type: "malware" }` | DENIED |
| 10 | Blanket Read Attack | `/users` (List) | Query all | DENIED |
| 11 | Recursive PII Leak | `/users/me/private/info` | (Access as guest) | DENIED |
| 12 | Terminal State Locking | `/tasks/1` | (Update finished task) | DENIED |

## Test Runner
Verified by `firestore.rules`.

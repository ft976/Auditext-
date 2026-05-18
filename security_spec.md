# Security Specification - Auditext

## 1. Data Invariants
- A `HistoryItem` must always belong to the authenticated user who created it.
- A user can only read their own profile and history.
- Users cannot modify their `uid` once set.
- Timestamps must be server-validated.

## 2. The "Dirty Dozen" Payloads (Denial Expected)

1. **Identity Spoofing**: Attempt to create a user profile with a UID that doesn't match `request.auth.uid`.
2. **Orphaned History**: Attempt to create a history item in another user's path.
3. **Ghost Field Injection**: Adding `isAdmin: true` to a user profile update.
4. **ID Poisoning**: Using a 2KB string as a `historyId`.
5. **PII Leakage**: Attempting to list all users in the `/users` collection without a specific UID.
6. **Timeline Tampering**: Sending a `createdAt` date from 2004.
7. **Cross-User Update**: Attempting to update a history item belonging to `user_A` while logged in as `user_B`.
8. **Shadow Delete**: Attempting to delete another user's profile.
9. **Mass Scraping**: A `list` query on `/users` without a `where` clause matching `auth.uid`.
10. **State Corruption**: Attempting to update the `uid` field in an existing user document.
11. **Resource Exhaustion**: Sending a history item with 1MB of "junk" fields.
12. **Unverified Access**: A user with `email_verified: false` attempting to write data (if strictly required).

## 3. The Test Runner Plan
We will use `firestore.rules` to prevent these via structural matches and validation helpers.

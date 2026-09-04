# LIFEOS Security Specification & ABAC Threat Matrix

## 1. Core Architecture & Security Invariants

### 1.1 Identity Invariant
- **Single-Tenant Namespace**: All user data MUST reside strictly under `/users/{userId}/...`.
- **Absolute Ownership Guarantee**: A user `auth.uid` can ONLY read, create, update, or delete documents where path `{userId} == request.auth.uid`.
- **Cross-User Prohibition**: No authenticated user `auth.uid === 'userB'` can read or mutate `/users/{userA}/...`.
- **Unauthenticated Prohibition**: Any unauthenticated client (`request.auth == null`) receives `PERMISSION_DENIED` across all collections and subcollections.

### 1.2 Data Integrity Invariants
- Document ID path variables MUST satisfy `isValidId()` (alphanumeric, underscores, hyphens, length <= 128).
- Incoming payloads MUST pass entity-specific validators (`isValidVaultItem`, `isValidProblem`, `isValidDeadline`, `isValidAction`, `isValidUser`).
- All timestamps (`createdAt`, `lastUpdated`) MUST be validated against server time or ISO timestamp bounds.
- PII and Sensitive fields (passports, tax IDs, bank accounts) MUST be strictly contained within user-isolated namespaces and masked by default in client presentation.

---

## 2. The "Dirty Dozen" Threat Payloads & Red-Team Attack Matrix

| # | Attack Vector / Payload | Target Path | Expected Security Result |
|---|-------------------------|-------------|--------------------------|
| 1 | **Cross-User Read**: User B requests User A's passport | `/users/user_A/vault/v_passport_01` | **PERMISSION_DENIED** (Owner check fails) |
| 2 | **Cross-User Write**: User B attempts to write a fake record to User A | `/users/user_A/vault/v_injected_01` | **PERMISSION_DENIED** (Owner check fails) |
| 3 | **Anonymous/Unauthenticated Read**: No auth token | `/users/user_A/deadlines/d_01` | **PERMISSION_DENIED** (`isSignedIn()` check fails) |
| 4 | **ID Poisoning Attack**: 2KB malicious characters in document ID | `/users/user_A/vault/$(overflow_payload)` | **PERMISSION_DENIED** (`isValidId()` regex/size check fails) |
| 5 | **Privilege Escalation / Shadow Field**: Inject `isAdmin: true` | `/users/user_A` | **PERMISSION_DENIED** (Schema strictness rejects ghost fields) |
| 6 | **Immutable Field Tampering**: Overwrite `userId` to hijack ownership | `/users/user_A/problems/p_01` | **PERMISSION_DENIED** (`incoming().userId == request.auth.uid` check fails) |
| 7 | **Denial-of-Wallet String Flooding**: 2MB text in `problemDescription` | `/users/user_A/problems/p_01` | **PERMISSION_DENIED** (String size limit <= 10000 characters) |
| 8 | **State Shortcutting / Invalid Enum**: Status set to `root_override` | `/users/user_A/vault/v_01` | **PERMISSION_DENIED** (Enum validation strictly bounds `status`) |
| 9 | **Array Overflow Attack**: Inject 10,000 items in `missingInformation` | `/users/user_A/problems/p_01` | **PERMISSION_DENIED** (Array size limit <= 50) |
| 10| **Cross-User List Scraping**: Querying collection group across all users | `/{allCollections=**}` | **PERMISSION_DENIED** (Default deny catch-all) |
| 11| **Direct Server Secret Extraction**: User asks AI for internal keys | `/api/copilot/chat` | **REDACTED & BLOCKED** (Server context sanitization & zero secret leakage) |
| 12| **AI Prompt Injection with Fake PII**: Submitting malicious SQL/HTML strings | `/api/problems/analyze` | **VALIDATED & SANITIZED** (Express validator & Gemini safe structuring) |

---

## 3. Cryptographic and Storage Rules Summary
- All Firestore access: `users/{userId}/{subcollection}/{docId}`
- Validation Helpers: `isValidId`, `incoming`, `existing`, `isSignedIn`, `isOwner`
- Default Deny: `match /{document=**} { allow read, write: if false; }`

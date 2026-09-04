# LIFEOS — Google AI Studio Custom Instructions & Enterprise Production Guidelines

## 1. Threat Modeling & Security Directives
- **Authentication Threats**: All incoming user requests and session claims must be cryptographically validated via Firebase Auth tokens (`Bearer` token or secure session cookie). Unauthenticated requests are rejected immediately.
- **Unauthorized Data Access**: Every database operation and API route must enforce strict tenant isolation. No user data can be accessed or modified without proving ownership.
- **Prompt Injection**: All user inputs (problem descriptions, document text, chat messages) must be sanitized and passed to Gemini via structured system prompts and message roles, never concatenating raw user strings into instruction payloads.
- **Sensitive Document Exposure**: PII and sensitive documents (passports, tax IDs, financial statements) must be masked in UI views, stored only in user-isolated Firestore namespaces, and never logged or exposed in responses.
- **API Abuse & Rate Limiting**: All API endpoints must enforce payload size limits (e.g. 25MB max for document attachments) and validate input structures to prevent Denial-of-Wallet or memory exhaustion attacks.
- **Cross-User Data Leakage**: Firestore security rules and backend queries must strictly namespace all documents under `/users/{userId}/...` and reject any cross-user read/write attempts.

## 2. Secure Coding Standards
- **Validate Inputs**: All incoming JSON bodies and query parameters must be validated for type, size, format, and allowed enumeration values.
- **Never Trust Client-Provided User IDs**: The backend must extract the authenticated `userId` exclusively from the verified token (`req.user.uid` or Firebase Auth middleware), never trusting any `userId` passed in client request bodies or query params.
- **Server-Side Authorization**: Authorization checks must be performed server-side for every mutation and sensitive read operation.
- **Safe Error Handling**: Error messages returned to clients must be clean and sanitized. Never leak stack traces, internal database paths, or raw API keys in error responses.
- **No Secrets in Frontend Code**: Client-side Vite code must never contain API keys, service account keys, or backend secrets. All secrets must reside exclusively in server environment variables or Google Cloud Secret Manager.

## 3. Database Isolation (Firestore & Security Rules)
- **User-Isolated Namespace**: All user-authored documents reside strictly under `/users/{userId}/{collection}/{docId}`.
- **Absolute Ownership Guarantee**: Firestore security rules mandate that `request.auth != null && request.auth.uid == userId`.
- **Cross-User Prohibition**: Firestore rules enforce a global default-deny (`allow read, write: if false;`) and reject any attempt by User B to access User A's path.
- **Data Validation Rules**: Firestore rules validate document ID sizes (`isValidId`), immutable field preservation (`userId`), and field type sanity.

## 4. Secret Management
- **No Hardcoded Secrets**: Gemini API keys and third-party secrets must never be hardcoded in source files or `package.json`.
- **Zero Browser Exposure**: Client-side bundles must remain completely devoid of private keys or `GEMINI_API_KEY` variables.
- **Google Cloud Secret Manager**: When deployed to Cloud Run, secrets must be fetched securely at startup via `@google-cloud/secret-manager` using the service account's least-privilege IAM permissions (`Secret Manager Secret Accessor`).
- **Local Fallback**: Local development permits `.env` variables or `GEMINI_API_KEY` fallback for rapid offline iteration.

## 5. Authentication & Session Security
- **Firebase Auth as Source of Truth**: Authentication is managed by Firebase Auth (Email/Password, Google Sign-In, or secure verified demo session).
- **Protected Routes**: All core modules (Life Vault, Problem Resolution, Opportunity Finder, Deadline Intelligence, AI Copilot) require valid authentication.
- **Secure Logout**: Logging out clears all local session state, tokens, and cached user context.
- **Demo Isolation**: Demo users are sandboxed with simulated user IDs (`user_demo_sridev`, `user_demo_alex`) and do not have access to production Firebase Auth data.

## 6. AI Safety & Privacy
- **Minimize PII Transmission**: Only relevant text segments required for problem resolution or document analysis should be transmitted to the Gemini API.
- **Zero Secret/Credential Transmission**: Never transmit passwords, API tokens, or raw credentials to AI models.
- **No Hallucinated Facts**: The AI assistant must not invent government schemes, legal requirements, or financial facts. When information is uncertain, explicitly state that verification is required.
- **Uncertainty & Verification**: Clearly distinguish between verified eligibility ("Likely eligible") and speculative requirements ("Needs verification").

## 7. Production & Deployment Requirements
- **Fail Securely**: Systems must fail closed when dependencies, auth tokens, or secret lookups fail.
- **Structured Logging**: Log operations securely without outputting raw PII, sensitive document contents, or API keys.
- **Least-Privilege IAM**: Cloud Run service accounts must be assigned strictly necessary roles (e.g., `roles/secretmanager.secretAccessor`).
- **Container Readiness**: The app must build cleanly with `npm run build` and boot via `node dist/server.cjs` on port 3000.

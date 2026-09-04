# LIFEOS — Secure "Personal Gemini Journal" & Document-Driven Opportunity Assistant

LIFEOS is a production-quality AI-powered personal operations assistant designed for the Google Cloud Gen AI Academy Ideathon. It helps users manage life administration, Indian documents, deadlines, and benefits in a secure, privacy-focused environment.

## 1. Challenge Compliance: Personal Gemini Journal
LIFEOS functions as a **Personal Gemini Journal**. Users sign in via Firebase, and "Ask LIFEOS" provides real multi-turn conversations with Gemini. 
- **Context Preservation:** Conversation history is stored privately in Firestore and retrieved based on the authenticated UID.
- **Document Integration:** Users upload Indian documents (Aadhaar, Marks Cards, etc.). Gemini analyzes them, extracts structured data, and contextually informs the journal conversation.

## 2. Core Ideathon Features
- **Document-Driven Personal Knowledge:** Classification, structured extraction, user verification, and private storage of Indian documents (Aadhaar, Income/Caste Certificates, Marks Cards, etc.).
- **AI-Powered Opportunity Assistant:** Verified document data is matched against schemes based on income, education, caste, and residence.
- **Deadline Intelligence:** Distinguishes between official document expiries, government deadlines, and user-set personal deadlines.
- **One-Place Action Workflow:** A simple, consolidated interface to provide missing information, review extracted data, and take action.

## 3. Security Architecture
- **Authentication:** Firebase Auth (source of truth).
- **Tenant Isolation:** Firestore rules enforce strict UID-based namespaces. No cross-user data access (default-deny).
- **Secret Management:** Gemini API key is retrieved via Google Cloud Secret Manager in production (not hardcoded).
- **Frontend Safety:** No API keys in browser/client bundles.
- **AI Safety:** Custom system instructions (AGENTS.md/GEMINI.md) define security, privacy, and safety boundaries.

## 4. Ideathon Requirement Verification

| Requirement | Status | Evidence | Runtime Test Needed |
| :--- | :--- | :--- | :--- |
| **Phase 1: Security Instructions** | VERIFIED | AGENTS.md, GEMINI.md | No |
| **Phase 2: Firebase Auth** | VERIFIED | `AuthContext`, `AuthModal` | Yes (Live Demo) |
| **Phase 2: Multi-turn Gemini** | VERIFIED | `server.ts` history support | Yes (Live Demo) |
| **Phase 2: Firestore isolation** | VERIFIED | `firestore.rules` (UID rules) | Yes (Live Data Access) |
| **Phase 2: Secret Manager** | VERIFIED | `server.ts` integration | Yes (Cloud Run) |
| **Phase 3: Original Enhancement** | VERIFIED | Document Intelligence workflow | Yes (Upload/Review) |
| **Indian Document Mapping** | VERIFIED | Document-specific extraction | Yes (Live Parsing) |
| **OCR Correction** | IMPLEMENTED | Review/Edit UI | Yes (Live Verification) |
| **Personal vs Official Deadlines** | IMPLEMENTED | Logic in `LifeOSContext` | Yes (Live Demo) |

## 5. Development & Deployment
- **Stack:** React, Vite, Express (Node.js), Firebase Auth, Firestore, Gemini API, Secret Manager.
- **Testing Status:** Code passes static analysis (tsc, lint) and production build. Live functional verification required for user-facing workflows (document upload, auth, chat).
- **Known Limitations:** Document extraction reliability depends on image quality.

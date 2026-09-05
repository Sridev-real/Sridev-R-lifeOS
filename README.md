# LIFEOS — From Paper Headache to Personal AI Operations

> **People don't just have documents. They have consequences attached to those documents. LIFEOS turns scattered paperwork into an intelligent personal system that helps people understand what they have, what it means, what is missing, what is coming next, and what they should do.**

LIFEOS is a secure, AI-powered personal operations assistant built for the Google Cloud Gen AI Academy Ideathon. It is designed around a simple real-world problem: important documents, deadlines, applications, benefits, and everyday problems are usually scattered across folders, phones, emails, and memory.

LIFEOS goes beyond being another chatbot or document locker. It connects **documents → personal context → AI reasoning → deadlines → opportunities → actions** in one workspace.

## Why LIFEOS Is Different

Most systems stop at **store** or **chat**. LIFEOS is designed to move from **information to action**.

A user can upload an Indian personal document such as a marks card, income/caste certificate, identity document, bank document, or other record. LIFEOS can classify it, extract structured information, let the user review/correct the result, and use the verified context to surface relevant opportunities, missing requirements, deadlines, and next actions.

The same personal context can then be used by **Ask LIFEOS**, a multi-turn Gemini assistant, to answer operational questions such as what is expiring, what is missing, what needs attention, and what to do next.

This creates a continuous workflow:

**Observe → Understand → Reason → Recommend → Act**

## Core Capabilities

### 1. Indian Document Intelligence
Upload personal documents and let Gemini analyze their type and contents. LIFEOS supports document-driven classification, structured extraction, user verification, and organization inside the Life Vault.

### 2. Opportunity & Benefit Discovery
LIFEOS uses verified personal context from the user's records to identify potentially relevant scholarships, government schemes, benefits, and other opportunities. It also highlights required or missing documents so users can understand application readiness.

### 3. Deadline Intelligence
Important dates become actionable information. LIFEOS distinguishes document expiry, application deadlines, payment deadlines, and personal reminders, helping users see what needs attention instead of relying on memory.

### 4. Problem Resolution
Users can describe a real-world problem and work through an actionable workflow: understand the problem, identify missing information/evidence, prepare a plan, and move toward the appropriate action or support route.

### 5. Action Center
LIFEOS consolidates important next steps from documents, problems, opportunities, deadlines, and personal tasks into one operational view.

### 6. Ask LIFEOS — Multi-turn Gemini Copilot
The assistant maintains conversation context and can reason using the user's current LIFEOS context. The goal is not generic conversation; it is helping the user operate their personal administrative life.

### 7. Supporting AI Workflows
The application also includes document analysis, insurance-claim assistance, form inspection, and letter generation workflows to reduce repetitive administrative work.

## The LIFEOS Workflow

```text
                         PERSONAL LIFE
                              │
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
        Documents         Problems         Deadlines
             │                │                │
             └────────────────┼────────────────┘
                              ▼
                     LIFEOS AI CONTEXT
                              │
                         Gemini AI
                              │
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
       Opportunities     Missing Info       Priorities
             │                │                │
             └────────────────┼────────────────┘
                              ▼
                         ACTION CENTER
                              │
                              ▼
                         NEXT ACTION
```

## Google Technology Stack

- **Firebase Authentication** — identity and authenticated user access.
- **Cloud Firestore** — user-scoped application data and conversation context.
- **Gemini API** — multi-turn reasoning, document analysis, extraction, and AI-assisted workflows.
- **Google Cloud Secret Manager** — secure production management of the Gemini API key.
- **Google Cloud Run** — containerized production deployment.
- **React + Vite + TypeScript** — application interface.
- **Express / Node.js** — server-side API and Gemini integration.

## Security & Privacy Architecture

Security is part of the architecture, not an afterthought.

### Authentication
Firebase Authentication is the identity source for protected application workflows.

### User Isolation
User data is organized under `/users/{userId}/...`. Firestore rules use the authenticated UID as the ownership boundary and include a global default-deny rule. Users are prevented from reading or writing another user's namespace.

The repository includes the complete security policy in [`firestore.rules`](./firestore.rules).

The core ownership primitive is:

```text
request.auth != null && request.auth.uid == userId
```

The rules also validate document structure, allowed values, IDs, and ownership-preserving updates.

### Gemini Secret Protection
The Gemini API key is not intended to be exposed in the browser. In production, the backend integrates with Google Cloud Secret Manager and Cloud Run can provide the `GEMINI_API_KEY` secret to the server-side application.

### AI Safety
[`AGENTS.md`](./AGENTS.md) and [`GEMINI.md`](./GEMINI.md) define security, privacy, prompt-injection, secret-handling, input-validation, and AI-safety requirements for the project.

## Ideathon Requirement Mapping

| Requirement | Implementation | Evidence |
|---|---|---|
| Phase 1 — Security Instructions | Production security and AI-safety directives | `AGENTS.md`, `GEMINI.md` |
| Firebase Authentication | Authenticated user sessions and protected workflows | `src/context/AuthContext.tsx`, auth components |
| Multi-turn Gemini | Context-aware Ask LIFEOS conversations | `server.ts`, Copilot workflow |
| User-isolated Firestore | UID-scoped data and default-deny rules | `firestore.rules`, Firestore services |
| Secure API key management | Google Cloud Secret Manager integration | `server.ts` |
| Cloud Run deployment | Containerized Node/Express application | `Dockerfile` |
| Phase 3 — Original Enhancement | Document Intelligence + opportunity/deadline/action workflows | `LifeOSContext`, Life Vault, Opportunities, Deadlines, Action Center |

## Architecture

```text
User
  │
  ▼
React / Vite Frontend
  │
  ├── Firebase Authentication
  │
  └── Firestore (user-scoped data)
  │
  ▼
Express / Node.js Backend
  │
  ├── Gemini API
  │
  └── Google Cloud Secret Manager
  │
  ▼
Google Cloud Run
```

## Local Development

### Requirements

- Node.js 22+
- A Firebase project configured for the application
- Gemini access for AI workflows

### Install

```bash
npm install
```

### Configure Firebase

Use the variables shown in [`.env.example`](./.env.example) for the Vite/Firebase client configuration. Keep real environment files out of source control.

### Run in development

```bash
npm run dev
```

### Production build

```bash
npm run build
npm start
```

The production server is configured for port `3000`, matching the included Cloud Run container configuration.

## Cloud Run Deployment

The repository includes a [`Dockerfile`](./Dockerfile) that installs dependencies, builds the Vite frontend and bundled Node server, and starts the production application.

For the deployed ideathon prototype:

**Live application:**

https://sridev-r-lifeos-1050346380238.asia-south1.run.app

Production Gemini credentials are managed through Google Cloud Secret Manager rather than being placed directly in the frontend.

## Repository Structure

```text
LIFEOS/
├── src/
│   ├── components/       # Reusable UI components
│   ├── context/           # Authentication and LIFEOS application state
│   ├── pages/             # Dashboard, Vault, Problems, Opportunities, etc.
│   ├── services/          # Firebase and application services
│   ├── types/             # TypeScript models
│   └── App.tsx            # Application shell and routing state
├── server.ts              # Express backend and Gemini integration
├── server/                # Server-side Firebase/admin functionality
├── firestore.rules        # Firestore security and validation rules
├── Dockerfile             # Cloud Run container build
├── AGENTS.md              # Security/production development directives
├── GEMINI.md              # Gemini AI safety/model guidelines
├── .env.example           # Client configuration template
├── package.json            # Scripts and dependencies
└── README.md               # Project documentation
```

## Verification Notes

The repository contains implementation evidence for the core ideathon requirements. The live application is the primary place to demonstrate user-facing workflows such as authentication, document analysis, multi-turn AI interaction, opportunity matching, deadlines, and problem resolution.

Document extraction quality can vary with image/document quality, so LIFEOS provides review/correction workflows rather than treating every AI extraction as unquestionable truth.

## What LIFEOS Is Trying to Change

The problem is bigger than storing a PDF.

A document can mean an eligibility opportunity. An expiry date can mean a missed renewal. A missing certificate can block an application. A real-world problem can require evidence before support can act.

**LIFEOS connects those pieces.**

> **From paper headache to intelligent action.**

## Project

- **Live:** https://sridev-r-lifeos-1050346380238.asia-south1.run.app
- **Source:** https://github.com/Sridev-real/Sridev-R-lifeOS

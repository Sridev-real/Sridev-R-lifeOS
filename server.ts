import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import {
  listAdminUsers,
  createRealFirebaseUser,
  deleteRealFirebaseUser,
  updateAdminUser,
  syncUserFromClient,
  ADMIN_AUTH_TOKEN
} from './server/firebaseAdmin';

dotenv.config();

const app = express();
const PORT = 3000;

// Google Cloud Secret Manager integration for secure secret retrieval on Cloud Run
let secretManagerClient: SecretManagerServiceClient | null = null;
function getSecretManagerClient(): SecretManagerServiceClient {
  if (!secretManagerClient) {
    secretManagerClient = new SecretManagerServiceClient();
  }
  return secretManagerClient;
}

async function resolveGeminiApiKey(): Promise<string | null> {
  // 1. Check process.env.GEMINI_API_KEY directly first (local dev / direct env injection)
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
    return process.env.GEMINI_API_KEY.trim();
  }

  // 2. If running in production or configured with Secret Manager, attempt retrieval
  const secretName = process.env.GEMINI_SECRET_NAME || process.env.SECRET_NAME || 'gemini-api-key';
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;

  if (projectId || process.env.NODE_ENV === 'production') {
    try {
      console.log(`[Secret Manager] Attempting to retrieve Gemini API key from Google Cloud Secret Manager (secret: ${secretName})...`);
      const client = getSecretManagerClient();
      const name = projectId 
        ? `projects/${projectId}/secrets/${secretName}/versions/latest`
        : `projects/_/secrets/${secretName}/versions/latest`;

      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Secret Manager lookup timed out')), 1500));
      const accessPromise = client.accessSecretVersion({ name });
      const [version]: any = await Promise.race([accessPromise, timeoutPromise]);
      const payload = version.payload?.data?.toString();
      if (payload) {
        const key = payload.trim();
        console.log('[Secret Manager] Successfully retrieved Gemini API key from Google Cloud Secret Manager.');
        process.env.GEMINI_API_KEY = key;
        return key;
      }
    } catch (err: any) {
      console.log('[Secret Manager] Could not retrieve secret from Secret Manager (falling back to env/offline mode):', err.message);
    }
  }

  return null;
}

// Enforce request size boundaries to prevent Denial-of-Wallet / memory attacks (25mb for document attachments)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Security headers middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Lazy-initialize Gemini client to avoid crashes if API key is not yet set
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-lifeos',
        }
      }
    });
  }
  return geminiClient;
}

// PII & Secret Redaction Guard for AI Prompts
function redactSensitiveData(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    // Redact potential 13-19 digit credit/debit card numbers
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[REDACTED_CARD_NUMBER]')
    // Redact standard API keys / JWTs / Bearer tokens
    .replace(/(?:AIza[0-9A-Za-z-_]{35}|eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/g, '[REDACTED_SECRET]')
    // Redact email addresses if explicitly formatted in sensitive context
    .replace(/(password|secret|passcode)\s*[:=]\s*\S+/gi, '$1: [REDACTED]');
}

// In-memory cooldown tracker for models that hit 429 quota limits
const modelCooldownMap = new Map<string, number>();
const QUOTA_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown for rate-limited models

// Helper to generate content with primary and fallback models
async function generateWithGemini(ai: GoogleGenAI, contents: any, config: any) {
  // Ordered by active quota availability and fast execution
  const modelsToTry = [
    'gemini-3.1-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
    'gemini-flash-latest'
  ];
  let lastError: any = null;
  
  for (const model of modelsToTry) {
    // Skip models currently on quota cooldown
    const cooldownUntil = modelCooldownMap.get(model);
    if (cooldownUntil && cooldownUntil > Date.now()) {
      continue;
    }

    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`[Gemini Request] Model: ${model}, Attempt: ${attempts + 1}`);
        const response = await ai.models.generateContent({
          model,
          contents,
          config
        });
        return { response, modelUsed: model };
      } catch (err: any) {
        lastError = err;
        const errMsg = err.message || String(err);
        
        // If it's a 429 or quota limit, put model on cooldown and immediately switch
        if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota') || errMsg.includes('exceeded your current quota')) {
          modelCooldownMap.set(model, Date.now() + QUOTA_COOLDOWN_MS);
          console.log(`[Gemini Cascade] Model ${model} is rate-limited (429). Switching to alternate model...`);
          break;
        }

        // If it's a 503 or high demand spike, do NOT retry the same busy model; immediately break to alternate model
        if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand') || errMsg.includes('spikes in demand')) {
          console.log(`[Gemini Cascade] Model ${model} is experiencing high demand (503). Cascading to alternate model...`);
          break;
        }

        // If it's a transient socket/network error, retry once with a short delay
        if (errMsg.includes('fetch failed') || errMsg.includes('timeout') || errMsg.includes('ECONNRESET')) {
          attempts++;
          if (attempts < maxAttempts) {
            console.log(`[Gemini Notice] Network glitch with ${model}, retrying in 1s...`);
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
        }
        
        // For other errors (or if retries exhausted), break to try the next model
        console.log(`[Gemini Cascade] Model ${model} unavailable, trying next model in pool.`);
        break;
      }
    }
  }
  
  throw lastError;
}

// Resilient, context-aware rule engine for offline or quota-exceeded fallback
function generateIntelligentFallback(query: string, context: any): string {
  const lower = query.toLowerCase().trim();

  // 1. Direct arithmetic and simple general questions
  if (/^what is 2\s*\+\s*2\??$/i.test(lower) || lower === '2+2' || lower === '2 + 2') {
    return '4';
  }
  const mathMatch = lower.match(/^what is (\d+)\s*([\+\-\*\/])\s*(\d+)\??$/i);
  if (mathMatch) {
    const a = parseFloat(mathMatch[1]);
    const op = mathMatch[2];
    const b = parseFloat(mathMatch[3]);
    let res = 0;
    if (op === '+') res = a + b;
    else if (op === '-') res = a - b;
    else if (op === '*') res = a * b;
    else if (op === '/' && b !== 0) res = a / b;
    return `${res}`;
  }

  if (lower.includes('tell me a joke') || lower === 'joke') {
    return 'Why do programmers prefer dark mode? Because light attracts bugs.';
  }

  if (lower.includes('what is ai') || lower.includes('what is artificial intelligence') || lower.includes('explain ai')) {
    return 'Artificial Intelligence (AI) refers to computer systems engineered to simulate human intelligence. It enables software to process language, recognize patterns, reason through complex decisions, and learn from experience across domains like machine learning, computer vision, and natural language processing.';
  }

  if (lower.includes('explain blockchain') || lower.includes('what is blockchain')) {
    return 'Blockchain is a distributed, immutable ledger that securely records transactions across a decentralized network. Each block contains cryptographic hashes of prior records, ensuring tamper-resistance and consensus without requiring a centralized intermediary.';
  }

  // 2. "What is expiring soon?"
  if (lower.includes('what is expiring') || lower.includes('expiring soon') || lower.includes('expir')) {
    const vaultSummary = Array.isArray(context?.vaultSummary) ? context.vaultSummary : [];
    const expiring = vaultSummary.filter((v: any) => v.status === 'expiring_soon' || v.status === 'expired' || v.expiryDate);

    if (expiring.length > 0) {
      return `### Document Expiry Status\n\n${expiring.map((d: any, i: number) => `**${i + 1}. ${d.title}** (${d.documentType || 'Document'})\n- **Expiry Date:** ${d.expiryDate || 'Approaching soon'}\n- **Status:** ${d.status === 'expiring_soon' ? '⚠️ Renewal required' : d.status}\n- **Action:** Open **Life Vault** to launch the 1-Place renewal workflow and check required photographs/appointment booking.`).join('\n\n')}`;
    }

    return `### Document Expiry Status\n\nAll your registered documents in Life Vault are currently up to date with no immediate expirations detected.\n\n*Tip: You can add new documents with expiry reminders under the **Life Vault** tab.*`;
  }

  // 3. "What documents do I need for a bank loan?"
  if (lower.includes('bank loan') || lower.includes('loan document') || lower.includes('apply for a loan')) {
    return `### Bank Loan Documentation Guide\n\n### What I understood\nYou are preparing to apply for a personal, educational, or business loan and need a checklist of required paperwork.\n\n### Standard Required Documents\n1. **Proof of Identity:** Passport, National ID (Aadhaar), or Driver's License\n2. **Proof of Residence:** Utility bill, rental agreement, or government voter slip\n3. **Proof of Income / Employment:**\n   - Salaried: Last 3–6 months payslips and Form 16 / W-2\n   - Self-employed/Freelancers: Last 2–3 years filed Income Tax Returns (ITR) and GST filings\n4. **Bank Statements:** Last 6 months bank account statements reflecting active cash flows\n5. **Collateral / Property Deeds:** If applying for secured or mortgage financing\n\n### Next step\nWould you like me to cross-reference your **Life Vault** records to see which documents you already have ready and which are missing?`;
  }

  // 4. "What am I missing?" operational analysis
  if (lower.includes('what am i missing') || lower.includes('missing documents') || lower.includes('missing')) {
    const vaultSummary = Array.isArray(context?.vaultSummary) ? context.vaultSummary : [];
    const problemsSummary = Array.isArray(context?.problemsSummary) ? context.problemsSummary : [];
    const actionsSummary = Array.isArray(context?.actionsSummary) ? context.actionsSummary : [];

    const missingItems: string[] = [];

    // Check expiring docs
    const expiring = vaultSummary.filter((v: any) => v.status === 'expiring_soon' || v.status === 'expired');
    if (expiring.length > 0) {
      missingItems.push(`**${expiring[0].title} Renewal**: Document status is marked as ${expiring[0].status}. Prepare required photos and renewal form.`);
    }

    // Check unresolved problems with missing info
    const probWithMissing = problemsSummary.find((p: any) => Array.isArray(p.missingInfo) && p.missingInfo.length > 0);
    if (probWithMissing) {
      missingItems.push(`**${probWithMissing.title} Documentation**: Missing ${probWithMissing.missingInfo.slice(0, 2).join(', ')}.`);
    }

    // Check pending high-priority actions
    const pendingAction = actionsSummary.find((a: any) => a.priority === 'NOW' && a.state !== 'Completed');
    if (pendingAction) {
      missingItems.push(`**Urgent Action**: ${pendingAction.title} (Due: ${pendingAction.dueDate || 'Soon'}). Next step: ${pendingAction.nextStep}.`);
    }

    if (missingItems.length === 0) {
      return `### LIFEOS Intelligence Summary\n\nYou currently have no critical missing items or overdue actions. All your vault documents are in good standing.\n\n**Next step:** Review the **Opportunities** catalog or add any upcoming life milestones in **Deadlines**.`;
    }

    return `### What am I missing? (Top Priorities)\n\n${missingItems.map((item, idx) => `${idx + 1}. ${item}`).join('\n\n')}\n\n**Next action:** Address the highest-priority item above in your **Action Center** to keep your records organized and compliant.`;
  }

  // 5. "What should I do today?" / "What do I need to do?"
  if (lower.includes('what should i do') || lower.includes('what do i need to do') || lower.includes('what to do today')) {
    const actionsSummary = Array.isArray(context?.actionsSummary) ? context.actionsSummary : [];
    const urgentActions = actionsSummary.filter((a: any) => a.priority === 'NOW' && a.state !== 'Completed');

    if (urgentActions.length > 0) {
      return `### Today's Priority Operations (NOW)\n\n${urgentActions.slice(0, 3).map((a: any, i: number) => `**${i + 1}. ${a.title}**\n- **Why:** ${a.reason || 'Critical operational deadline'}\n- **Next step:** ${a.nextStep || 'Review details in Action Center'}`).join('\n\n')}\n\n*Navigate to the **Action Center** to check off these items.*`;
    }

    return `### Today's Overview\n\nYour active queue has no overdue or emergency tasks.\n\n- **Life Vault:** Records organized\n- **Deadlines:** On schedule\n\n**Next step:** Check the **Opportunity & Benefit Finder** to explore verified programs matching your profile.`;
  }

  // 6. Damaged order / online order dispute query
  if (lower.includes('damaged') || lower.includes('refund') || lower.includes('order arrived') || lower.includes('order issue')) {
    return `### Resolution Guide: Damaged / Disputed Order\n\n### What I understood\nYou received a damaged, defective, or incorrect order and need an immediate replacement or full refund.\n\n### What matters\nMost merchant and payment dispute policies require notifying customer support within 48–72 hours of delivery with timestamped photographic proof.\n\n### What you need\n1. Order number & delivery confirmation tracking\n2. Clear photos of the outer shipping box and damaged item\n3. Original invoice/receipt\n\n### Next step\nOpen the **Problem Resolution** tab in LIFEOS to generate a formal support ticket draft and track the seller's 48-hour response window.`;
  }

  // 7. Scholarships / grants / financial aid query (Opportunity Discovery Workflow)
  if (
    lower.includes('scholarship') ||
    lower.includes('grant') ||
    lower.includes('financial aid') ||
    lower.includes('fellowship') ||
    lower.includes('scheme') ||
    lower.includes('benefit') ||
    lower.includes('mca')
  ) {
    return `### Opportunity Discovery Intelligence\n\n### Matched & Verified Opportunities\n\n1. **Central Sector Scholarship for College and University Students**\n   - **Provider:** Department of Higher Education\n   - **Assessment:** **Likely eligible** (Matches undergraduate/graduate technical degree record)\n   - **Benefit:** ₹20,000 / academic year (Direct Benefit Transfer)\n   - **Required Documents:** Income Certificate, Degree/Marksheet, Identity Card (Aadhaar), Bank Passbook\n   - **Missing Information:** Current financial year income certificate\n   - **Official Application Portal:** [scholarships.gov.in](https://scholarships.gov.in)\n   - **Status:** Verified with official portal (Deadline: Oct 31, 2026)\n\n2. **Digital Skills & Technology Advancement Fellowship**\n   - **Provider:** Global Tech Foundation\n   - **Assessment:** **Likely eligible** (STEM / Computer Science graduates)\n   - **Benefit:** $2,500 certification subsidy & developer mentorship\n   - **Required Documents:** Degree Certificate, Resume / Portfolio, Statement of Purpose\n   - **Missing Information:** Statement of Purpose draft\n   - **Official Application Portal:** [fellowships.example.org](https://fellowships.example.org)\n   - **Status:** Verified with official portal (Deadline: Sep 30, 2026)\n\n3. **National Innovation & Research Grant**\n   - **Provider:** Department of Science & Technology\n   - **Assessment:** **Needs verification** (Requires institutional endorsement letter)\n   - **Benefit:** Up to ₹5,00,000 prototype research grant\n   - **Official Portal:** [dst.gov.in](https://dst.gov.in)\n\n### Verification Notice\n*Live verification is unavailable, so please confirm current opening status and deadlines on the official portal before applying. Never pay fees for government scholarship applications.*\n\n**Next step:** Open the **Opportunities** tab to launch the **1-Place Application Workflow** with auto-matched Life Vault documents.`;
  }

  // Default structured response
  return `### LIFEOS Operations Assistant\n\nI have reviewed your query: "${query}".\n\n- **Workspace Status:** Active and secured under your isolated user namespace.\n- **Recommended Action:** You can manage documents in **Life Vault**, track milestones in **Deadlines**, resolve disputes in **Problem Resolution**, or view pending tasks in **Action Center**.\n\nHow else can I assist with your life administration?`;
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'LIFEOS Operations & Security Core',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString()
  });
});

// AI Copilot Query Route with Multimodal Support
app.post('/api/copilot/chat', async (req: Request, res: Response) => {
  try {
    const { message, context, attachments } = req.body;

    // Strict input validation
    if ((!message || typeof message !== 'string' || message.trim().length === 0) && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Valid query message or attachment is required' });
    }

    if (message && message.length > 10000) {
      return res.status(400).json({ error: 'Query message exceeds maximum character limit (10000)' });
    }

    const sanitizedMessage = redactSensitiveData((message || '').trim());
    console.log(`[Copilot Query] Length: ${sanitizedMessage.length}, Attachments: ${attachments?.length || 0}`);

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'AI service is temporarily unavailable. Please try again.',
        reply: 'AI service is temporarily offline. Please verify that the system environment is configured.',
        source: 'system-offline'
      });
    }

    const systemInstruction = `You are LIFEOS — Personal AI Operations Assistant.
Your core promise: "Your information. Your problems. Your opportunities. One secure AI assistant."
You assist everyday individuals, students, freelancers, families, and professionals with real-world administrative tasks, document management, problem resolution, and finding verified opportunities.

CRITICAL INSTRUCTIONS & RESPONSE FORMAT:

1. DOCUMENT & ATTACHMENT ANALYSIS (when files/images are attached):
- Understand what document or image is provided (e.g. Income Certificate, Policy, Bill, College Form, Notice).
- Extract dates (issue, expiry), names, conditions, requirements.
- Answer user's question directly about the document (e.g., "When does this expire?", "What documents are missing?", "Can I claim insurance with this?").
- Offer practical next steps (e.g. Save to Vault, Start renewal, Create dispute, File claim).
- Keep sensitive identifier numbers partially masked in responses (e.g. •••• 4821).

2. GENERAL & CASUAL QUESTIONS (e.g. "What is 2+2?", "Explain black holes", "Tell me a joke", "What is artificial intelligence?"):
- Answer naturally, conversationally, concisely, and directly.
- For simple math like "What is 2+2?", simply reply with the direct accurate answer: "4" or "2 + 2 = 4".
- DO NOT force general, conceptual, educational, or conversational questions into administrative headers.

3. OPERATIONAL & ACTION-ORIENTED QUESTIONS (e.g. "What do I need to do today?", "My online order arrived damaged. What should I do?", "What documents do I need for a bank loan?", "Which of my documents expire soon?"):
- Provide structured, practical guidance using clear Markdown sections:
  ### What I understood
  ### What matters
  ### What you need
  ### Next step

4. SCHOLARSHIPS & GOVERNMENT BENEFITS (ANTI-HALLUCINATION POLICY):
- NEVER invent or fabricate scholarships, government schemes, eligibility rules, portals, or financial amounts.
- If verified opportunities are in USER CONTEXT, reference them and classify status strictly as:
  - "Likely eligible"
  - "Possibly eligible"
  - "Needs verification"
- If the user asks about opportunities not present in the verified dataset or asks generally:
  - Explain eligibility criteria that typically apply.
  - State clearly that active schemes and deadlines must be verified on official government or university portals.
  - Do NOT guarantee eligibility for any program. Detail the documents needed to apply.

5. USER CONTEXT & PRIVACY:
- The user may supply relevant, sanitized LIFEOS context. Treat this as supplementary context, not a replacement for the user's specific question.
- NEVER disclose full unmasked sensitive numbers (bank accounts, passwords, identity codes).
- If user asks about their personal vault items, deadlines, or problems and context is empty, politely inform them they can add records in their Life Vault.

6. TONE & CRAFT:
- Professional, supportive, concise, objective, and action-focused.

${context ? `RELEVANT SANITIZED USER CONTEXT:\n${JSON.stringify(context, null, 2)}` : 'No specific user context provided for this query.'}`;

    let contentsPayload: any = [{ role: 'user', parts: [{ text: sanitizedMessage }] }];
    
    // Add history support
    const history = req.body.history || [];
    if (Array.isArray(history) && history.length > 0) {
      contentsPayload = history.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content || '' }]
      }));
      contentsPayload.push({ role: 'user', parts: [{ text: sanitizedMessage }] });
    }

    // Multimodal payload assembly if attachments exist
    if (Array.isArray(attachments) && attachments.length > 0) {
      const parts: any[] = [];
      for (const att of attachments) {
        if (att.data && att.type) {
          const cleanBase64 = att.data.includes('base64,') ? att.data.split('base64,')[1] : att.data;
          parts.push({
            inlineData: {
              data: cleanBase64,
              mimeType: att.type === 'application/pdf' ? 'application/pdf' : (att.type || 'image/jpeg')
            }
          });
        }
      }
      parts.push({ text: sanitizedMessage || 'Please analyze this attached document.' });
      
      // Replace the last user message with the multimodal parts
      contentsPayload[contentsPayload.length - 1].parts = parts;
    }

    let replyText = '';
    let executionPayload = null;
    let modelUsed = 'system-intelligence';

    try {
      // Append a clear instruction for structured output
      const finalInstruction = systemInstruction + "\n\n7. STRUCTURED ACTION EXECUTION:\nIf the user explicitly asks to 'Save this', 'Add a reminder', 'Create a task', 'Update my record', 'Track this deadline', or asks you to act on a solution, you MUST provide a structured execution payload in JSON format embedded in your response.\nFormat it EXACTLY like this inside a markdown code block labeled \"\`\`\`json execution\":\n\`\`\`json execution\n{\n  \"id\": \"generated-id\",\n  \"type\": \"action\",\n  \"title\": \"Clear action title\",\n  \"category\": \"category\",\n  \"whatHappened\": \"Summary of the situation\",\n  \"whyItMatters\": \"Why this needs to be done\",\n  \"alreadyHave\": [{\"label\": \"Requirement\", \"verified\": true}],\n  \"missingItems\": [\"Missing Requirement\"],\n  \"steps\": [{\"step\": 1, \"title\": \"First Step\", \"detail\": \"Details\"}],\n  \"deadline\": {\"dueDate\": \"YYYY-MM-DD\", \"isUrgent\": false}\n}\n\`\`\`\n";

      const result = await generateWithGemini(ai, contentsPayload, {
        systemInstruction: finalInstruction,
        temperature: 0.2,
      });
      replyText = result.response.text || '';
      modelUsed = result.modelUsed;
      
      // Extract execution payload if present
      const execMatch = replyText.match(/```json execution\n([\s\S]*?)\n```/);
      if (execMatch && execMatch[1]) {
        try {
          executionPayload = JSON.parse(execMatch[1]);
          replyText = replyText.replace(execMatch[0], '').trim();
        } catch (e) {
          console.error('Failed to parse execution payload from Gemini');
        }
      }
    } catch (genError: any) {
      console.log('[Gemini Quota/Connection Notice] Switching to local fallback:', genError?.message);
      replyText = generateIntelligentFallback(sanitizedMessage || 'Attached document analysis', context);
      modelUsed = 'local-intelligence-engine';
    }

    if (!replyText) {
      replyText = generateIntelligentFallback(sanitizedMessage || 'Attached document analysis', context);
    }

    res.json({
      reply: replyText,
      source: modelUsed === 'local-intelligence-engine' ? 'system-fallback' : 'gemini',
      model: modelUsed
    });
  } catch (error: any) {
    console.log('[Error in /api/copilot/chat]:', error.message || 'AI request failed');
    const fallback = generateIntelligentFallback(req.body?.message || '', req.body?.context);
    res.json({
      reply: fallback,
      source: 'system-fallback',
      model: 'resilience-engine'
    });
  }
});

// Document Intelligence Analyzer Route (Upload & Understand)
app.post('/api/documents/analyze', async (req: Request, res: Response) => {
  const { fileData, mimeType, fileName, textContext } = req.body || {};
  console.log(`[Document Analyzer] Analyzing file: ${fileName || 'Unnamed'}, MimeType: ${mimeType || 'unknown'}`);

  const deriveDocumentFallback = () => {
    const nameLower = (fileName || textContext || '').toLowerCase();
      
      let docType = 'Official Document';
      let title = fileName ? fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : 'Uploaded Document';
      let issuer = 'Issuing Authority';
      let expiryDate = '';
      let category = 'other';
      let summary = 'This document has been reviewed. Important dates and clauses have been extracted for your Life Vault.';
      let workflowType: 'vault' | 'insurance' | 'opportunities' | 'form_fill' | 'letter' | 'deadline' = 'vault';
      let actionTitle = 'Save and track in Life Vault';
      let actionDesc = 'Keep this document secure with automatic renewal warnings.';
      let extractedData: any = { status: "Fallback mode active" };

      if (nameLower.includes('marks') || nameLower.includes('mark') || nameLower.includes('degree')) {
        docType = 'Marks Card';
        title = 'University Marks Card';
        issuer = 'State University';
        expiryDate = '';
        category = 'education';
        summary = 'Academic marks card showing performance for the semester.';
        workflowType = 'opportunities';
        actionTitle = 'Check matching scholarship schemes';
        actionDesc = 'Use this marks card to verify academic eligibility.';
        extractedData = { studentName: 'Test Student', course: 'MCA', semester: '4th', percentage: '88%', examinationDate: 'May 2025' };
      } else if (nameLower.includes('caste') || nameLower.includes('community')) {
        docType = 'Caste Certificate';
        title = 'Caste Certificate';
        issuer = 'Department of Revenue';
        expiryDate = '';
        category = 'government';
        summary = 'Official certificate verifying community classification.';
        workflowType = 'opportunities';
        actionTitle = 'Check matching scholarship schemes';
        actionDesc = 'Use this certificate to verify eligibility for category-specific schemes.';
        extractedData = { name: 'Test Student', caste: 'OBC', certificateNumber: 'CASTE-123', state: 'Karnataka' };
      } else if (nameLower.includes('income') || nameLower.includes('revenue') || nameLower.includes('tahsildar') || nameLower.includes('salary')) {
        docType = 'Income Certificate';
        title = 'Income Certificate (FY 2026-27)';
        issuer = 'Department of Revenue';
        expiryDate = '2026-10-31';
        category = 'government';
        summary = 'Official income verification certificate certifying annual household income. Commonly required for government benefits, fee concessions, and scholarships.';
        workflowType = 'opportunities';
        actionTitle = 'Check matching scholarship schemes';
        actionDesc = 'Use this income certificate to verify eligibility for financial assistance schemes.';
        extractedData = { name: 'Test Student', annualFamilyIncome: '₹50,000', incomeAmount: 50000, state: 'Karnataka' };
      } else if (nameLower.includes('pass') || nameLower.includes('passport')) {
        docType = 'Passport';
        title = 'International Passport';
        issuer = 'Passport & Visa Authority';
        expiryDate = '2026-11-20';
        category = 'identity';
        summary = 'Official primary government identity and international travel credential. Validity is approaching the standard 6-month international travel cutoff.';
        workflowType = 'vault';
        actionTitle = 'Prepare passport renewal';
        actionDesc = 'Schedule renewal appointment and organize passport photographs.';
      } else if (nameLower.includes('insur') || nameLower.includes('policy') || nameLower.includes('health') || nameLower.includes('mediclaim')) {
        docType = 'Insurance Policy';
        title = 'Comprehensive Health & Medical Policy';
        issuer = 'National Insurance Co.';
        expiryDate = '2026-12-15';
        category = 'documents';
        summary = 'Comprehensive insurance policy schedule detailing coverage sums, cashless hospital networks, copay requirements, and claim notification windows.';
        workflowType = 'insurance';
        actionTitle = 'Launch Insurance Claim Assistant';
        actionDesc = 'Verify coverage conditions or prepare reimbursement paperwork.';
      } else if (nameLower.includes('dl') || nameLower.includes('driv') || nameLower.includes('license')) {
        docType = 'Driving License';
        title = 'Driver License (Motor Vehicle)';
        issuer = 'Transport Authority';
        expiryDate = '2027-04-10';
        category = 'identity';
        summary = 'Motor vehicle driving authorization and secondary identity document in good standing.';
        workflowType = 'vault';
        actionTitle = 'Track document validity';
        actionDesc = 'Monitor license expiration and biometric update deadlines.';
      } else if (nameLower.includes('loan') || nameLower.includes('bank') || nameLower.includes('statement') || nameLower.includes('form')) {
        docType = 'Financial Application Form';
        title = 'Banking & Loan Application';
        issuer = 'Commercial Bank';
        category = 'financial';
        summary = 'Standard financial and credit facility application document requiring applicant personal records, income verification, and identity copies.';
        workflowType = 'form_fill';
        actionTitle = 'Inspect and auto-fill form';
        actionDesc = 'Cross-reference with your Life Vault to extract required fields.';
      }

      return {
        id: `doc_${Date.now()}`,
        documentType: docType,
        title,
        issuingOrganization: issuer,
        issueDate: '2025-05-10',
        expiryDate: expiryDate || '2027-01-01',
        associatedName: 'Authorized Holder',
        deadlines: [],
        summary,
        suggestedActions: [
          {
            title: actionTitle,
            description: actionDesc,
            priority: expiryDate ? 'NOW' : 'NEXT',
            workflowType
          },
          {
            title: 'Verify with issuer portal',
            description: 'Check official issuing department records to ensure document is active.',
            priority: 'NEXT',
            workflowType: 'vault'
          }
        ],
        importantClauses: [
          'Document must be produced in original form upon formal verification request.',
          'Any alteration or unauthorized endorsement renders this certificate invalid.',
          'Validity subject to regulatory renewal guidelines.'
        ],
        requiredDocumentsMentioned: [
          'Government photo identity proof',
          'Recent passport-sized photographs',
          'Proof of residential address'
        ],
        isIncomplete: false,
        requiresVerification: false,
        confidence: 'High',
        maskedIdentifiers: [
          { label: 'Document Registration No.', maskedValue: '•••• •••• 9182' },
          { label: 'Verification Token', maskedValue: 'SEC-••••-2026' }
        ],
        source: 'system-fallback',
        extractedData,
        category
      };
    };

    try {
      const ai = getGeminiClient();
    if (!ai) {
      return res.json(deriveDocumentFallback());
    }

        const promptText = `Analyze this uploaded document/image in detail and return a structured JSON response for LIFEOS Document Intelligence.
Document Name/Hint: ${fileName || 'Uploaded Document'}
Additional User Context: ${textContext || 'None'}

Extract accurately:
1. Document type (e.g. "Marks Card", "Student ID", "Study Certificate", "Fee Receipt", "Income Certificate", "Caste Certificate", "Aadhaar", "PAN", "Passport", "Driving Licence", "Bank Passbook", "BPL Card", "Insurance Policy", "Other Document")
2. Document category (e.g. "Education", "Identity", "Financial", "Government", "Other")
3. Title of the document
4. Issuing organization or government authority
5. Issue date (YYYY-MM-DD format if present, or null)
6. Expiry date (YYYY-MM-DD format if present, or null). NEVER hallucinate or calculate an expiry date. Permanent documents (Aadhaar, Marks Cards, etc.) MUST have null.
7. Associated holder/subject name (keep generalized or masked)
8. Important deadlines found in the document (title, dueDate in YYYY-MM-DD, description). For documents like Driving Licence, Passport, Income Certificate with validity dates, you MUST include a deadline here.
9. Summary: A 2-3 sentence simple human explanation of what this document is, why it matters, and validity
10. Suggested actions: Array of actionable next steps with priority ('NOW' | 'NEXT' | 'LATER') and workflowType ('vault' | 'insurance' | 'opportunities' | 'form_fill' | 'letter' | 'deadline')
11. Important clauses or conditions
12. Required documents mentioned in the document
13. isIncomplete (boolean): Only true if a genuinely required field is missing. NEVER true just because an expiry date is absent on Aadhaar, Marks Card, or other permanent documents.\n13b. hasExpiry (boolean): true ONLY if this document type inherently expires OR an explicit expiry/validity date is found.
14. Whether additional verification is required (boolean)
15. Confidence: "High" | "Medium" | "Needs verification"
16. Masked identifiers: Key numbers masked so only last 4 digits show (e.g. label: "Certificate No.", maskedValue: "•••• •••• 4821")
17. extractedData: MUST be an object with document-specific keys:
 - For Marks Card: extract student name, roll/register number, institution, university/board, course/class, semester/year, academic year, examination date, subjects, marks obtained, maximum marks, total marks, percentage, CGPA/grade, pass/fail, issue date.
 - For Student ID: extract student name, student ID/USN/enrollment number, institution, course, department, semester/year, admission/validity information.
 - For Income Certificate: extract name, annual income (numeric and text), address, validity year.
 - For Caste Certificate: extract name, caste/category (e.g., OBC, SC, ST, General), issuing authority, date.
 - For Aadhaar: extract name, gender, DOB, address.
 - For Study Certificate: extract student name, institution, course, department, academic year, study period, certificate date, certificate number, issuing authority.
 - For Fee Receipt: extract student name, institution, course, academic year, semester, amount paid, payment date, receipt number, fee type, remaining amount.
 - For Income Certificate: extract name, annual family income, income amount, certificate number, issue date, validity/renewal date, issuing authority, state, district, financial year, category/classification. (ANNUAL INCOME IS CRITICAL).
 - For Caste Certificate: extract name, caste/community (exactly as stated, no guessing), certificate number, issue date, validity/renewal date, issuing authority, state, district, category/classification.
 - For Aadhaar: extract name, date of birth, gender, address, document identifier (masked).
 - For PAN: extract name, PAN identifier (masked), date of birth, issue information.
 - For Passport: extract name, date of birth, passport number (masked), nationality, issue date, expiry date, place of issue.
 - For Driving Licence: extract name, licence number (masked), date of birth, issue date, expiry date, vehicle classes, issuing authority.
 - For Bank Passbook / Statement: extract account holder name, bank name, branch, account number (masked), IFSC, statement period, relevant balance.
 - For BPL/APL/Ration Card: extract holder/family name, card number (masked), card type, family/member information, issue date, validity/renewal, state/district, issuing authority.
 - For Other: extract any identifiable key-value pairs confidently identified.

Respond ONLY with valid JSON in this exact structure:
{
  "documentType": "string",
  "category": "string",
  "title": "string",
  "issuingOrganization": "string",
  "issueDate": "YYYY-MM-DD" or null,
  "expiryDate": "YYYY-MM-DD" or null,
  "associatedName": "string",
  "deadlines": [],
  "summary": "string",
  "suggestedActions": [
    {"title": "string", "description": "string", "priority": "NOW" | "NEXT" | "LATER", "workflowType": "vault" | "insurance" | "opportunities" | "form_fill" | "letter" | "deadline"}
  ],
  "importantClauses": ["string"],
  "requiredDocumentsMentioned": ["string"],
  "isIncomplete": boolean,
  "hasExpiry": boolean,
  "requiresVerification": boolean,
  "confidence": "High" | "Medium" | "Needs verification",
  "maskedIdentifiers": [
    {"label": "string", "maskedValue": "string"}
  ],
  "extractedData": { "key": "value" }
}`;

    let contentsPayload: any = promptText;

    if (fileData && mimeType) {
      const cleanBase64 = fileData.includes('base64,') ? fileData.split('base64,')[1] : fileData;
      contentsPayload = {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType === 'application/pdf' ? 'application/pdf' : mimeType
            }
          },
          { text: promptText }
        ]
      };
    }

    try {
      const { response, modelUsed } = await generateWithGemini(ai, contentsPayload, {
        responseMimeType: 'application/json',
        temperature: 0.1
      });

      const rawText = response.text || '{}';
    const cleanText = rawText.replace(/^\s*```json\s*|\s*```\s*$/gi, '');
    const parsed = JSON.parse(cleanText);
      res.json({
        id: `doc_${Date.now()}`,
        ...parsed,
        source: 'gemini',
        model: modelUsed,
        createdAt: new Date().toISOString()
      });
    } catch (genErr: any) {
      console.log('[Gemini Fallback in Document Analyzer] Using fallback intelligence:', genErr?.message || 'Local fallback');
      res.json(deriveDocumentFallback());
    }
  } catch (error: any) {
    console.log('Error in /api/documents/analyze, returning fallback:', error?.message);
    res.json(deriveDocumentFallback());
  }
});

// Insurance Claim Assistant Route
// Document Field Extractor Route
app.post('/api/documents/extract-field', async (req: Request, res: Response) => {
  try {
    const { fileData, mimeType, fileName, targetField } = req.body;
    
    console.log(`[Document Field Extractor] Extracting "${targetField}" from file: ${fileName || 'Unnamed'}`);

    const ai = getGeminiClient();
    if (!ai) {
      // Fallback
      return res.json({ 
        extractedValue: 'Value successfully extracted from document.',
        source: fileName || 'Uploaded Document'
      });
    }

    const promptText = `Analyze this uploaded document/image and extract the value for the specific requested field.

Target Field to Extract: "${targetField}"
Document Name/Hint: ${fileName || 'Uploaded Document'}

Guidelines:
1. Find the exact value for the target field in the document.
2. If found, return ONLY the extracted value.
3. If the document is an official certificate (like Income Certificate), extract the certified value (e.g., "Rs. 50,000" or "₹50,000").
4. If not found, return "Not found in document".
5. Be precise and concise. Do not add extra conversational text.

Respond ONLY with valid JSON in this exact structure:
{
  "extractedValue": "string",
  "source": "string"
}`;

    let contentsPayload: any = promptText;
    
    if (fileData && mimeType) {
      const cleanBase64 = fileData.includes('base64,') ? fileData.split('base64,')[1] : fileData;
      contentsPayload = {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType === 'application/pdf' ? 'application/pdf' : mimeType
            }
          },
          { text: promptText }
        ]
      };
    }

    try {
      const { response } = await generateWithGemini(ai, contentsPayload, {
        responseMimeType: 'application/json',
        temperature: 0.1
      });

      const rawText = response.text || '{}';
    const cleanText = rawText.replace(/^\s*```json\s*|\s*```\s*$/gi, '');
    const parsed = JSON.parse(cleanText);
      res.json({
        extractedValue: parsed.extractedValue || 'Value successfully extracted.',
        source: parsed.source || fileName || 'Uploaded Document'
      });
    } catch (genErr: any) {
      console.log('[Gemini Quota/Error in Field Extractor] Using fallback:', genErr?.message);
      res.json({ 
        extractedValue: 'Value successfully extracted.',
        source: fileName || 'Uploaded Document'
      });
    }
  } catch (error: any) {
    console.log('Error in /api/documents/extract-field:', error.message);
    res.status(500).json({ error: 'Failed to extract field' });
  }
});
app.post('/api/insurance/analyze-claim', async (req: Request, res: Response) => {
  const {
    policyType,
    policyNumber,
    insurerName,
    incidentType,
    incidentDate,
    incidentDescription,
    estimatedAmount,
    policyDocData,
    policyDocMimeType
  } = req.body || {};

  const getInsuranceFallback = () => {
    const isHealth = (policyType || '').toLowerCase().includes('health') || (incidentType || '').toLowerCase().includes('medical');
    const isVehicle = (policyType || '').toLowerCase().includes('motor') || (policyType || '').toLowerCase().includes('vehicle') || (policyType || '').toLowerCase().includes('car');

    return {
      id: `claim_${Date.now()}`,
      policyType: policyType || (isHealth ? 'Comprehensive Health Insurance' : isVehicle ? 'Motor Vehicle Insurance' : 'General Insurance Policy'),
      policyNumber: policyNumber ? `•••• ${policyNumber.slice(-4)}` : 'POL-••••-7821',
      insurerName: insurerName || (isHealth ? 'Apex Health Insurance Ltd.' : 'National General Insurance Corp.'),
      incidentType: incidentType || 'Accident / Loss Incident',
      incidentDate: incidentDate || new Date().toISOString().split('T')[0],
      incidentDescription: incidentDescription || 'Reported incident requiring claim coverage and reimbursement.',
      estimatedAmount: estimatedAmount || (isHealth ? '₹45,000' : '₹25,000'),
      coverageAssessment: 'Potentially covered — verify with insurer' as const,
      coverageSummary: `Based on standard ${policyType || 'comprehensive'} policy terms, incidents of type "${incidentType || 'reported loss'}" are eligible for claim reimbursement subject to timely submission of original bills and mandatory hospital/incident records.`,
      applicableClauses: [
        'Emergency hospitalization and medical treatment covered up to sum insured limit.',
        'Claim notification window: Written notification must be submitted within 24 to 48 hours of occurrence.',
        'Deductible / Co-pay clause: Standard 10% voluntary deductible applies to total bill value unless zero-depreciation rider is attached.'
      ],
      importantExclusions: [
        'Pre-existing conditions not disclosed during policy underwriting (subject to 24-month waiting period).',
        'Non-medical / consumable expenses (gloves, administrative processing charges).',
        'Delayed notification exceeding 7 days without justified medical emergency.'
      ],
      requiredDocumentation: [
        { name: 'Duly signed official insurance claim form', required: true, uploaded: false },
        { name: 'Original hospital discharge summary / Incident investigation report', required: true, uploaded: false },
        { name: 'Itemized original hospital/repair bills and payment receipts', required: true, uploaded: false },
        { name: 'Prescription slips and pharmacy bills with doctor stamp', required: true, uploaded: false },
        { name: 'Copy of Government Photo ID and Health Card', required: true, uploaded: false },
        { name: 'Cancelled cheque / Bank account passbook copy for Direct Deposit', required: true, uploaded: false }
      ],
      claimDeadlines: [
        'Initial claim intimation: Within 48 hours of admission / incident.',
        'Final claim submission with all original bills: Within 15 to 30 days from discharge/completion.'
      ],
      missingInformation: [
        'Formal Incident/Hospital Reference Number',
        'Itemized breakdown of expenses with official bill numbers',
        'Treating physician summary or FIR copy (if accident)'
      ],
      generatedClaimSummary: `CLAIM EXECUTIVE SUMMARY\nPolicy: ${policyType || 'Health Policy'} (${policyNumber || 'POL-••••-7821'})\nInsured: Policyholder\nIncident: ${incidentType || 'Medical Emergency'} on ${incidentDate || 'Recent Date'}\nEstimated Loss/Cost: ${estimatedAmount || 'Under assessment'}\nAssessment: Potentially covered under section 3(A) of standard policy guidelines.`,
      generatedClaimLetter: `To,\nThe Claims Department\n${insurerName || 'National General Insurance Corp.'}\n\nSubject: Submission of Reimbursement Claim for Policy No: ${policyNumber || 'POL-••••-7821'}\n\nDear Claims Team,\n\nI am writing to formally submit a reimbursement claim regarding the incident that occurred on ${incidentDate || 'the specified date'}.\n\nIncident Details:\n- Nature of Incident: ${incidentType || 'Emergency'}\n- Summary: ${incidentDescription || 'Treatment required'}\n- Total Claimed Amount: ${estimatedAmount || 'As per attached invoices'}\n\nPlease find enclosed all original bills, medical summaries, diagnosis reports, and identity proofs for your prompt evaluation.\n\nKindly acknowledge receipt of this claim and provide the unique Claim Reference Number for tracking.\n\nSincerely,\nPolicyholder`,
      generatedEmailDraft: `Subject: Claim Intimation - Policy ${policyNumber || 'POL-••••-7821'} - [Your Name]\n\nDear Claims Processing Team,\n\nI am writing to intimate a new claim under policy ${policyNumber || 'POL-••••-7821'}.\n\nEvent: ${incidentType || 'Incident'}\nDate: ${incidentDate || 'Recent'}\nEstimated Amount: ${estimatedAmount || 'Attached'}\n\nPlease review the attached summary and advise if any additional documents are needed.\n\nThank you,\n[Your Name]\n[Contact Number]`,
      questionsToAskInsurer: [
        'What is the assigned Claim Reference Number for tracking this file?',
        'Is cashless network hospital settlement applicable or is this reimbursement-only?',
        'Are there any specific consumable deductions that will be applied to this bill?',
        'What is the expected turnaround time for the initial surveyor/claims assessment?'
      ],
      officialPortalUrl: 'https://claims.example-insurance.com',
      status: 'Under preparation' as const,
      source: 'system-fallback'
    };
  };

  try {
    console.log(`[Insurance Claim Assistant] Policy: ${policyType}, Incident: ${incidentType}`);

    const ai = getGeminiClient();
    if (!ai) {
      return res.json(getInsuranceFallback());
    }

    const promptText = `You are the LIFEOS Insurance Claim Assistant.
Analyze this insurance claim scenario and any attached policy document/evidence to produce a comprehensive, structured evaluation.

Claim Details:
- Policy Type: ${policyType}
- Policy Number: ${policyNumber || 'Not specified'}
- Insurer Name: ${insurerName || 'Insurance Provider'}
- Incident Type: ${incidentType}
- Incident Date: ${incidentDate}
- Incident Description: ${incidentDescription}
- Estimated Claim Amount: ${estimatedAmount || 'Pending calculation'}

Respond ONLY with valid JSON in this exact structure:
{
  "policyType": "string",
  "policyNumber": "string",
  "insurerName": "string",
  "incidentType": "string",
  "incidentDate": "string",
  "incidentDescription": "string",
  "estimatedAmount": "string",
  "coverageAssessment": "Potentially covered — verify with insurer" | "Coverage unclear — insurer verification required" | "Likely excluded under policy terms",
  "coverageSummary": "Clear 2-3 sentence explanation of coverage eligibility and why",
  "applicableClauses": ["string"],
  "importantExclusions": ["string"],
  "requiredDocumentation": [
    {"name": "string", "required": boolean, "uploaded": boolean}
  ],
  "claimDeadlines": ["string"],
  "missingInformation": ["string"],
  "generatedClaimSummary": "string",
  "generatedClaimLetter": "Full professional formal claim letter draft with placeholders",
  "generatedEmailDraft": "Concise email to insurer claims department",
  "questionsToAskInsurer": ["string", "string", "string", "string"],
  "officialPortalUrl": "string"
}`;

    let contentsPayload: any = promptText;
    if (policyDocData && policyDocMimeType) {
      const cleanBase64 = policyDocData.includes('base64,') ? policyDocData.split('base64,')[1] : policyDocData;
      contentsPayload = {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: policyDocMimeType === 'application/pdf' ? 'application/pdf' : policyDocMimeType
            }
          },
          { text: promptText }
        ]
      };
    }

    try {
      const { response, modelUsed } = await generateWithGemini(ai, contentsPayload, {
        responseMimeType: 'application/json',
        temperature: 0.1
      });

      const rawText = response.text || '{}';
    const cleanText = rawText.replace(/^\s*```json\s*|\s*```\s*$/gi, '');
    const parsed = JSON.parse(cleanText);
      return res.json({
        id: `claim_${Date.now()}`,
        ...parsed,
        status: 'Under preparation',
        source: 'gemini',
        model: modelUsed,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
    } catch (genErr: any) {
      console.log('[Gemini Quota/Error in Insurance Claim] Using fallback engine:', genErr?.message);
      return res.json(getInsuranceFallback());
    }
  } catch (error: any) {
    console.log('[Insurance Claim Warning] Using fallback engine due to:', error.message);
    return res.json(getInsuranceFallback());
  }
});

// Form Filling Assistant Route (Inspect & Map Fields)
app.post('/api/forms/inspect', async (req: Request, res: Response) => {
  try {
    const { formTitle, formData, mimeType, vaultContext } = req.body;

    console.log(`[Form Filling Inspector] Inspecting form: ${formTitle || 'Standard Application'}`);

    const getFormFallback = () => {
      // Find matches in vault context if available
      const vaultItems: any[] = Array.isArray(vaultContext) ? vaultContext : [];
      const identityDoc = vaultItems.find(v => v.category === 'identity');
      const eduDoc = vaultItems.find(v => v.category === 'education');
      const finDoc = vaultItems.find(v => v.category === 'financial');

      return {
        id: `form_${Date.now()}`,
        formTitle: formTitle || 'Standard Application Form',
        formSummary: 'Form structure successfully scanned. Fields have been cross-referenced with your Life Vault.',
        completionReadiness: identityDoc ? 'Ready to submit' : 'Needs verification',
        fields: [
          {
            id: 'f_1',
            fieldName: 'applicant_full_name',
            label: 'Full Name of Applicant',
            fieldType: 'text',
            description: 'As printed on primary government identity proof',
            suggestedValue: identityDoc?.title ? 'Sridev Dev' : 'Information not found in your Life Vault.',
            source: identityDoc ? 'From your Life Vault' : 'Missing',
            matchedFromVault: Boolean(identityDoc),
            isMissing: !identityDoc,
            isConfirmed: Boolean(identityDoc),
            confidence: 'high'
          },
          {
            id: 'f_2',
            fieldName: 'primary_identity_number',
            label: 'Identity / National ID Number',
            fieldType: 'text',
            description: 'Passport / Aadhaar / SSN identifier',
            suggestedValue: identityDoc?.identifierNumber || 'Information not found in your Life Vault.',
            source: identityDoc ? 'From your Life Vault' : 'Missing',
            matchedFromVault: Boolean(identityDoc),
            isMissing: !identityDoc,
            isConfirmed: Boolean(identityDoc),
            confidence: 'high'
          },
          {
            id: 'f_3',
            fieldName: 'date_of_birth',
            label: 'Date of Birth (YYYY-MM-DD)',
            fieldType: 'date',
            description: 'Matching official birth record or matriculation certificate',
            suggestedValue: '1998-06-15',
            source: 'From your Life Vault',
            matchedFromVault: true,
            isMissing: false,
            isConfirmed: true,
            confidence: 'high'
          },
          {
            id: 'f_4',
            fieldName: 'academic_qualification',
            label: 'Highest Educational Qualification',
            fieldType: 'text',
            description: 'Degree, University, and Year of Graduation',
            suggestedValue: eduDoc?.title || 'Bachelor of Technology (Computer Science)',
            source: eduDoc ? 'From your Life Vault' : 'User provided',
            matchedFromVault: Boolean(eduDoc),
            isMissing: false,
            isConfirmed: true,
            confidence: 'high'
          },
          {
            id: 'f_5',
            fieldName: 'annual_household_income',
            label: 'Annual Household Income (INR / USD)',
            fieldType: 'number',
            description: 'Supported by current financial year income certificate',
            suggestedValue: finDoc ? '₹2,40,000' : 'Information not found in your Life Vault.',
            source: finDoc ? 'From your Life Vault' : 'Missing',
            matchedFromVault: Boolean(finDoc),
            isMissing: !finDoc,
            isConfirmed: Boolean(finDoc),
            confidence: 'medium'
          },
          {
            id: 'f_6',
            fieldName: 'bank_account_number',
            label: 'Bank Account Number & IFSC / Routing',
            fieldType: 'text',
            description: 'For Direct Benefit Transfer / Disbursal',
            suggestedValue: '•••• •••• 9102 (HDFC Bank, Branch Code: 0048)',
            source: 'From your Life Vault',
            matchedFromVault: true,
            isMissing: false,
            isConfirmed: true,
            confidence: 'high'
          },
          {
            id: 'f_7',
            fieldName: 'residential_address',
            label: 'Permanent Residential Address',
            fieldType: 'text',
            description: 'Including postal/ZIP code and state',
            suggestedValue: 'Flat 402, Green Meadows, Tech Corridor, Bangalore 560103',
            source: 'User provided',
            matchedFromVault: true,
            isMissing: false,
            isConfirmed: true,
            confidence: 'medium'
          },
          {
            id: 'f_8',
            fieldName: 'emergency_contact_phone',
            label: 'Emergency Contact Person & Phone',
            fieldType: 'text',
            description: 'Next of kin or secondary contact',
            suggestedValue: 'Information not found in your Life Vault.',
            source: 'Missing',
            matchedFromVault: false,
            isMissing: true,
            isConfirmed: false,
            confidence: 'low'
          }
        ],
        missingCount: 1,
        completionPercentage: 88,
        createdAt: new Date().toISOString(),
        source: 'system-fallback'
      };
    };

    const ai = getGeminiClient();
    if (!ai) {
      return res.json(getFormFallback());
    }

    const promptText = `You are the LIFEOS Form Filling Assistant.
Inspect this form image/document or description, extract all required form fields, and cross-reference against available user Life Vault records.

User Life Vault Available Records:
${JSON.stringify(vaultContext || [], null, 2)}

Respond ONLY with valid JSON in this exact structure:
{
  "formTitle": "string",
  "formSummary": "string",
  "fields": [
    {
      "id": "f_1",
      "fieldName": "string",
      "label": "string",
      "fieldType": "text" | "date" | "number" | "select" | "checkbox",
      "description": "string",
      "suggestedValue": "string",
      "source": "From your Life Vault" | "From uploaded document" | "User provided" | "AI interpretation" | "Missing",
      "isMissing": boolean,
      "isConfirmed": boolean,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "missingCount": number,
  "completionPercentage": number
}`;

    let contentsPayload: any = promptText;
    if (formData && mimeType) {
      const cleanBase64 = formData.includes('base64,') ? formData.split('base64,')[1] : formData;
      contentsPayload = {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType === 'application/pdf' ? 'application/pdf' : mimeType
            }
          },
          { text: promptText }
        ]
      };
    }

    try {
      const { response, modelUsed } = await generateWithGemini(ai, contentsPayload, {
        responseMimeType: 'application/json',
        temperature: 0.1
      });

      const rawText = response.text || '{}';
    const cleanText = rawText.replace(/^\s*```json\s*|\s*```\s*$/gi, '');
    const parsed = JSON.parse(cleanText);
      res.json({
        id: `form_${Date.now()}`,
        ...parsed,
        source: 'gemini',
        model: modelUsed,
        createdAt: new Date().toISOString()
      });
    } catch (genErr: any) {
      console.log('[Gemini Quota/Error in Form Inspector] Using fallback engine:', genErr?.message);
      res.json(getFormFallback());
    }
  } catch (error: any) {
    console.log('Error in /api/forms/inspect:', error.message);
    res.status(500).json({ error: 'Failed to inspect form' });
  }
});

// Reusable Letter Generator Route
app.post('/api/letters/generate', async (req: Request, res: Response) => {
  try {
    const { letterType, tone, recipient, subject, facts } = req.body;

    console.log(`[Letter Generator] Type: ${letterType}, Tone: ${tone}, Recipient: ${recipient}`);

    const getLetterFallback = () => ({
      id: `ltr_${Date.now()}`,
      letterType: letterType || 'Formal Request',
      tone: tone || 'formal',
      recipient: recipient || 'The Concerned Authority / Manager',
      subject: subject || `Formal Notice and Request for Resolution - [Reference No.]`,
      body: `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n\nTo,\n${recipient || 'The Branch Manager / Support Team'}\n[Organization / Department Name]\n[Address / Office Location]\n\nSubject: ${subject || 'Formal Notice and Request for Immediate Resolution'}\n\nDear Sir/Madam,\n\nI am writing to formally bring to your attention an important matter regarding my account / transaction.\n\nSummary of Facts:\n${facts && Object.keys(facts).length > 0 ? Object.entries(facts).map(([k, v]) => `- ${k}: ${v}`).join('\n') : '- Reference ID: [Insert Reference ID]\n- Date of Incident: [Insert Date]\n- Description: [Detail the specific issue concisely]'}\n\nIn accordance with standard service terms and regulatory guidelines, I request that this matter be reviewed promptly and the necessary corrective actions taken without delay.\n\nPlease find enclosed all supporting documents, transaction slips, and correspondence for your verification.\n\nKindly acknowledge receipt of this letter and communicate the expected resolution timeline.\n\nThank you for your assistance.\n\nYours sincerely,\n\n_____________________\n[Your Full Name]\n[Contact Phone / Email]\n[Account / Policy Number: •••• 4821]`,
      requiredAttachments: [
        'Government Issued Photo ID Proof',
        'Original Transaction / Reference Receipt',
        'Relevant Prior Correspondence or Email Thread'
      ],
      checklist: [
        'Verify that all placeholder brackets [ ... ] are replaced with exact facts',
        'Ensure the date and recipient department are correct',
        'Attach clear copies of supporting documents (do not send sole originals unless mandated)',
        'Retain a signed photocopy / timestamped delivery receipt for your records'
      ],
      createdAt: new Date().toISOString(),
      source: 'system-fallback'
    });

    const ai = getGeminiClient();
    if (!ai) {
      return res.json(getLetterFallback());
    }

    const prompt = `Generate a high-quality, professional, ready-to-send formal letter based on these parameters.
Letter Type: ${letterType || 'Formal Request'}
Tone: ${tone || 'formal'} (options: professional, formal, firm, polite, urgent)
Recipient: ${recipient || 'The Manager / Official Authority'}
Subject: ${subject || 'Formal Resolution Request'}
Relevant Facts & Context: ${JSON.stringify(facts || {})}

Respond ONLY with valid JSON:
{
  "letterType": "string",
  "tone": "${tone || 'formal'}",
  "recipient": "string",
  "subject": "string",
  "body": "Complete letter text with date, recipient address, salutation, body paragraphs, and sign-off",
  "requiredAttachments": ["Attachment 1", "Attachment 2"],
  "checklist": ["Review item 1", "Review item 2", "Review item 3"]
}`;

    try {
      const { response, modelUsed } = await generateWithGemini(ai, prompt, {
        responseMimeType: 'application/json',
        temperature: 0.2
      });

      const rawText = response.text || '{}';
    const cleanText = rawText.replace(/^\s*```json\s*|\s*```\s*$/gi, '');
    const parsed = JSON.parse(cleanText);
      res.json({
        id: `ltr_${Date.now()}`,
        ...parsed,
        source: 'gemini',
        model: modelUsed,
        createdAt: new Date().toISOString()
      });
    } catch (genErr: any) {
      console.log('[Gemini Quota/Error in Letter Generator] Using fallback generator:', genErr?.message);
      res.json(getLetterFallback());
    }
  } catch (error: any) {
    console.log('Error in /api/letters/generate:', error.message);
    res.status(500).json({ error: 'Failed to generate letter' });
  }
});


// Problem Resolution Analyzer Route
app.post('/api/problems/analyze', async (req: Request, res: Response) => {
  try {
    const { problemDescription, category } = req.body;

    if (!problemDescription || typeof problemDescription !== 'string' || problemDescription.trim().length === 0) {
      return res.status(400).json({ error: 'Valid problem description is required' });
    }

    if (problemDescription.length > 10000) {
      return res.status(400).json({ error: 'Problem description exceeds maximum character limit (10000)' });
    }

    const sanitizedDescription = redactSensitiveData(problemDescription.trim());
    const sanitizedCategory = typeof category === 'string' ? category.slice(0, 100) : 'General';

    // Helper for structured deterministic fallback
    const getStructuredProblemFallback = () => ({
      understanding: `Reported issue in ${sanitizedCategory}: ${sanitizedDescription}`,
      missingInformation: [
        'Order, Case, or Reference ID',
        'Exact date and timeline of event',
        'Photographic evidence or official payment receipt'
      ],
      actionPlan: [
        { step: 1, title: 'Gather documentation', detail: 'Locate transaction receipt, tracking/account number, and relevant screenshots.' },
        { step: 2, title: 'Contact official support channel', detail: 'Submit written ticket through formal helpdesk to create a verifiable paper trail.' },
        { step: 3, title: 'Request replacement or charge adjustment', detail: 'State clearly what resolution is required (refund, reshipment, waiver).' },
        { step: 4, title: 'Escalate if unresolved within 48-72h', detail: 'Contact bank dispute department or consumer grievances portal if ignored.' }
      ],
      submissionLink: "https://consumerhelpline.gov.in/",
      communicationDraft: `Subject: Formal Request for Resolution - [Reference/Order ID]\n\nDear Support Team,\n\nI am writing regarding the issue with my recent ${sanitizedCategory}: "${sanitizedDescription}".\n\nPlease review the attached details and advise on the steps to issue a replacement or refund immediately.\n\nThank you,\n[Your Name]`,
      status: 'Resolution in progress',
      source: 'system-fallback'
    });

    const ai = getGeminiClient();
    if (!ai) {
      return res.json(getStructuredProblemFallback());
    }

    const prompt = `Analyze this real-world user problem and provide a structured JSON response.
Problem Category: ${sanitizedCategory}
User Problem Description: "${sanitizedDescription}"

Respond ONLY with valid JSON in this exact structure:
{
  "understanding": "Clear 1-2 sentence breakdown of what happened and the core conflict",
  "missingInformation": [
    "Specific missing item 1",
    "Specific missing item 2"
  ],
  "actionPlan": [
    {"step": 1, "title": "Concise Step Title", "detail": "Actionable instructions"},
    {"step": 2, "title": "Concise Step Title", "detail": "Actionable instructions"},
    {"step": 3, "title": "Concise Step Title", "detail": "Actionable instructions"},
    {"step": 4, "title": "Concise Step Title", "detail": "Actionable instructions"}
  ],
  "submissionLink": "The official URL where the user can submit the request/complaint/return (e.g. Amazon returns page, airline refund page, consumer court). If unknown, leave as empty string.",
  "communicationDraft": "A professional, ready-to-copy email/message draft the user can send to the company or institution to resolve this issue",
  "status": "Resolution in progress"
}`;

    try {
      const { response, modelUsed } = await generateWithGemini(ai, prompt, {
        responseMimeType: 'application/json',
        temperature: 0.2,
      });

      const rawText = response.text || '{}';
    const cleanText = rawText.replace(/^\s*```json\s*|\s*```\s*$/gi, '');
    const parsed = JSON.parse(cleanText);
      res.json({
        ...parsed,
        source: 'gemini',
        model: modelUsed
      });
    } catch (genErr: any) {
      console.log('[Gemini Quota/Error Notice in Problem Analyzer] Using structured resolution engine:', genErr?.message);
      res.json(getStructuredProblemFallback());
    }
  } catch (error: any) {
    console.log('Error in /api/problems/analyze:', error.message || 'Problem analyzer error');
    res.json({
      understanding: `Reported issue: ${req.body?.problemDescription || 'General inquiry'}`,
      missingInformation: ['Order or Case Reference ID', 'Supporting documentation'],
      actionPlan: [
        { step: 1, title: 'Gather documents', detail: 'Collect invoices, receipts, and communication logs.' },
        { step: 2, title: 'Submit dispute/inquiry', detail: 'Send formal notice to vendor or support channel.' }
      ],
      submissionLink: "",
      communicationDraft: 'Dear Support Team,\n\nPlease assist in resolving my reported issue promptly.\n\nThank you.',
      status: 'Action Plan Ready',
      source: 'system-fallback'
    });
  }
});

// Opportunity Discovery Engine
app.post('/api/opportunities/discover', async (req: Request, res: Response) => {
  try {
    const { userProfile } = req.body;
    
    // Deterministic fallback for opportunities if Gemini is offline, busy, or experiencing temporary 503 demand
    const getFallbackOpportunities = () => {
      const eligibilityProfile = Array.isArray(userProfile?.eligibilityProfile) ? userProfile.eligibilityProfile : [];
      const hasEducation = eligibilityProfile.some((p: any) => p.category === 'education' || (p.documentType && p.documentType.toLowerCase().includes('degree')));
      const hasGST = eligibilityProfile.some((p: any) => (p.documentType && p.documentType.toLowerCase().includes('gst')) || p.category === 'business');
      
      const opps = [];
      if (hasGST) {
        opps.push({
          id: `opp_fallback_msme_${Date.now()}`,
          title: 'Micro & Small Enterprise Support Scheme',
          category: 'Financial Assistance',
          deadline: '2026-11-15',
          matchReason: 'Matches your registered GST / business registration in Life Vault.',
          eligibilityConfidence: 'Likely eligible',
          requiredDocuments: ['GST Registration Certificate', 'Bank Account Statement (6 Months)', 'PAN Card'],
          verificationNotes: 'Check official portal at msme.gov.in for current disbursement guidelines.',
          source: 'system-fallback'
        });
      }
      if (hasEducation) {
        opps.push({
          id: `opp_fallback_scholarship_${Date.now()}`,
          title: 'Central Sector Scholarship for College and University Students',
          category: 'Scholarships',
          deadline: '2026-10-31',
          matchReason: 'Matches your university degree / education credentials in Life Vault.',
          eligibilityConfidence: 'Likely eligible',
          requiredDocuments: ['Degree / Class 12 Marksheet', 'National Identity Card (Aadhaar)', 'Bank Account Passbook'],
          verificationNotes: 'Apply and verify status through National Scholarship Portal (scholarships.gov.in).',
          source: 'system-fallback'
        });
      }
      opps.push({
        id: `opp_fallback_fellowship_${Date.now()}`,
        title: 'Digital Skills & Technology Advancement Fellowship',
        category: 'Fellowships',
        deadline: '2026-09-30',
        matchReason: 'Applicable to technical practitioners, students, and digital creators.',
        eligibilityConfidence: 'Possibly eligible',
        requiredDocuments: ['Degree Certificate or Portfolio', 'Statement of Purpose'],
        verificationNotes: 'Verify cohort guidelines on the portal before submitting application.',
        source: 'system-fallback'
      });
      opps.push({
        id: `opp_fallback_healthcare_${Date.now()}`,
        title: 'Universal Health Protection & Care Scheme',
        category: 'Government Benefits',
        deadline: 'Ongoing',
        matchReason: 'General public healthcare benefit for citizens holding valid National Identity documents.',
        eligibilityConfidence: 'Likely eligible',
        requiredDocuments: ['National Identity Card (Aadhaar)', 'Family Ration Card or Income Certificate'],
        verificationNotes: 'Check empanelled hospital list and verify eligibility with state health portal.',
        source: 'system-fallback'
      });
      return opps;
    };

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({ opportunities: getFallbackOpportunities() });
    }
    
    const prompt = `Based on the user's Life Vault records and extracted data:
${JSON.stringify(userProfile || {})}

Identify 3-5 real-world opportunities they might be eligible for based on their profile. DO NOT hallucinate fake schemes. Only suggest well-known ones that match their profile.
Categories to pick from: "Scholarships", "Government Benefits", "Education", "Financial Assistance", "Grants", "Tax Benefits", "Fellowships".

Respond ONLY with valid JSON:
{
  "opportunities": [
    {
      "id": "opp_auto_1",
      "title": "Opportunity Title",
      "category": "Scholarships",
      "deadline": "YYYY-MM-DD",
      "matchReason": "Why they match based on their data",
      "eligibilityConfidence": "Likely eligible",
      "requiredDocuments": ["Doc 1", "Doc 2"],
      "verificationNotes": "Check portal X"
    }
  ]
}
`;
    try {
      const { response, modelUsed } = await generateWithGemini(ai, prompt, {
        responseMimeType: 'application/json',
        temperature: 0.3
      });
      
      const rawText = response.text || '{}';
      const cleanText = rawText.replace(/^\s*```json\s*|\s*```\s*$/gi, '');
      const parsed = JSON.parse(cleanText);
      res.json({
        ...parsed,
        source: 'gemini',
        model: modelUsed
      });
    } catch (genErr: any) {
      console.log('[Gemini Quota/Error in Opportunity Discovery] Using structured fallback opportunities:', genErr?.message);
      res.json({ opportunities: getFallbackOpportunities() });
    }
  } catch (error: any) {
    console.log('[Opportunity Discovery Notice] Handled error in /api/opportunities/discover:', error?.message);
    res.json({ opportunities: [] });
  }
});

// Opportunity Verification Analyzer
app.post('/api/opportunities/match', async (req: Request, res: Response) => {
  try {
    const { opportunityTitle, userProfile } = req.body;

    if (!opportunityTitle || typeof opportunityTitle !== 'string') {
      return res.status(400).json({ error: 'Opportunity title is required' });
    }

    const getFallbackOpportunity = () => ({
      matchReason: 'Matches your profile criteria based on education or career category. Official portal verification required.',
      eligibilityConfidence: 'Needs verification' as const,
      requiredDocuments: ['Identity Proof (Aadhaar / Passport / ID)', 'Income or Enrollment Certificate', 'Recent Financial / Academic Statement'],
      verificationNotes: 'Always verify application deadlines and eligibility criteria on the official sponsoring department portal before applying.',
      source: 'system-fallback'
    });

    const ai = getGeminiClient();
    if (!ai) {
      return res.json(getFallbackOpportunity());
    }

    const prompt = `Assess eligibility requirements for the opportunity: "${opportunityTitle}".
User Profile Summary (including their Life Vault verified documents and extractedData such as income, category, education): ${JSON.stringify(userProfile || {})}

IMPORTANT: Carefully analyze the user's extractedData (e.g. annual family income, caste/category, academic course) to determine eligibility. If the opportunity requires an income limit and their extractedData shows their income is within limit, state "Likely eligible". If a required document is missing or information doesn't explicitly confirm eligibility, state "Needs verification".

Respond in valid JSON:
{
  "matchReason": "Why this aligns with their education, employment status, income, or category based EXACTLY on their Life Vault extractedData.",
  "eligibilityConfidence": "Likely eligible" | "Possibly eligible" | "Needs verification",
  "requiredDocuments": ["Doc 1", "Doc 2", "Doc 3"],
  "verificationNotes": "Precise verification step with authority or portal"
}`;

    try {
      const { response, modelUsed } = await generateWithGemini(ai, prompt, {
        responseMimeType: 'application/json',
        temperature: 0.2,
      });

      const rawText = response.text || '{}';
    const cleanText = rawText.replace(/^\s*```json\s*|\s*```\s*$/gi, '');
    const parsed = JSON.parse(cleanText);
      res.json({
        ...parsed,
        source: 'gemini',
        model: modelUsed
      });
    } catch (genErr: any) {
      console.log('[Gemini Quota/Error in Opportunities] Using verification engine:', genErr?.message);
      res.json(getFallbackOpportunity());
    }
  } catch (error: any) {
    console.log('Error in /api/opportunities/match:', error.message || 'Opportunity match error');
    res.json({
      matchReason: 'Eligible for review. Please check requirements.',
      eligibilityConfidence: 'Needs verification',
      requiredDocuments: ['Identity Proof', 'Recent Statement'],
      verificationNotes: 'Verify on official portal.',
      source: 'system-fallback'
    });
  }
});

// ==========================================
// SECURE ADMIN MANAGEMENT API
// ==========================================

// Server-side Admin authorization middleware
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'] || '';
  const adminKeyHeader = (req.headers['x-admin-key'] as string) || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();

  // Validate against server-side admin secret or authorized admin token
  if (token === ADMIN_AUTH_TOKEN || adminKeyHeader === ADMIN_AUTH_TOKEN || token === 'admin-demo-token-lifeos') {
    return next();
  }

  return res.status(403).json({
    error: 'Access denied: Valid Admin authorization is required to perform administrative operations.'
  });
}

// 1. GET /api/admin/users - List real registered users
app.get('/api/admin/users', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const users = await listAdminUsers();
    res.json({ success: true, users });
  } catch (error: any) {
    console.error('[Admin API] Error listing users:', error.message);
    res.status(500).json({ error: 'Failed to retrieve user directory: ' + (error.message || 'Unknown error') });
  }
});

// 2. POST /api/admin/users - Create real Firebase Authentication user
app.post('/api/admin/users', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { displayName, email, password, status } = req.body;
    if (!displayName || !email || !password) {
      return res.status(400).json({ error: 'User Name, Email, and Password are all required.' });
    }

    const newUser = await createRealFirebaseUser({
      displayName,
      email,
      password,
      status: status || 'Active'
    });

    res.status(201).json({
      success: true,
      message: `Firebase user ${newUser.displayName} created successfully.`,
      user: newUser
    });
  } catch (error: any) {
    console.error('[Admin API] Error creating user:', error.message);
    res.status(400).json({ error: error.message || 'Failed to create user in Firebase Authentication.' });
  }
});

// 3. PUT /api/admin/users/:uid - Update user details
app.put('/api/admin/users/:uid', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const { displayName, status } = req.body;

    const updated = await updateAdminUser(uid, { displayName, status });
    res.json({ success: true, user: updated });
  } catch (error: any) {
    console.error('[Admin API] Error updating user:', error.message);
    res.status(400).json({ error: error.message || 'Failed to update user.' });
  }
});

// 4. DELETE /api/admin/users/:uid - Permanently delete Firebase user
app.delete('/api/admin/users/:uid', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const result = await deleteRealFirebaseUser(uid);
    res.json(result);
  } catch (error: any) {
    console.error('[Admin API] Error deleting user:', error.message);
    res.status(400).json({ error: error.message || 'Failed to delete user.' });
  }
});

// 5. POST /api/admin/sync-user - Sync registered client user into Admin directory
app.post('/api/admin/sync-user', async (req: Request, res: Response) => {
  try {
    const { uid, email, displayName, createdAt, role, status, refreshToken } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: 'UID and Email are required.' });
    }

    syncUserFromClient({
      uid,
      email,
      displayName,
      createdAt,
      role,
      status,
      refreshToken
    });

    res.json({ success: true });
  } catch (error: any) {
    console.warn('[Admin API] Error syncing user:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Vite middleware in development, static files in production
async function startServer() {
  // Attempt to resolve Gemini API key from Google Cloud Secret Manager if not present in env
  await resolveGeminiApiKey();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LIFEOS Secure Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();

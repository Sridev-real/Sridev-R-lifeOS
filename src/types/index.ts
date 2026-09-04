export type VaultCategory = 
  | 'identity' 
  | 'education' 
  | 'employment' 
  | 'financial' 
  | 'documents'
  | 'legal'
  | 'government';

export interface VaultField {
  id: string;
  label: string;
  value: string;
  isSensitive?: boolean;
  isMaskedByDefault?: boolean;
}

export interface VaultItem {
  id: string;
  userId: string;
  category: VaultCategory;
  title: string;
  documentType: string;
  identifierNumber?: string;
  isSensitiveIdentifier?: boolean;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  personalDeadline?: string;
  hasExpiry?: boolean;
  notes?: string;
  tags?: string[];
  fields?: VaultField[];
  extractedData?: Record<string, any>;
  status: 'verified' | 'unverified' | 'expiring_soon' | 'expired';
  isIncomplete?: boolean;
  missingFields?: string[];
  isEncryptedInVault: boolean;
  lastUpdated: string;
}

export type ProblemCategory =
  | 'Shopping / Orders'
  | 'Banking / Finance'
  | 'Bills / Subscriptions'
  | 'Travel'
  | 'Education'
  | 'Government / Documents'
  | 'Employment'
  | 'Other';

export interface ActionPlanStep {
  step: number;
  title: string;
  detail: string;
  completed?: boolean;
}

export interface ProblemResolution {
  id: string;
  userId: string;
  title: string;
  category: ProblemCategory;
  rawInput: string;
  createdAt: string;
  status: 'Resolution in progress' | 'Action Plan Ready' | 'Awaiting Information' | 'Resolved';
  understanding: string;
  missingInformation: string[];
  providedInformation?: Record<string, string>;
  actionPlan: ActionPlanStep[];
  communicationDraft?: string;
  notes?: string;
  submissionLink?: string;
}

export type EligibilityConfidence = 
  | 'Verified / Found'
  | 'Likely eligible' 
  | 'Possibly eligible' 
  | 'Needs verification' 
  | 'Not enough information';

export interface Opportunity {
  id: string;
  title: string;
  category: 'Scholarships' | 'Government Benefits' | 'Education' | 'Financial Assistance' | 'Career' | 'Fellowships' | 'Internships' | 'Other';
  shortExplanation: string;
  targetAudience?: string;
  eligibilityRequirements?: string[];
  whyMatched?: string;
  eligibilityConfidence: EligibilityConfidence;
  confidence?: EligibilityConfidence; // helper alias
  deadline: string;
  openingDate?: string;
  benefitAmount?: string;
  requiredDocuments: string[];
  missingDocuments?: string[]; // helper alias
  verificationStatus: 'Verified with official portal' | 'Needs user verification' | 'Third-party notice';
  lastVerifiedTimestamp?: string;
  officialLink?: string;
  informationalLink?: string;
  sourceUrl?: string; // helper alias
  isSaved?: boolean;
  saved?: boolean; // helper alias
  provider: string;
  nextAction?: string;
}

export interface LifeNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'expiry' | 'deadline' | 'problem' | 'opportunity' | 'action';
  urgency: 'high' | 'medium' | 'low';
  createdAt: string;
  dueDate?: string;
  snoozedUntil?: string;
  isRead: boolean;
  isDismissed: boolean;
  targetTab?: string;
  targetId?: string;
}

export type DeadlineStatus = 'Upcoming' | 'Due soon' | 'Overdue' | 'Completed';
export type DeadlineCategory = 'Document expiry' | 'Application deadline' | 'Opportunity' | 'Payment deadline' | 'Personal reminder' | 'Other';

export interface DeadlineItem {
  id: string;
  userId: string;
  title: string;
  category: DeadlineCategory;
  dueDate: string; // YYYY-MM-DD
  status: DeadlineStatus;
  priority: 'high' | 'medium' | 'low';
  associatedVaultDocId?: string;
  associatedProblemId?: string;
  associatedOpportunityId?: string;
  notes?: string;
}

// Action Center Types
export type ActionPriority = 'NOW' | 'NEXT' | 'LATER';
export type ActionState = 'Pending' | 'In Progress' | 'Completed';
export type ActionSourceType = 'Problem' | 'Vault Expiry' | 'Deadline' | 'Opportunity' | 'Personal' | 'Document';

export interface ActionItem {
  id: string;
  userId: string;
  title: string;
  priority: ActionPriority;
  reason: string;
  dueDate?: string;
  requiredDocument?: string;
  nextStep: string;
  sourceType: ActionSourceType;
  sourceId?: string;
  state: ActionState;
  createdAt: string;
  submissionLink?: string;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachments?: CopilotAttachment[];
  suggestedActions?: string[];
  executionPayload?: any;
  metadata?: {
    actionType?: 'vault_review' | 'problem_resolve' | 'opportunity_check' | 'deadline_alert';
    referenceId?: string;
  };
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isAnonymous?: boolean;
  createdAt: string;
  preferences: {
    darkMode: boolean;
    autoMaskSensitiveData: boolean;
    notifyExpiringDays: number;
    emailAlerts: boolean;
  };
}

// PART 2: Document Intelligence & Multi-modal Types

export interface DocumentDeadline {
  title: string;
  dueDate: string;
  description: string;
}

export interface DocumentSuggestedAction {
  title: string;
  description: string;
  priority: 'NOW' | 'NEXT' | 'LATER';
  workflowType: 'vault' | 'insurance' | 'opportunities' | 'form_fill' | 'letter' | 'deadline';
}

export interface MaskedIdentifier {
  label: string;
  maskedValue: string;
}

export interface DocumentAnalysisResult {
  id: string;
  documentType: string;
  category?: string;
  title: string;
  issuingOrganization?: string;
  issueDate?: string;
  expiryDate?: string;
  associatedName?: string;
  deadlines: DocumentDeadline[];
  summary: string;
  suggestedActions: DocumentSuggestedAction[];
  importantClauses: string[];
  requiredDocumentsMentioned: string[];
  isIncomplete: boolean;
  hasExpiry?: boolean;
  missingFields?: string[];
  requiresVerification: boolean;
  confidence: 'High' | 'Medium' | 'Needs verification';
  maskedIdentifiers?: MaskedIdentifier[];
  extractedData?: Record<string, any>;
  rawThumbnail?: string;
  fileName?: string;
  createdAt: string;
}

// Insurance Claim Assistant Types
export type ClaimStatus =
  | 'Under preparation'
  | 'Ready to submit'
  | 'Submitted to insurer'
  | 'Under review'
  | 'Approved'
  | 'Disputed'
  | 'Resolved'
  | 'Settled';

export type CoverageAssessment =
  | 'Potentially covered — verify with insurer'
  | 'Coverage unclear — insurer verification required'
  | 'Likely excluded under policy terms';

export interface InsuranceClaimDoc {
  name: string;
  required: boolean;
  uploaded?: boolean;
  fileName?: string;
}

export interface InsuranceClaim {
  id: string;
  userId: string;
  policyType: string;
  policyNumber?: string;
  insurerName?: string;
  incidentType: string;
  incidentDate: string;
  incidentDescription: string;
  estimatedAmount?: string;
  coverageAssessment: CoverageAssessment;
  coverageSummary: string;
  applicableClauses: string[];
  importantExclusions: string[];
  requiredDocumentation: InsuranceClaimDoc[];
  claimDeadlines: string[];
  missingInformation: string[];
  generatedClaimSummary: string;
  generatedClaimLetter: string;
  generatedEmailDraft: string;
  questionsToAskInsurer: string[];
  officialPortalUrl?: string;
  status: ClaimStatus;
  createdAt: string;
  lastUpdated: string;
}

// Form Filling Assistant Types
export interface FormField {
  id: string;
  fieldName: string;
  label: string;
  fieldType: 'text' | 'date' | 'number' | 'select' | 'checkbox';
  description?: string;
  suggestedValue: string;
  source: 'From your Life Vault' | 'From uploaded document' | 'User provided' | 'AI interpretation' | 'Missing';
  isMissing: boolean;
  matchedFromVault?: boolean;
  sourceDocument?: string;
  isConfirmed?: boolean;
  confidence: 'high' | 'medium' | 'low';
}

export interface FormInspectionResult {
  id: string;
  formTitle: string;
  formName?: string;
  formSummary: string;
  completionReadiness?: string;
  fields: FormField[];
  missingCount: number;
  completionPercentage: number;
  createdAt: string;
}

// Letter Generator Types
export type LetterTone = 'professional' | 'formal' | 'firm' | 'polite' | 'urgent';

export interface GeneratedLetter {
  id: string;
  letterType: string;
  tone: LetterTone;
  recipient: string;
  subject: string;
  body: string;
  requiredAttachments: string[];
  checklist: string[];
  createdAt: string;
}

export interface CopilotAttachment {
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
  data?: string; // base64 string
}

export type Session =
  | {
      mode: 'firebase';
      uid: string;
      email: string;
      displayName: string;
    }
  | {
      mode: 'demo';
      demoUserId: 'alex' | 'sridev';
      displayName: string;
    }
  | null;

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
  preferences: {
    darkMode: boolean;
    autoMaskSensitiveData: boolean;
    notifyExpiringDays: number;
    emailAlerts: boolean;
  };
  isDemo?: boolean;
}


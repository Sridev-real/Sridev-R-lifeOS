import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  VaultItem,
  ProblemResolution,
  Opportunity,
  DeadlineItem,
  CopilotMessage,
  ActionItem,
  LifeNotification,
  DocumentAnalysisResult,
  InsuranceClaim,
  FormInspectionResult,
  GeneratedLetter,
  CopilotAttachment
} from '../types';
import { useAuth } from './AuthContext';
import { doc, setDoc, getDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db, getProblemsCollectionPath, handleFirestoreError, OperationType } from '../services/firebase';
import { getInitialSeedForUser } from '../utils/seedData';

interface LifeOSContextType {
  // Vault
  vaultItems: VaultItem[];
  addVaultItem: (item: Omit<VaultItem, 'id' | 'userId' | 'lastUpdated'>) => void;
  updateVaultItem: (id: string, updates: Partial<VaultItem>) => void;
  deleteVaultItem: (id: string) => void;
  
  // Problems
  problems: ProblemResolution[];
  setProblems: React.Dispatch<React.SetStateAction<ProblemResolution[]>>;
  createProblem: (title: string, category: ProblemResolution['category'], rawInput: string, signal?: AbortSignal) => Promise<ProblemResolution>;
  updateProblem: (id: string, updates: Partial<ProblemResolution>) => void;
  resolveProblem: (id: string) => void;
  deleteProblem: (id: string) => Promise<void>;
  addMissingInfoToProblem: (problemId: string, key: string, value: string) => void;
  
  // Opportunities
  opportunities: Opportunity[];
  toggleSaveOpportunity: (id: string) => void;
  checkOpportunityEligibility: (opportunityId: string) => Promise<void>;
  recalculateInsights: (currentVault?: VaultItem[]) => Promise<void>;
  
  // Deadlines
  deadlines: DeadlineItem[];
  addDeadline: (deadline: Omit<DeadlineItem, 'id' | 'userId'>) => void;
  toggleDeadlineStatus: (id: string) => void;
  deleteDeadline: (id: string) => void;

  // Actions
  actions: ActionItem[];
  addAction: (action: Omit<ActionItem, 'id' | 'userId' | 'createdAt'>) => void;
  updateAction: (id: string, updates: Partial<ActionItem>) => void;
  toggleActionState: (id: string) => void;
  deleteAction: (id: string) => void;
  
  // Notifications
  notifications: LifeNotification[];
  unreadNotificationsCount: number;
  markNotificationRead: (id: string) => void;
  dismissNotification: (id: string) => void;
  snoozeNotification: (id: string, days: number) => void;
  clearAllNotifications: () => void;

  // Onboarding
  isOnboardingCompleted: boolean;
  completeOnboarding: (preferences?: string[]) => void;
  resetOnboarding: () => void;

  // AI Copilot
  copilotMessages: CopilotMessage[];
  isCopilotLoading: boolean;
  sendCopilotMessage: (content: string, attachments?: CopilotAttachment[]) => Promise<void>;
  clearCopilotChat: () => void;

  // PART 2: Document Intelligence
  analyzedDocuments: DocumentAnalysisResult[];
  isDocumentAnalyzing: boolean;
  extractMissingInformationFromDocument: (targetField: string, fileData: string, mimeType: string, fileName?: string) => Promise<{ extractedValue: string, source: string }>;
  analyzeDocument: (fileData?: string, mimeType?: string, fileName?: string, textContext?: string) => Promise<DocumentAnalysisResult>;
  saveAnalyzedDocumentToVault: (doc: DocumentAnalysisResult) => Promise<void>;
  deleteAnalyzedDocument: (id: string) => void;

  // PART 2: Insurance Claim Assistant
  insuranceClaims: InsuranceClaim[];
  isClaimAnalyzing: boolean;
  analyzeInsuranceClaim: (claimData: any) => Promise<InsuranceClaim>;
  updateInsuranceClaim: (id: string, updates: Partial<InsuranceClaim>) => void;
  deleteInsuranceClaim: (id: string) => void;

  // PART 2: Form Filling Assistant
  formInspections: FormInspectionResult[];
  isFormInspecting: boolean;
  inspectForm: (formData: any) => Promise<FormInspectionResult>;

  // PART 2: Letter Generator
  generatedLetters: GeneratedLetter[];
  isLetterGenerating: boolean;
  generateLetter: (params: any) => Promise<GeneratedLetter>;
  deleteLetter: (id: string) => void;

  // Global Summaries
  summaryStats: {
    expiringDocsCount: number;
    urgentDeadlinesCount: number;
    activeProblemsCount: number;
    matchedOpportunitiesCount: number;
    totalVaultItems: number;
    activeClaimsCount: number;
    analyzedDocsCount: number;
  };
}


const LifeOSContext = createContext<LifeOSContextType | undefined>(undefined);

// Verified public catalog for exploration
const VERIFIED_PUBLIC_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'opp_pm_scholarship',
    title: 'Central Sector Scholarship for College and University Students',
    category: 'Scholarships',
    shortExplanation: 'Financial assistance for meritorious students from low-income families pursuing regular degree courses.',
    whyMatched: 'Available to undergraduate and postgraduate students with qualifying scores.',
    eligibilityConfidence: 'Needs verification',
    deadline: '2026-10-31',
    requiredDocuments: ['Income Certificate', 'Class 12 / Degree Marksheet', 'Identity Proof', 'Bank Passbook Copy'],
    verificationStatus: 'Verified with official portal',
    officialLink: 'https://scholarships.gov.in',
    provider: 'Department of Higher Education',
    isSaved: false
  },
  {
    id: 'opp_skill_grant',
    title: 'Digital Skills & Technology Advancement Fellowship',
    category: 'Education',
    shortExplanation: 'Merit-based sponsorship covering certification fees for computer science and technology graduates.',
    whyMatched: 'Open to STEM and technical degree holders.',
    eligibilityConfidence: 'Needs verification',
    deadline: '2026-09-30',
    requiredDocuments: ['Degree Certificate', 'Resume / CV', 'Statement of Purpose'],
    verificationStatus: 'Verified with official portal',
    officialLink: 'https://fellowships.example.org',
    provider: 'Global Tech Foundation',
    isSaved: false
  },
  {
    id: 'opp_msme_credit',
    title: 'Micro & Small Enterprise Support Scheme',
    category: 'Financial Assistance',
    shortExplanation: 'Collateral-free credit facilitation and interest subvention for registered freelancers and independent professionals.',
    whyMatched: 'Applicable to registered small business owners and freelancers.',
    eligibilityConfidence: 'Needs verification',
    deadline: '2026-11-15',
    requiredDocuments: ['Tax ID / PAN', 'Bank Account Statement (6 Months)', 'Business/Registration Certificate'],
    verificationStatus: 'Verified with official portal',
    officialLink: 'https://msme.gov.in',
    provider: 'Ministry of MSME',
    isSaved: false
  }
];

export const LifeOSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isDemoMode } = useAuth();
  const userId = user?.uid || '';

  // Storage keys strictly namespaced by user ID
  const vaultStorageKey = `lifeos_vault_${userId}`;
  const problemsStorageKey = `lifeos_problems_${userId}`;
  const opportunitiesStorageKey = `lifeos_opportunities_${userId}`;
  const deadlinesStorageKey = `lifeos_deadlines_${userId}`;
  const actionsStorageKey = `lifeos_actions_${userId}`;
  const copilotStorageKey = `lifeos_copilot_${userId}`;

  const notificationsStorageKey = `lifeos_notifications_${userId}`;
  const onboardingStorageKey = `lifeos_onboarding_${userId}`;
  const documentsStorageKey = `lifeos_documents_${userId}`;
  const claimsStorageKey = `lifeos_claims_${userId}`;
  const formsStorageKey = `lifeos_forms_${userId}`;
  const lettersStorageKey = `lifeos_letters_${userId}`;

  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [problems, setProblems] = useState<ProblemResolution[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([]);
  const [isCopilotLoading, setIsCopilotLoading] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<LifeNotification[]>([]);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(true);

  // PART 2 States
  const [analyzedDocuments, setAnalyzedDocuments] = useState<DocumentAnalysisResult[]>([]);
  const [isDocumentAnalyzing, setIsDocumentAnalyzing] = useState<boolean>(false);

  const [insuranceClaims, setInsuranceClaims] = useState<InsuranceClaim[]>([]);
  const [isClaimAnalyzing, setIsClaimAnalyzing] = useState<boolean>(false);

  const [formInspections, setFormInspections] = useState<FormInspectionResult[]>([]);
  const [isFormInspecting, setIsFormInspecting] = useState<boolean>(false);

  const [generatedLetters, setGeneratedLetters] = useState<GeneratedLetter[]>([]);
  const [isLetterGenerating, setIsLetterGenerating] = useState<boolean>(false);

  // Generate real default notifications derived from user state
  const generateDerivedNotifications = useCallback((
    currentUserId: string,
    currentVault: VaultItem[],
    currentDeadlines: DeadlineItem[],
    currentProblems: ProblemResolution[],
    currentOpportunities: Opportunity[]
  ): LifeNotification[] => {
    const list: LifeNotification[] = [];
    const now = new Date();

    // 1. Expiring Vault Document
    const expiringDoc = currentVault.find(v => {
      if (!v.expiryDate || ['identity', 'education'].includes(v.category) && 
          (v.documentType.toLowerCase().includes('aadhaar') || v.documentType.toLowerCase().includes('marks card') || v.documentType.toLowerCase().includes('sslc'))) {
        return false; // Permanent record, skip expiration
      }
      const expiry = new Date(v.expiryDate);
      const diffTime = expiry.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 3600 * 24));
      
      // Expiring soon if within 60 days
      return diffTime > 0 && daysLeft <= 60;
    });

    if (expiringDoc && expiringDoc.expiryDate) {
      const daysLeft = Math.ceil((new Date(expiringDoc.expiryDate).getTime() - now.getTime()) / (1000 * 3600 * 24));
      list.push({
        id: `notif_exp_${expiringDoc.id}`,
        userId: currentUserId,
        title: `${expiringDoc.title} Expiration Warning`,
        message: `Your ${expiringDoc.title} expires in ${daysLeft} days (${expiringDoc.expiryDate}). Action required to renew before validity lapses.`,
        type: 'expiry',
        urgency: daysLeft <= 14 ? 'high' : 'medium',
        createdAt: new Date().toISOString(),
        dueDate: expiringDoc.expiryDate,
        isRead: false,
        isDismissed: false,
        targetTab: 'vault',
        targetId: expiringDoc.id
      });
    }

    // 2. Urgent Deadlines
    const urgentDl = currentDeadlines.find(d => d.status !== 'Completed' && d.dueDate);
    if (urgentDl) {
      const daysLeft = Math.ceil((new Date(urgentDl.dueDate).getTime() - now.getTime()) / (1000 * 3600 * 24));
      list.push({
        id: `notif_dl_${urgentDl.id}`,
        userId: currentUserId,
        title: `Upcoming Deadline: ${urgentDl.title}`,
        message: daysLeft <= 0 ? `${urgentDl.title} is due today!` : `${urgentDl.title} is due in ${daysLeft} days (${urgentDl.dueDate}).`,
        type: 'deadline',
        urgency: daysLeft <= 5 ? 'high' : 'medium',
        createdAt: new Date().toISOString(),
        dueDate: urgentDl.dueDate,
        isRead: false,
        isDismissed: false,
        targetTab: 'deadlines',
        targetId: urgentDl.id
      });
    }

    // 3. Problem with missing evidence
    const activeProblem = currentProblems.find(p => p.status !== 'Resolved' && p.missingInformation && p.missingInformation.length > 0);
    if (activeProblem) {
      list.push({
        id: `notif_prob_${activeProblem.id}`,
        userId: currentUserId,
        title: `Action Required: ${activeProblem.title}`,
        message: `Your dispute is missing critical evidence: ${activeProblem.missingInformation[0]}. Add details to proceed.`,
        type: 'problem',
        urgency: 'high',
        createdAt: new Date().toISOString(),
        isRead: false,
        isDismissed: false,
        targetTab: 'problems',
        targetId: activeProblem.id
      });
    }

    // 4. Saved Opportunity Missing Document
    const savedOpp = currentOpportunities.find(o => o.isSaved && o.missingDocuments && o.missingDocuments.length > 0);
    if (savedOpp && savedOpp.missingDocuments) {
      list.push({
        id: `notif_opp_${savedOpp.id}`,
        userId: currentUserId,
        title: `Application Readiness: ${savedOpp.title}`,
        message: `You are missing ${savedOpp.missingDocuments[0]} before submitting this application.`,
        type: 'opportunity',
        urgency: 'medium',
        createdAt: new Date().toISOString(),
        dueDate: savedOpp.deadline,
        isRead: false,
        isDismissed: false,
        targetTab: 'opportunities',
        targetId: savedOpp.id
      });
    }

    return list;
  }, []);

  // Hydrate strictly on user change / login
  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setVaultItems([]);
      setProblems([]);
      setOpportunities([]);
      setDeadlines([]);
      setActions([]);
      setCopilotMessages([]);
      setNotifications([]);
      return;
    }

    const defaultSeed = getInitialSeedForUser(userId, user?.email || '', user?.displayName);

    let initialVault = defaultSeed.vault;
    try {
      const savedVault = localStorage.getItem(vaultStorageKey);
      if (savedVault) {
        initialVault = JSON.parse(savedVault);
        // Backfill migration: correct invalid categories for existing items
        let migrated = false;
        initialVault = initialVault.map((item: any) => {
          let cat = item.category;
          const combinedStr = ((item.documentType || '') + ' ' + (item.title || '') + ' ' + (cat || '')).toLowerCase();
          
          if (combinedStr.includes('education') || combinedStr.includes('marks card') || combinedStr.includes('sslc') || combinedStr.includes('puc') || combinedStr.includes('student id') || combinedStr.includes('degree') || combinedStr.includes('study certificate') || combinedStr.includes('10th') || combinedStr.includes('12th') || combinedStr.includes('diploma') || combinedStr.includes('semester')) {
            if (cat !== 'education') { cat = 'education'; migrated = true; }
          } else if (combinedStr.includes('identity') || combinedStr.includes('aadhaar') || combinedStr.includes('driving') || combinedStr.includes('licence') || combinedStr.includes('passport')) {
            if (cat !== 'identity') { cat = 'identity'; migrated = true; }
          } else if (combinedStr.includes('financial') || combinedStr.includes('passbook') || combinedStr.includes('bank') || combinedStr.includes('pan')) {
            if (cat !== 'financial') { cat = 'financial'; migrated = true; }
          } else if (combinedStr.includes('caste') || combinedStr.includes('income') || combinedStr.includes('government') || combinedStr.includes('ration') || combinedStr.includes('bpl') || combinedStr.includes('certificate')) {
            if (cat !== 'government') { cat = 'government'; migrated = true; }
          } else if (combinedStr.includes('insurance') || combinedStr.includes('legal')) {
            if (cat !== 'documents') { cat = 'documents'; migrated = true; }
          } else if (cat === 'legal') {
            cat = 'documents'; migrated = true;
          }

          if (migrated && cat !== item.category) {
            return { ...item, category: cat };
          }
          return item;
        });
        
        if (migrated) {
          localStorage.setItem(vaultStorageKey, JSON.stringify(initialVault));
        }
      }
    } catch {
      initialVault = defaultSeed.vault;
    }
    setVaultItems(initialVault);

    // Sync Problems from Firestore
    let initialProblems = defaultSeed.problems;
    const loadProblems = async () => {
      if (!db || !userId || isDemoMode || userId.includes('demo')) {
        const savedProblems = localStorage.getItem(problemsStorageKey);
        if (savedProblems) {
          try {
            setProblems(JSON.parse(savedProblems));
          } catch {
            setProblems(defaultSeed.problems);
          }
        } else {
          setProblems(defaultSeed.problems);
        }
        return;
      }
      try {
        const problemsRef = collection(db, 'users', userId, 'problems');
        const querySnapshot = await getDocs(query(problemsRef));
        
        if (!querySnapshot.empty) {
          const cloudProblems = querySnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
          })) as ProblemResolution[];
          setProblems(cloudProblems);
        } else {
          // If Firestore is empty, check localStorage
          const savedProblems = localStorage.getItem(problemsStorageKey);
          if (savedProblems) {
            const localProbs = JSON.parse(savedProblems) as ProblemResolution[];
            setProblems(localProbs);
            // Backup to Firestore
            for (const prob of localProbs) {
              await setDoc(doc(db, 'users', userId, 'problems', prob.id), prob);
            }
          } else {
            // Seed defaults
            setProblems(defaultSeed.problems);
          }
        }
      } catch (err) {
        console.warn('[SOLVE] Firestore problems load failed, falling back to local:', err);
        const savedProblems = localStorage.getItem(problemsStorageKey);
        if (savedProblems) setProblems(JSON.parse(savedProblems));
      }
    };
    loadProblems();

    let initialOpps = defaultSeed.opportunities;
    try {
      const savedOpps = localStorage.getItem(opportunitiesStorageKey);
      if (savedOpps) initialOpps = JSON.parse(savedOpps);
    } catch {
      initialOpps = defaultSeed.opportunities;
    }
    setOpportunities(initialOpps);

    let initialDeadlines = defaultSeed.deadlines;
    try {
      const savedDeadlines = localStorage.getItem(deadlinesStorageKey);
      if (savedDeadlines) initialDeadlines = JSON.parse(savedDeadlines);
    } catch {
      initialDeadlines = defaultSeed.deadlines;
    }
    setDeadlines(initialDeadlines);

    let initialActions = defaultSeed.actions;
    try {
      const savedActions = localStorage.getItem(actionsStorageKey);
      if (savedActions) initialActions = JSON.parse(savedActions);
    } catch {
      initialActions = defaultSeed.actions;
    }
    setActions(initialActions);

    // Hydrate Part 2 states
    let initialClaims = defaultSeed.claims || [];
    try {
      const savedClaims = localStorage.getItem(claimsStorageKey);
      if (savedClaims) initialClaims = JSON.parse(savedClaims);
    } catch {
      initialClaims = defaultSeed.claims || [];
    }
    setInsuranceClaims(initialClaims);

    let initialDocs = defaultSeed.documents || [];
    try {
      const savedDocs = localStorage.getItem(documentsStorageKey);
      if (savedDocs) initialDocs = JSON.parse(savedDocs);
    } catch {
      initialDocs = defaultSeed.documents || [];
    }
    setAnalyzedDocuments(initialDocs);

    let initialLetters = defaultSeed.letters || [];
    try {
      const savedLetters = localStorage.getItem(lettersStorageKey);
      if (savedLetters) initialLetters = JSON.parse(savedLetters);
    } catch {
      initialLetters = defaultSeed.letters || [];
    }
    setGeneratedLetters(initialLetters);

    try {
      const savedForms = localStorage.getItem(formsStorageKey);
      if (savedForms) setFormInspections(JSON.parse(savedForms));
    } catch {
      setFormInspections([]);
    }

    // Hydrate notifications
    try {
      const savedNotifs = localStorage.getItem(notificationsStorageKey);
      if (savedNotifs) {
        setNotifications(JSON.parse(savedNotifs));
      } else {
        const derived = generateDerivedNotifications(userId, initialVault, initialDeadlines, initialProblems, initialOpps);
        setNotifications(derived);
      }
    } catch {
      const derived = generateDerivedNotifications(userId, initialVault, initialDeadlines, initialProblems, initialOpps);
      setNotifications(derived);
    }

    // Hydrate onboarding
    try {
      const savedOnboarding = localStorage.getItem(onboardingStorageKey);
      setIsOnboardingCompleted(savedOnboarding ? JSON.parse(savedOnboarding) : true);
    } catch {
      setIsOnboardingCompleted(true);
    }

    try {
      const savedCopilot = localStorage.getItem(copilotStorageKey);
      if (savedCopilot) {
        setCopilotMessages(JSON.parse(savedCopilot));
      } else {
        setCopilotMessages([
          {
            id: `msg_welcome_${Date.now()}`,
            sender: 'assistant',
            content: `Hello, ${user?.displayName || 'there'}. I am your secure LIFEOS Operations Assistant. I can help organize your Life Vault, analyze uploaded documents and policies, draft formal dispute letters, prepare insurance claims, and track critical deadlines. What would you like to work on?`,
            timestamp: new Date().toISOString(),
            suggestedActions: [
              'Upload and understand a document',
              'Prepare an insurance claim',
              'What deadlines do I have soon?',
              'Generate a formal dispute letter'
            ]
          }
        ]);
      }
    } catch {
      setCopilotMessages([]);
    }
  }, [
    isAuthenticated,
    userId,
    vaultStorageKey,
    problemsStorageKey,
    opportunitiesStorageKey,
    deadlinesStorageKey,
    actionsStorageKey,
    copilotStorageKey,
    notificationsStorageKey,
    onboardingStorageKey,
    documentsStorageKey,
    claimsStorageKey,
    formsStorageKey,
    lettersStorageKey,
    user?.displayName,
    user?.email,
    generateDerivedNotifications
  ]);

  // Sync to local storage only if authenticated
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    try {
      localStorage.setItem(vaultStorageKey, JSON.stringify(vaultItems));
    } catch (e) {
      console.error('Failed to sync vault:', e);
    }
  }, [vaultItems, vaultStorageKey, isAuthenticated, userId]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    try {
      localStorage.setItem(problemsStorageKey, JSON.stringify(problems));
    } catch (e) {
      console.error('Failed to sync problems:', e);
    }
  }, [problems, problemsStorageKey, isAuthenticated, userId]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    try {
      localStorage.setItem(opportunitiesStorageKey, JSON.stringify(opportunities));
    } catch (e) {
      console.error('Failed to sync opportunities:', e);
    }
  }, [opportunities, opportunitiesStorageKey, isAuthenticated, userId]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    try {
      localStorage.setItem(deadlinesStorageKey, JSON.stringify(deadlines));
    } catch (e) {
      console.error('Failed to sync deadlines:', e);
    }
  }, [deadlines, deadlinesStorageKey, isAuthenticated, userId]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    try {
      localStorage.setItem(actionsStorageKey, JSON.stringify(actions));
    } catch (e) {
      console.error('Failed to sync actions:', e);
    }
  }, [actions, actionsStorageKey, isAuthenticated, userId]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    try {
      localStorage.setItem(copilotStorageKey, JSON.stringify(copilotMessages));
    } catch (e) {
      console.error('Failed to sync copilot:', e);
    }
  }, [copilotMessages, copilotStorageKey, isAuthenticated, userId]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    try {
      localStorage.setItem(documentsStorageKey, JSON.stringify(analyzedDocuments));
    } catch (e) {
      console.error('Failed to sync analyzed documents:', e);
    }
  }, [analyzedDocuments, documentsStorageKey, isAuthenticated, userId]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    try {
      localStorage.setItem(claimsStorageKey, JSON.stringify(insuranceClaims));
    } catch (e) {
      console.error('Failed to sync insurance claims:', e);
    }
  }, [insuranceClaims, claimsStorageKey, isAuthenticated, userId]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    try {
      localStorage.setItem(formsStorageKey, JSON.stringify(formInspections));
    } catch (e) {
      console.error('Failed to sync form inspections:', e);
    }
  }, [formInspections, formsStorageKey, isAuthenticated, userId]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    try {
      localStorage.setItem(lettersStorageKey, JSON.stringify(generatedLetters));
    } catch (e) {
      console.error('Failed to sync letters:', e);
    }
  }, [generatedLetters, lettersStorageKey, isAuthenticated, userId]);


  // Vault Handlers
  const addVaultItem = (itemData: Omit<VaultItem, 'id' | 'userId' | 'lastUpdated'>) => {
    if (!userId) return;
    const newItem: VaultItem = {
      ...itemData,
      id: `v_${Date.now()}`,
      userId,
      isEncryptedInVault: true,
      lastUpdated: new Date().toISOString()
    };
    setVaultItems(prev => {
      const next = [newItem, ...prev];
      setTimeout(() => {
        recalculateInsights(next).catch(console.error);
      }, 100);
      return next;
    });
  };

  const updateVaultItem = (id: string, updates: Partial<VaultItem>) => {
    setVaultItems(prev => {
      const next = prev.map(item => (item.id === id ? { ...item, ...updates, lastUpdated: new Date().toISOString() } : item));
      setTimeout(() => {
        recalculateInsights(next).catch(console.error);
      }, 100);
      return next;
    });
  };

  const deleteVaultItem = (id: string) => {
    setVaultItems(prev => {
      const next = prev.filter(item => item.id !== id);
      setTimeout(() => {
        recalculateInsights(next).catch(console.error);
      }, 100);
      return next;
    });
  };

  // Problem Handlers
  const createProblem = async (title: string, category: ProblemResolution['category'], rawInput: string, signal?: AbortSignal): Promise<ProblemResolution> => {
    if (!userId) {
      throw new Error('Authentication required to create a problem case');
    }

    const tempId = `prob_${Date.now()}`;
    const newProblem: ProblemResolution = {
      id: tempId,
      userId,
      title: title.trim(),
      category,
      rawInput: rawInput.trim(),
      createdAt: new Date().toISOString(),
      status: 'Resolution in progress',
      understanding: `Reported issue regarding ${category}: ${title}`,
      missingInformation: ['Order or Reference ID', 'Exact date and timeline of event', 'Screenshots or receipts / supporting proof'],
      actionPlan: [
        { step: 1, title: 'Gather documentation', detail: 'Locate transaction receipt, order number, and timestamped photos.' },
        { step: 2, title: 'Contact official support channel', detail: 'Submit written ticket through formal helpdesk to create a paper trail.' },
        { step: 3, title: 'Request replacement or refund', detail: 'State clearly what resolution is required.' },
        { step: 4, title: 'Escalate if unresolved', detail: 'Contact payment provider dispute department or consumer portal if ignored.' }
      ]
    };

    // Analyze with server AI
    try {
      const response = await fetch('/api/problems/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          problemDescription: `${title}: ${rawInput}`,
          category
        }),
        signal
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const analysis = await response.json();
      newProblem.understanding = analysis.understanding || newProblem.understanding;
      newProblem.missingInformation = Array.isArray(analysis.missingInformation) ? analysis.missingInformation : newProblem.missingInformation;
      newProblem.actionPlan = Array.isArray(analysis.actionPlan) ? analysis.actionPlan : newProblem.actionPlan;
      newProblem.communicationDraft = analysis.communicationDraft || undefined;
      newProblem.submissionLink = analysis.submissionLink || undefined;
      newProblem.status = 'Action Plan Ready';
    } catch (err) {
      console.warn('Problem analyzer error or cancel:', err);
      throw err;
    }

    // Persist to Firestore
    if (db && !isDemoMode && !userId.includes('demo')) {
      try {
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        await setDoc(doc(db, 'users', userId, 'problems', newProblem.id), newProblem);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, getProblemsCollectionPath(userId));
      }
    }

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    setProblems(prev => [newProblem, ...prev]);

    // Create action item for this problem
    addAction({
      title: `Submit claim: ${newProblem.title}`,
      priority: 'NOW',
      reason: `Action required for ${category} problem`,
      dueDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0],
      requiredDocument: newProblem.missingInformation[0] || 'Proof of purchase',
      nextStep: newProblem.actionPlan[0]?.detail || 'Follow step 1 in resolution plan',
      sourceType: 'Problem',
      sourceId: newProblem.id,
      state: 'Pending'
    });

    return newProblem;
  };

  const updateProblem = async (id: string, updates: Partial<ProblemResolution>) => {
    if (db && userId && !isDemoMode && !userId.includes('demo')) {
      try {
        const probRef = doc(db, 'users', userId, 'problems', id);
        const existingProb = problems.find(p => p.id === id);
        if (existingProb) {
          await setDoc(probRef, { ...existingProb, ...updates }, { merge: true });
        }
      } catch (err) {
        console.warn('Failed to update problem in Firestore:', err);
      }
    }
    setProblems(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
  };

  const resolveProblem = async (id: string) => {
    if (db && userId && !isDemoMode && !userId.includes('demo')) {
      try {
        const probRef = doc(db, 'users', userId, 'problems', id);
        await setDoc(probRef, { status: 'Resolved' }, { merge: true });
      } catch (err) {
        console.warn('Failed to resolve problem in Firestore:', err);
      }
    }
    setProblems(prev => prev.map(p => (p.id === id ? { ...p, status: 'Resolved' } : p)));
    setActions(prev => prev.map(a => (a.sourceId === id ? { ...a, state: 'Completed' } : a)));
  };

  const deleteProblem = async (id: string) => {
    if (db && userId && !isDemoMode && !userId.includes('demo')) {
      try {
        const probRef = doc(db, 'users', userId, 'problems', id);
        await deleteDoc(probRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${userId}/problems/${id}`);
        throw err;
      }
    }
    setProblems(prev => prev.filter(p => p.id !== id));
    setActions(prev => prev.filter(a => a.sourceId !== id));
  };

  const addMissingInfoToProblem = (problemId: string, key: string, value: string) => {
    setProblems(prev =>
      prev.map(p => {
        if (p.id !== problemId) return p;
        const currentProvided = p.providedInformation || {};
        const updatedProvided = { ...currentProvided, [key]: value };
        const missingList = Array.isArray(p.missingInformation) ? p.missingInformation : [];
        const updatedMissing = missingList.filter(item => item !== key);
        return {
          ...p,
          providedInformation: updatedProvided,
          missingInformation: updatedMissing,
          status: updatedMissing.length === 0 ? 'Action Plan Ready' : p.status
        };
      })
    );
  };

  // Opportunity Handlers
  const toggleSaveOpportunity = (id: string) => {
    setOpportunities(prev =>
      prev.map(opp => {
        if (opp.id === id) {
          const nextSaved = !opp.isSaved;
          if (nextSaved) {
            const reqDocs = Array.isArray(opp.requiredDocuments) ? opp.requiredDocuments : [];
            addAction({
              title: `Prepare application for ${opp.title}`,
              priority: 'NEXT',
              reason: `Deadline: ${opp.deadline}`,
              dueDate: opp.deadline,
              requiredDocument: reqDocs[0] || 'Application requirements',
              nextStep: 'Verify active eligibility rules on official portal and gather documents',
              sourceType: 'Opportunity',
              sourceId: opp.id,
              state: 'Pending'
            });
          }
          return { ...opp, isSaved: nextSaved };
        }
        return opp;
      })
    );
  };

  
  const recalculateInsights = async (currentVault?: VaultItem[]) => {
    const activeVault = currentVault || vaultItems;
    
    // Clear auto-generated opportunities (source: 'gemini')
    setOpportunities(prev => prev.filter(o => o.isSaved));

    // 1. Discover new opportunities based on Vault
    try {
      const response = await fetch('/api/opportunities/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({
          userProfile: {
            // Send only minimal eligibility facts
            eligibilityProfile: activeVault.map(v => ({
              category: v.category,
              documentType: v.documentType,
            }))
          }
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.opportunities && Array.isArray(data.opportunities)) {
          setOpportunities(prev => {
            const saved = prev.filter(o => o.isSaved);
            const discovered = data.opportunities.map((o: any) => ({
              ...o,
              whyMatched: o.matchReason || o.whyMatched,
              id: o.id || `opp_auto_${Date.now()}_${Math.random()}`,
              isSaved: false,
              source: 'gemini'
            }));
            
            // Deduplicate by title
            const merged = [...saved];
            for (const newOpp of discovered) {
              if (!merged.find(m => m.title.toLowerCase() === newOpp.title.toLowerCase())) {
                merged.push(newOpp);
              }
            }
            return merged;
          });
        }
      }
    } catch (e) {
      console.log("Discovery error:", e);
    }
    
    // We can also re-check existing opportunities if needed, but discover handles the bulk
    for (const opp of opportunities) {
      if (opp.isSaved) await checkOpportunityEligibility(opp.id);
    }
    // 2. Re-evaluate deadlines based on VaultItems
    // Clear out old generated deadlines and re-create them
    const newDeadlines: DeadlineItem[] = activeVault
      .filter(item => item.expiryDate)
      .map(item => {
        const expiry = new Date(item.expiryDate! + (item.expiryDate!.includes('T') ? '' : 'T00:00:00'));
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        const isPassport = (item.title + ' ' + (item.documentType || '')).toLowerCase().includes('passport');
        const dueSoonThreshold = isPassport ? 60 : 30;

        let status: DeadlineItem['status'] = 'Upcoming';
        if (diffDays < 0) status = 'Overdue';
        else if (diffDays <= dueSoonThreshold) status = 'Due soon';

        return {
          id: `${item.id}-document-expiry`,
          title: `${item.title} Expiration`,
          dueDate: item.expiryDate!,
          priority: 'high' as const,
          status,
          relatedVaultItemId: item.id,
          category: 'Document expiry' as const,
          userId
        };
      });
    
    setDeadlines(prev => {
      // Keep manually added deadlines
      const manual = prev.filter(d => {
        // Exclude strictly generated IDs
        if (d.id.endsWith('-document-expiry') || d.id.startsWith('dl_auto_')) return false;
        
        // Safety net to purge older duplicate generated deadlines from local storage
        const isDuplicate = activeVault.some(v => 
          d.title === `${v.title} Expiration` ||
          d.title === `Renew ${v.title}` ||
          d.title === `Action: ${v.title} Expiry` ||
          d.title === `Reminder: Renew ${v.title}` ||
          d.title.startsWith(`${v.title}:`) ||
          d.title.startsWith(`${v.documentType}:`) ||
          d.title.startsWith(`Personal: Renew ${v.title}`)
        );
        if (isDuplicate) return false;
        
        return true;
      });
      return [...manual, ...newDeadlines];
    });
  };

  const checkOpportunityEligibility = async (opportunityId: string) => {
    const opp = opportunities.find(o => o.id === opportunityId);
    if (!opp) return;

    try {
      const response = await fetch('/api/opportunities/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          opportunityTitle: opp.title,
          userProfile: {
            vaultSummary: vaultItems.map(v => ({
              title: v.title,
              category: v.category,
              documentType: v.documentType,
              issuer: v.issuer,
              notes: v.notes,
              extractedData: v.extractedData
            }))
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setOpportunities(prev =>
          prev.map(item =>
            item.id === opportunityId
              ? {
                  ...item,
                  eligibilityConfidence: data.eligibilityConfidence || item.eligibilityConfidence,
                  whyMatched: data.matchReason || item.whyMatched,
                  requiredDocuments: data.requiredDocuments || item.requiredDocuments
                }
              : item
          )
        );
      }
    } catch (e) {
      console.warn('Failed to check opportunity eligibility:', e);
    }
  };

  // Deadline Handlers
  const addDeadline = (itemData: Omit<DeadlineItem, 'id' | 'userId'>) => {
    if (!userId) return;
    const newDeadline: DeadlineItem = {
      ...itemData,
      id: `dl_${Date.now()}`,
      userId
    };
    setDeadlines(prev => [newDeadline, ...prev]);
  };

  const toggleDeadlineStatus = (id: string) => {
    setDeadlines(prev =>
      prev.map(d => {
        if (d.id === id) {
          const nextStatus = d.status === 'Completed' ? 'Upcoming' : 'Completed';
          return { ...d, status: nextStatus };
        }
        return d;
      })
    );
  };

  const deleteDeadline = (id: string) => {
    setDeadlines(prev => prev.filter(d => d.id !== id));
  };

  // Action Handlers
  const addAction = (itemData: Omit<ActionItem, 'id' | 'userId' | 'createdAt'>) => {
    if (!userId) return;
    const newAction: ActionItem = {
      ...itemData,
      id: `act_${Date.now()}`,
      userId,
      createdAt: new Date().toISOString()
    };
    setActions(prev => [newAction, ...prev]);
  };

  const updateAction = (id: string, updates: Partial<ActionItem>) => {
    setActions(prev => prev.map(a => (a.id === id ? { ...a, ...updates } : a)));
  };

  const toggleActionState = (id: string) => {
    setActions(prev =>
      prev.map(a => {
        if (a.id === id) {
          const nextState = a.state === 'Completed' ? 'Pending' : 'Completed';
          return { ...a, state: nextState };
        }
        return a;
      })
    );
  };

  const deleteAction = (id: string) => {
    setActions(prev => prev.filter(a => a.id !== id));
  };

  // Notifications persistence
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    try {
      localStorage.setItem(notificationsStorageKey, JSON.stringify(notifications));
    } catch (e) {
      console.error('Failed to sync notifications:', e);
    }
  }, [notifications, notificationsStorageKey, isAuthenticated, userId]);

  // Onboarding persistence
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    try {
      localStorage.setItem(onboardingStorageKey, JSON.stringify(isOnboardingCompleted));
    } catch (e) {
      console.error('Failed to sync onboarding state:', e);
    }
  }, [isOnboardingCompleted, onboardingStorageKey, isAuthenticated, userId]);

  // Notification Handlers
  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const snoozeNotification = (id: string, days: number) => {
    const snoozedDate = new Date(Date.now() + days * 86400000).toISOString();
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, snoozedUntil: snoozedDate, isRead: true } : n)));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadNotificationsCount = useMemo(() => {
    const now = new Date().getTime();
    return notifications.filter(n => !n.isRead && (!n.snoozedUntil || new Date(n.snoozedUntil).getTime() <= now)).length;
  }, [notifications]);

  // Onboarding Handlers
  const completeOnboarding = (_preferences?: string[]) => {
    setIsOnboardingCompleted(true);
    if (userId) {
      localStorage.setItem(onboardingStorageKey, JSON.stringify(true));
    }
  };

  const resetOnboarding = () => {
    setIsOnboardingCompleted(false);
    if (userId) {
      localStorage.setItem(onboardingStorageKey, JSON.stringify(false));
    }
  };

  // AI Copilot Handlers
  const sendCopilotMessage = async (content: string, attachments?: CopilotAttachment[]) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

    const userMessage: CopilotMessage = {
      id: `msg_${Date.now()}_u`,
      sender: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
      attachments
    };

    setCopilotMessages(prev => [...prev, userMessage]);
    setIsCopilotLoading(true);

    try {
      // Build safe sanitized context from user's active state
      const sanitizedVault = vaultItems.map(v => ({
        title: v.title,
        category: v.category,
        documentType: v.documentType,
        expiryDate: v.expiryDate,
        status: v.status
      }));

      const sanitizedProblems = problems.map(p => ({
        title: p.title,
        category: p.category,
        status: p.status,
        missingInfo: p.missingInformation
      }));

      const sanitizedDeadlines = deadlines.map(d => ({
        title: d.title,
        category: d.category,
        dueDate: d.dueDate,
        status: d.status
      }));

      const sanitizedActions = actions.map(a => ({
        title: a.title,
        priority: a.priority,
        nextStep: a.nextStep,
        dueDate: a.dueDate,
        state: a.state
      }));

      const sanitizedClaims = insuranceClaims.map(c => ({
        insurer: c.insurerName,
        policyType: c.policyType,
        incident: c.incidentType,
        status: c.status
      }));

      const response = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          message: content.trim(),
          attachments,
          context: {
            userDisplayName: user?.displayName || 'User',
            hasVaultRecords: vaultItems.length > 0,
            vaultSummary: sanitizedVault,
            problemsSummary: sanitizedProblems,
            deadlinesSummary: sanitizedDeadlines,
            actionsSummary: sanitizedActions,
            claimsSummary: sanitizedClaims
          }
        })
      });

      if (!response.ok) {
        throw new Error(`AI service responded with status ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: CopilotMessage = {
        id: `msg_${Date.now()}_a`,
        sender: 'assistant',
        content: data.reply || 'I am ready to assist with your life administration questions.',
        timestamp: new Date().toISOString(),
        suggestedActions: data.suggestedActions || undefined
      };

      setCopilotMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error sending copilot message:', error);
      const errorMessage: CopilotMessage = {
        id: `msg_${Date.now()}_err`,
        sender: 'assistant',
        content: 'I encountered an issue connecting to the AI engine. Please ensure your network connection is active and try again.',
        timestamp: new Date().toISOString()
      };
      setCopilotMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsCopilotLoading(false);
    }
  };

  const clearCopilotChat = () => {
    const welcome: CopilotMessage = {
      id: `msg_welcome_${Date.now()}`,
      sender: 'assistant',
      content: `Hello, ${user?.displayName || 'there'}. Your workspace chat has been cleared. What can I help you resolve?`,
      timestamp: new Date().toISOString(),
      suggestedActions: [
        'Upload and understand a document',
        'Prepare an insurance claim',
        'What deadlines do I have soon?',
        'Generate a formal dispute letter'
      ]
    };
    setCopilotMessages([welcome]);
    if (userId) {
      localStorage.setItem(copilotStorageKey, JSON.stringify([welcome]));
    }
  };

  const extractMissingInformationFromDocument = async (targetField: string, fileData: string, mimeType: string, fileName?: string): Promise<{ extractedValue: string, source: string }> => {
    setIsDocumentAnalyzing(true);
    try {
      const response = await fetch('/api/documents/extract-field', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          targetField,
          fileData,
          mimeType,
          fileName
        })
      });

      if (!response.ok) {
        throw new Error(`Field extraction failed with status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Failed to extract field:", error);
      return { extractedValue: 'Unable to extract information. Please enter manually.', source: 'Error' };
    } finally {
      setIsDocumentAnalyzing(false);
    }
  };

  // PART 2: Document Intelligence Handlers
  const analyzeDocument = async (fileData?: string, mimeType?: string, fileName?: string, textContext?: string): Promise<DocumentAnalysisResult> => {
    setIsDocumentAnalyzing(true);
    try {
      const response = await fetch('/api/documents/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          fileData,
          mimeType,
          fileName,
          textContext,
          userId
        })
      });

      if (!response.ok) {
        throw new Error(`Document analysis failed with status: ${response.status}`);
      }

      const result: DocumentAnalysisResult = await response.json();
      setAnalyzedDocuments(prev => [result, ...prev.filter(d => d.id !== result.id)]);

      return result;
    } catch (error: any) {
      console.error('Error analyzing document:', error);
      throw error;
    } finally {
      setIsDocumentAnalyzing(false);
    }
  };

  const saveAnalyzedDocumentToVault = async (doc: DocumentAnalysisResult) => {
    if (!userId) return;
    const category = (doc as any).category?.toLowerCase() || 'legal';
    const validCategories = ['identity', 'financial', 'health', 'legal', 'education', 'property', 'employment', 'business', 'other', 'documents', 'government'];
    let mappedCategory = validCategories.includes(category) ? category as any : 'documents';
    
    // Explicit mapping to handle Gemini's textual variations
    const docTypeLower = (doc.documentType || '').toLowerCase();
    const titleLower = (doc.title || '').toLowerCase();
    const combinedStr = docTypeLower + ' ' + titleLower + ' ' + category;
    
    if (combinedStr.includes('education') || combinedStr.includes('marks card') || combinedStr.includes('sslc') || combinedStr.includes('puc') || combinedStr.includes('student id') || combinedStr.includes('degree') || combinedStr.includes('study certificate') || combinedStr.includes('10th') || combinedStr.includes('12th') || combinedStr.includes('diploma') || combinedStr.includes('semester')) {
      mappedCategory = 'education';
    } else if (combinedStr.includes('identity') || combinedStr.includes('aadhaar') || combinedStr.includes('driving') || combinedStr.includes('licence') || combinedStr.includes('passport')) {
      mappedCategory = 'identity';
    } else if (combinedStr.includes('financial') || combinedStr.includes('passbook') || combinedStr.includes('bank') || combinedStr.includes('pan')) {
      mappedCategory = 'financial';
    } else if (combinedStr.includes('caste') || combinedStr.includes('income') || combinedStr.includes('government') || combinedStr.includes('ration') || combinedStr.includes('bpl') || combinedStr.includes('certificate')) {
      mappedCategory = 'government'; 
    } else if (combinedStr.includes('insurance') || combinedStr.includes('legal')) {
      mappedCategory = 'documents';
    } else if (mappedCategory === 'legal') {
      mappedCategory = 'documents';
    }
    
    // Calculate Expiry Status
    let expiryStatus: VaultItem['status'] = 'verified';
    if (doc.expiryDate) {
      const expiry = new Date(doc.expiryDate);
      const now = new Date();
      if (expiry < now) {
        expiryStatus = 'expired';
      } else {
        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 60) {
          expiryStatus = 'expiring_soon';
        }
      }
    } else if (doc.hasExpiry) {
      expiryStatus = 'unverified'; // Unknown expiry
    }

    const vaultItem: Omit<VaultItem, 'id' | 'userId' | 'lastUpdated'> = {
      title: doc.title || doc.documentType || 'Uploaded Document',
      category: mappedCategory,
      documentType: doc.documentType || 'Other',
      identifierNumber: doc.maskedIdentifiers?.[0]?.maskedValue || undefined,
      isSensitiveIdentifier: true,
      issuer: doc.issuingOrganization || undefined,
      issueDate: doc.issueDate || undefined,
      expiryDate: doc.expiryDate || undefined,
      hasExpiry: doc.hasExpiry,
      isIncomplete: doc.isIncomplete || false,
      missingFields: doc.requiredDocumentsMentioned || [],
      status: expiryStatus,
      isEncryptedInVault: true,
      notes: `${doc.summary || ''}\n\nImportant Clauses: ${(doc.importantClauses || []).join('; ')}`,
      extractedData: doc.extractedData
    };

    addVaultItem(vaultItem);
  };

  const deleteAnalyzedDocument = (id: string) => {
    setAnalyzedDocuments(prev => prev.filter(d => d.id !== id));
  };

  // PART 2: Insurance Claim Handlers
  const analyzeInsuranceClaim = async (claimData: any): Promise<InsuranceClaim> => {
    setIsClaimAnalyzing(true);
    try {
      const response = await fetch('/api/insurance/analyze-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          ...claimData,
          userId
        })
      });

      if (!response.ok) {
        throw new Error(`Claim analysis failed with status: ${response.status}`);
      }

      const claim: InsuranceClaim = await response.json();
      setInsuranceClaims(prev => [claim, ...prev.filter(c => c.id !== claim.id)]);
      return claim;
    } catch (error: any) {
      console.error('Error analyzing insurance claim:', error);
      throw error;
    } finally {
      setIsClaimAnalyzing(false);
    }
  };

  const updateInsuranceClaim = (id: string, updates: Partial<InsuranceClaim>) => {
    setInsuranceClaims(prev => prev.map(c => c.id === id ? { ...c, ...updates, lastUpdated: new Date().toISOString() } : c));
  };

  const deleteInsuranceClaim = (id: string) => {
    setInsuranceClaims(prev => prev.filter(c => c.id !== id));
  };

  // PART 2: Form Inspection Handlers
  const inspectForm = async (formData: any): Promise<FormInspectionResult> => {
    setIsFormInspecting(true);
    try {
      const response = await fetch('/api/forms/inspect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          ...formData,
          vaultContext: vaultItems.map(v => ({
            title: v.title,
            category: v.category,
            documentType: v.documentType,
            identifierNumber: v.identifierNumber,
            issuer: v.issuer,
            expiryDate: v.expiryDate
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Form inspection failed with status: ${response.status}`);
      }

      const result: FormInspectionResult = await response.json();
      setFormInspections(prev => [result, ...prev.filter(f => f.id !== result.id)]);
      return result;
    } catch (error: any) {
      console.error('Error inspecting form:', error);
      throw error;
    } finally {
      setIsFormInspecting(false);
    }
  };

  // PART 2: Letter Generator Handlers
  const generateLetter = async (params: any): Promise<GeneratedLetter> => {
    setIsLetterGenerating(true);
    try {
      const response = await fetch('/api/letters/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          ...params,
          senderName: user?.displayName || 'User'
        })
      });

      if (!response.ok) {
        throw new Error(`Letter generation failed with status: ${response.status}`);
      }

      const result: GeneratedLetter = await response.json();
      setGeneratedLetters(prev => [result, ...prev.filter(l => l.id !== result.id)]);
      return result;
    } catch (error: any) {
      console.error('Error generating letter:', error);
      throw error;
    } finally {
      setIsLetterGenerating(false);
    }
  };

  const deleteLetter = (id: string) => {
    setGeneratedLetters(prev => prev.filter(l => l.id !== id));
  };

  // Global summaries
  const summaryStats = useMemo(() => {
    const expiringDocsCount = vaultItems.filter(
      v => v.status === 'expiring_soon' || (v.expiryDate && new Date(v.expiryDate) < new Date(Date.now() + 60 * 86400000))
    ).length;

    const urgentDeadlinesCount = deadlines.filter(
      d => d.status !== 'Completed' && (d.status === 'Due soon' || d.priority === 'high')
    ).length;

    const activeProblemsCount = problems.filter(p => p.status !== 'Resolved').length;

    const matchedOpportunitiesCount = opportunities.filter(
      o => o.eligibilityConfidence === 'Likely eligible' || o.isSaved
    ).length;

    const activeClaimsCount = insuranceClaims.filter(c => c.status !== 'Settled').length;
    const analyzedDocsCount = analyzedDocuments.length;

    return {
      expiringDocsCount,
      urgentDeadlinesCount,
      activeProblemsCount,
      matchedOpportunitiesCount,
      totalVaultItems: vaultItems.length,
      activeClaimsCount,
      analyzedDocsCount
    };
  }, [vaultItems, deadlines, problems, opportunities, insuranceClaims, analyzedDocuments]);

  return (
    <LifeOSContext.Provider
      value={{
        vaultItems,
        addVaultItem,
        updateVaultItem,
        deleteVaultItem,
        problems,
        setProblems,
        createProblem,
        updateProblem,
        resolveProblem,
        deleteProblem,
        addMissingInfoToProblem,
        opportunities,
        toggleSaveOpportunity,
        checkOpportunityEligibility,
        recalculateInsights,
        deadlines,
        addDeadline,
        toggleDeadlineStatus,
        deleteDeadline,
        actions,
        addAction,
        updateAction,
        toggleActionState,
        deleteAction,
        notifications,
        unreadNotificationsCount,
        markNotificationRead,
        dismissNotification,
        snoozeNotification,
        clearAllNotifications,
        isOnboardingCompleted,
        completeOnboarding,
        resetOnboarding,
        copilotMessages,
        isCopilotLoading,
        sendCopilotMessage,
        clearCopilotChat,
        analyzedDocuments,
        isDocumentAnalyzing,
        extractMissingInformationFromDocument,
        analyzeDocument,
        saveAnalyzedDocumentToVault,
        deleteAnalyzedDocument,
        insuranceClaims,
        isClaimAnalyzing,
        analyzeInsuranceClaim,
        updateInsuranceClaim,
        deleteInsuranceClaim,
        formInspections,
        isFormInspecting,
        inspectForm,
        generatedLetters,
        isLetterGenerating,
        generateLetter,
        deleteLetter,
        summaryStats
      }}
    >
      {children}
    </LifeOSContext.Provider>
  );
};


export const useLifeOS = (): LifeOSContextType => {
  const context = useContext(LifeOSContext);
  if (!context) {
    throw new Error('useLifeOS must be used within a LifeOSProvider');
  }
  return context;
};

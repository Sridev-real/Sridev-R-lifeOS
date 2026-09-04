import {
  VaultItem,
  ProblemResolution,
  Opportunity,
  DeadlineItem,
  ActionItem,
  InsuranceClaim,
  DocumentAnalysisResult,
  FormInspectionResult,
  GeneratedLetter
} from '../types';

export function getInitialSeedForUser(userId: string, email: string, displayName?: string): {
  vault: VaultItem[];
  problems: ProblemResolution[];
  opportunities: Opportunity[];
  deadlines: DeadlineItem[];
  actions: ActionItem[];
  claims: InsuranceClaim[];
  documents: DocumentAnalysisResult[];
  letters: GeneratedLetter[];
} {
  const cleanEmail = (email || '').toLowerCase();
  const isAlex = cleanEmail.includes('alex') || (displayName && displayName.toLowerCase().includes('alex'));
  const isSridev = cleanEmail.includes('sridev') || (displayName && displayName.toLowerCase().includes('sridev'));

  if (!isAlex && !isSridev) {
    // Brand new real user starts completely clean and empty
    return {
      vault: [],
      problems: [],
      opportunities: [],
      deadlines: [],
      actions: [],
      claims: [],
      documents: [],
      letters: []
    };
  }

  if (isAlex) {
    // Alex Rivera — Freelancer Profile
    const vault: VaultItem[] = [
      {
        id: `v_alex_gst_${userId}`,
        userId,
        title: 'GST / Business Tax Registration',
        category: 'financial',
        documentType: 'Tax Registration Certificate',
        identifierNumber: '27AABCU9603R1ZM',
        isSensitiveIdentifier: true,
        issuer: 'Department of Revenue & GST Network',
        expiryDate: '2028-12-31',
        status: 'verified',
        isEncryptedInVault: true,
        lastUpdated: '2026-09-01T00:00:00.000Z',
        notes: 'Proprietorship registration for creative and software consulting.'
      },
      {
        id: `v_alex_dl_${userId}`,
        userId,
        title: "Driver's License",
        category: 'identity',
        documentType: "Driver's License",
        identifierNumber: 'DL-9482019482',
        isSensitiveIdentifier: true,
        issuer: 'State Department of Motor Vehicles',
        expiryDate: '2026-10-15',
        status: 'expiring_soon',
        isEncryptedInVault: true,
        lastUpdated: '2026-09-01T00:00:00.000Z',
        notes: 'Approaching expiry in 45 days. Medical certificate and eye test required for renewal.'
      }
    ];

    const problems: ProblemResolution[] = [
      {
        id: `prob_alex_inv_${userId}`,
        userId,
        title: 'Client invoice payment overdue (30 days)',
        category: 'Banking / Finance',
        rawInput: 'Client Apex Digital has not settled $3,400 invoice #INV-204 for web consulting delivered 30 days ago. Agreement stipulated Net 15 terms.',
        createdAt: '2026-09-01T00:00:00.000Z',
        status: 'Action Plan Ready',
        understanding: 'The user delivered contracted web consulting services worth $3,400 under invoice #INV-204 with Net-15 terms. The invoice is currently 30 days overdue. Formal notice and escalation are required.',
        missingInformation: ['Signed Statement of Work contract', 'Official client accounts payable email contact'],
        actionPlan: [
          { step: 1, title: 'Send formal overdue notice with late fee clause', detail: 'Transmit polite but firm demand letter referencing invoice #INV-204 and agreed contract terms.', completed: false },
          { step: 2, title: 'Schedule accounts payable phone review', detail: 'Call client finance desk to confirm receipt and invoice approval status.', completed: false },
          { step: 3, title: 'Pause ongoing service deliverables', detail: 'Place dependent project deliverables on temporary administrative hold until account is current.', completed: false },
          { step: 4, title: 'Initiate formal dispute or mediation if unpaid', detail: 'Submit claim to local commercial small claims or arbitration if not settled within 14 days.', completed: false }
        ],
        communicationDraft: `Subject: Formal Notice: Overdue Payment for Invoice #INV-204 (Apex Digital)\n\nDear Apex Digital Accounts Team,\n\nI am following up regarding Invoice #INV-204 for $3,400 covering web consulting services delivered in July 2026. The agreed payment terms were Net 15, and the balance is now 30 days past due.\n\nPlease find the attached invoice copy and bank transfer details. Kindly confirm the processing date for this disbursement by end of week.\n\nThank you for your prompt attention.\n\nBest regards,\nAlex Rivera`
      }
    ];

    const opportunities: Opportunity[] = [
      {
        id: `opp_msme_credit_${userId}`,
        title: 'Micro & Small Enterprise Support Scheme',
        category: 'Financial Assistance',
        shortExplanation: 'Collateral-free credit facilitation and interest subvention for registered freelancers and independent professionals.',
        targetAudience: 'Registered freelancers, micro-enterprises, and independent software consultants',
        eligibilityRequirements: [
          'Active business tax registration (GST / Tax ID)',
          'Minimum 12 months of operational billing history',
          'Clean banking track record without defaults'
        ],
        whyMatched: 'Matches your registered GST business credential in Life Vault.',
        eligibilityConfidence: 'Likely eligible',
        openingDate: '2026-08-01',
        deadline: '2026-11-15',
        benefitAmount: 'Up to $25,000 collateral-free credit at 4% subsidized interest rate',
        requiredDocuments: ['GST Registration Certificate', 'Bank Account Statement (6 Months)', 'PAN Card'],
        missingDocuments: ['Bank Account Statement (6 Months)'],
        verificationStatus: 'Verified with official portal',
        lastVerifiedTimestamp: 'Verified Aug 28, 2026 via Ministry of MSME API',
        officialLink: 'https://msme.gov.in',
        informationalLink: 'https://msme.gov.in/schemes',
        provider: 'Ministry of MSME',
        nextAction: 'Export 6-month bank statement and launch 1-Place application workflow',
        isSaved: true
      },
      {
        id: `opp_skill_grant_${userId}`,
        title: 'Digital Skills & Technology Advancement Fellowship',
        category: 'Fellowships',
        shortExplanation: 'Merit-based sponsorship covering certification fees and project grants for technology professionals.',
        targetAudience: 'Software developers, UI/UX designers, and technology consultants',
        eligibilityRequirements: [
          'Demonstrated portfolio of digital products or client projects',
          'Professional statement of technical purpose',
          'Commitment to 6-month skills advancement track'
        ],
        whyMatched: 'Applicable to independent technology practitioners.',
        eligibilityConfidence: 'Needs verification',
        openingDate: '2026-07-15',
        deadline: '2026-09-30',
        benefitAmount: '$3,500 direct educational fellowship grant',
        requiredDocuments: ['Professional Portfolio / Resume', 'Statement of Purpose'],
        missingDocuments: ['Statement of Purpose'],
        verificationStatus: 'Needs user verification',
        lastVerifiedTimestamp: 'Listed Aug 15, 2026',
        officialLink: 'https://fellowships.example.org',
        informationalLink: 'https://fellowships.example.org/about',
        provider: 'Global Tech Foundation',
        nextAction: 'Verify cohort guidelines on the portal before submitting application',
        isSaved: false
      }
    ];

    const deadlines: DeadlineItem[] = [
      {
        id: `dl_alex_dl_${userId}`,
        userId,
        title: "Driver's License Renewal",
        category: 'Document expiry',
        dueDate: '2026-10-15',
        status: 'Upcoming',
        priority: 'high',
        associatedVaultDocId: vault[1].id,
        notes: 'Renew before expiration to avoid late penalties and test re-examination.'
      },
      {
        id: `dl_alex_gst_${userId}`,
        userId,
        title: 'Quarterly GST Tax Filing',
        category: 'Payment deadline',
        dueDate: '2026-09-20',
        status: 'Upcoming',
        priority: 'high',
        notes: 'File GSTR-1 and reconcile input tax credit.'
      }
    ];

    const actions: ActionItem[] = [
      {
        id: `act_alex_demand_${userId}`,
        userId,
        title: 'Send formal late payment demand letter',
        priority: 'NOW',
        state: 'Pending',
        dueDate: '2026-09-05',
        sourceType: 'Problem',
        sourceId: problems[0].id,
        reason: 'Invoice #INV-204 is 30 days past Net-15 terms ($3,400)',
        requiredDocument: 'Invoice #INV-204 PDF & Signed Agreement',
        nextStep: 'Email accounts payable team with ready draft and late payment clause',
        createdAt: '2026-09-01T00:00:00.000Z'
      },
      {
        id: `act_alex_gst_${userId}`,
        userId,
        title: 'Compile quarterly export earnings for GST',
        priority: 'NEXT',
        state: 'Pending',
        dueDate: '2026-09-20',
        sourceType: 'Deadline',
        reason: 'Quarterly filing cutoff approaching',
        requiredDocument: 'Monthly Bank Statements & Invoices',
        nextStep: 'Generate sales register and upload invoice summaries',
        createdAt: '2026-09-01T00:00:00.000Z'
      }
    ];

    const claims: InsuranceClaim[] = [
      {
        id: `claim_alex_${userId}`,
        userId,
        policyType: 'Professional Equipment & Indemnity',
        policyNumber: '•••• 8192',
        insurerName: 'Chubb Commercial Insurance',
        incidentType: 'Water damage to laptop & workstation display',
        incidentDate: '2026-08-28',
        incidentDescription: 'Water pipe leak in shared co-working workspace caused total hardware failure on M3 MacBook Pro and external 4K monitor.',
        estimatedAmount: '$3,200',
        coverageAssessment: 'Potentially covered — verify with insurer',
        coverageSummary: 'Business personal property and mobile electronic equipment clause covers sudden water damage with an approved repair estimate or technician diagnostic report.',
        applicableClauses: [
          'Section 2.4 (Electronic Data Processing Equipment): Full replacement cost valuation applies if claimed within 30 days of incident.',
          'Standard $250 deductible applies to accidental damage.'
        ],
        importantExclusions: [
          'Wear and tear or gradual deterioration',
          'Damage resulting from gross negligence or intentional acts'
        ],
        requiredDocumentation: [
          { name: 'Apple Authorized Service Diagnostic Report', required: true, uploaded: true, fileName: 'apple_diagnostic_repair_quote.pdf' },
          { name: 'Original Purchase Invoices for MacBook & Monitor', required: true, uploaded: true, fileName: 'macbook_invoice_2024.pdf' },
          { name: 'Photographs of damaged equipment and water leakage source', required: true, uploaded: true, fileName: 'workspace_leak_photo.jpg' },
          { name: 'Co-working facility manager incident verification letter', required: true, uploaded: false }
        ],
        claimDeadlines: [
          'Initial notification: Within 7 days of incident (Completed)',
          'Proof of Loss submission cutoff: 2026-09-28'
        ],
        missingInformation: ['Co-working facility manager incident verification letter'],
        generatedClaimSummary: 'Executive Claim Summary: Commercial Property Claim for MacBook Pro & 4K display ($3,200) due to co-working plumbing rupture on Aug 28, 2026.',
        generatedClaimLetter: `To,\nThe Commercial Claims Adjuster\nChubb Commercial Insurance\n\nSubject: Formal Claim Submission - Policy #POL-••••-8192 (Equipment Water Damage)\n\nDear Claims Team,\n\nI am writing to formally submit a claim under Policy #POL-••••-8192 for severe electronic equipment damage sustained on August 28, 2026, when an overhead pipe failed at my co-working office.\n\nDamaged Items:\n1. Apple MacBook Pro 16-inch (Serial: ••••-9182) - Total Logic Board Failure (Diagnostic attached: $2,499 replacement cost)\n2. Dell UltraSharp 4K Monitor - Internal Power Supply short circuit ($700)\n\nEnclosed are the original purchase invoices, authorized repair estimates, and on-site photographs.\n\nKindly confirm claim registration and provide the assigned adjuster contact details.\n\nSincerely,\nAlex Rivera`,
        generatedEmailDraft: `Subject: Claim Intimation - Policy #POL-••••-8192 - Equipment Water Damage\n\nDear Claims Team,\n\nPlease register my electronic equipment claim for $3,200 following water damage on August 28, 2026. Documentation and repair diagnostics are attached.\n\nBest regards,\nAlex Rivera`,
        questionsToAskInsurer: [
          'Does the policy cover temporary loaner laptop rental while the claim is being processed?',
          'Will the payout be issued via direct ACH wire transfer or physical check?',
          'Is an on-site adjuster inspection required for the damaged hardware?'
        ],
        officialPortalUrl: 'https://claims.chubb.com',
        status: 'Ready to submit',
        createdAt: '2026-08-29T10:00:00.000Z',
        lastUpdated: '2026-09-01T00:00:00.000Z'
      }
    ];

    const documents: DocumentAnalysisResult[] = [
      {
        id: `doc_alex_tax_${userId}`,
        documentType: 'Tax Registration Certificate',
        title: 'GST Tax Registration (Alex Rivera Consulting)',
        issuingOrganization: 'Department of Revenue',
        issueDate: '2024-01-15',
        expiryDate: '2028-12-31',
        associatedName: 'Alex Rivera',
        deadlines: [
          {
            title: 'Quarterly GST Tax Return (GSTR-1)',
            dueDate: '2026-09-20',
            description: 'Mandatory quarterly filing deadline for service exports.'
          }
        ],
        summary: 'Official business tax and GST registration authorizing professional consulting services. Registration is fully active in good standing.',
        suggestedActions: [
          {
            title: 'Reconcile Q3 Invoices & Input Tax Credits',
            description: 'Match bank invoices against GST portal credits prior to Sep 20 cutoff.',
            priority: 'NOW',
            workflowType: 'deadline'
          }
        ],
        importantClauses: [
          'Tax invoice must be raised within 30 days of service delivery.',
          'Monthly e-way bill generation required for inter-state services exceeding threshold.'
        ],
        requiredDocumentsMentioned: ['Bank Statement', 'Client Export Invoices', 'Identity Proof'],
        isIncomplete: false,
        requiresVerification: false,
        confidence: 'High',
        maskedIdentifiers: [{ label: 'GSTIN', maskedValue: '27AABC•••••1ZM' }],
        createdAt: '2026-09-01T00:00:00.000Z'
      }
    ];

    const letters: GeneratedLetter[] = [
      {
        id: `ltr_alex_late_${userId}`,
        letterType: 'Overdue Payment Demand',
        tone: 'firm',
        recipient: 'Accounts Payable Department, Apex Digital Studios',
        subject: 'URGENT: Formal Notice of Overdue Payment — Invoice #INV-204 ($3,400)',
        body: `Date: September 1, 2026\n\nTo,\nThe Accounts Payable Director\nApex Digital Studios LLC\n100 Enterprise Way, Suite 400\nSan Francisco, CA 94105\n\nSubject: Formal Notice of Overdue Payment — Invoice #INV-204 ($3,400.00)\n\nDear Accounts Payable Team,\n\nI am writing to formally request immediate payment for Invoice #INV-204, issued on July 17, 2026, for web architecture and performance consulting services rendered in full.\n\nPursuant to our signed Agreement dated June 1, 2026, payment terms were Net-15 days. As of today, this invoice is 30 days past due.\n\nInvoice Summary:\n- Invoice Number: #INV-204\n- Issue Date: July 17, 2026\n- Agreed Due Date: August 1, 2026\n- Outstanding Amount: $3,400.00 USD\n\nPlease remit payment via wire transfer to the bank details stated on the attached invoice within 5 business days (by September 8, 2026). If payment has already been initiated, kindly provide the ACH/wire transaction tracking number.\n\nThank you for your prompt cooperation.\n\nSincerely,\n\nAlex Rivera\nPrincipal Consultant, Rivera Digital Tech\nPhone: (555) 019-2834\nEmail: alex.rivera@example.com`,
        requiredAttachments: [
          'Copy of Invoice #INV-204',
          'Signed Statement of Work (SOW) Agreement',
          'Client Sign-off & Delivery Acceptance Confirmation'
        ],
        checklist: [
          'Verify wire transfer bank details match invoice footer exactly',
          'Ensure CC to client project sponsor or engineering lead',
          'Save transmission delivery timestamp for your records'
        ],
        createdAt: '2026-09-01T00:00:00.000Z'
      }
    ];

    return { vault, problems, opportunities, deadlines, actions, claims, documents, letters };
  }

  // Sridev Dev Profile (Primary Account)
  const vault: VaultItem[] = [
    {
      id: `v_sridev_pass_${userId}`,
      userId,
      title: 'Passport',
      category: 'identity',
      documentType: 'Passport',
      identifierNumber: 'P78392019',
      isSensitiveIdentifier: true,
      issuer: 'Ministry of External Affairs / Passport Seva',
      expiryDate: '2026-09-22', // Exactly 21 days from 2026-09-01
      status: 'expiring_soon',
      isEncryptedInVault: true,
      lastUpdated: '2026-09-01T00:00:00.000Z',
      notes: 'Indian Passport (36 Pages). Approaching expiration in 21 days. Renewal required to preserve international travel and identity compliance.'
    },
    {
      id: `v_sridev_degree_${userId}`,
      userId,
      title: 'Bachelor of Technology Degree',
      category: 'education',
      documentType: 'Degree Certificate',
      identifierNumber: 'ENG-2024-88492',
      isSensitiveIdentifier: false,
      issuer: 'State Technical University',
      status: 'verified',
      isEncryptedInVault: true,
      lastUpdated: '2026-09-01T00:00:00.000Z',
      notes: 'Computer Science & Engineering. CGPA 8.6/10. Full-time undergraduate program.'
    },
    {
      id: `v_sridev_aadhaar_${userId}`,
      userId,
      title: 'National Identity Card (Aadhaar)',
      category: 'identity',
      documentType: 'National Identity Card',
      identifierNumber: '9840-2391-4920',
      isSensitiveIdentifier: true,
      issuer: 'UIDAI',
      status: 'verified',
      isEncryptedInVault: true,
      lastUpdated: '2026-09-01T00:00:00.000Z',
      notes: 'Verified biometric national identity card linked to primary mobile.'
    }
  ];

  const problems: ProblemResolution[] = [
    {
      id: `prob_sridev_damaged_${userId}`,
      userId,
      title: 'Order #84920 damaged in transit',
      category: 'Shopping / Orders',
      rawInput: 'My electronic package Order #84920 arrived with torn outer shipping packaging and a cracked display screen. Delivery agent dropped the carton and left without waiting for signature.',
      createdAt: '2026-09-01T00:00:00.000Z',
      status: 'Resolution in progress',
      understanding: 'Order #84920 arrived with crushed outer shipping packaging and a cracked display screen. The return window closes in 48 hours. The user needs to submit evidence to secure an immediate replacement unit.',
      missingInformation: [
        'Photographs of crushed outer shipping box with label',
        'Original merchant invoice PDF'
      ],
      actionPlan: [
        { step: 1, title: 'Gather damaged delivery evidence', detail: 'Photograph crushed shipping carton, barcode label, and damaged device screen.', completed: false },
        { step: 2, title: 'Submit replacement dispute ticket', detail: 'Transmit formal dispute draft to customer support within the 48-hour return window.', completed: false },
        { step: 3, title: 'Confirm prepaid courier return pickup', detail: 'Verify scheduled carrier return time and obtain tracking airway bill.', completed: false },
        { step: 4, title: 'Escalate to payment provider if rejected', detail: 'File chargeback dispute with bank if replacement is not issued within 5 business days.', completed: false }
      ],
      communicationDraft: `Subject: Urgent: Replacement Claim for Damaged Shipment (Order #84920)\n\nDear Customer Support Team,\n\nI am writing to formally report that Order #84920 arrived in damaged condition today. The outer shipping carton was crushed during transit, resulting in a fractured screen on the unit.\n\nI have photographed the damaged packaging and attached the evidence along with my original purchase invoice. In accordance with your return policy, I request an immediate replacement unit and a prepaid courier return label.\n\nPlease confirm next steps within 24 hours.\n\nSincerely,\nSridev Dev`
    }
  ];

  const opportunities: Opportunity[] = [
    {
      id: `opp_pm_scholarship_${userId}`,
      title: 'Central Sector Scholarship for College and University Students',
      category: 'Scholarships',
      shortExplanation: 'Merit-cum-means financial assistance for meritorious degree students pursuing regular higher technical and university programs.',
      targetAudience: 'College & university students with >80th percentile in Class 12 pursuing regular degree courses',
      eligibilityRequirements: [
        'Gross parental income below ₹4,50,000 per annum',
        'Enrolled in recognized undergraduate technical/university degree program',
        'Not receiving any other concurrent government scholarship'
      ],
      whyMatched: 'Matches your B.Tech Computer Science degree record in Life Vault.',
      eligibilityConfidence: 'Likely eligible',
      openingDate: '2026-08-15',
      deadline: '2026-10-31',
      benefitAmount: '₹20,000 / academic year (Direct Benefit Transfer to bank account)',
      requiredDocuments: [
        'Income Certificate (Current Year)',
        'Degree / Class 12 Marksheet',
        'National Identity Card (Aadhaar)',
        'Bank Account Passbook'
      ],
      missingDocuments: ['Income Certificate (Current Year)'],
      verificationStatus: 'Verified with official portal',
      lastVerifiedTimestamp: 'Verified Aug 29, 2026 via National Scholarship Portal',
      officialLink: 'https://scholarships.gov.in',
      informationalLink: 'https://scholarships.gov.in/public/faq',
      provider: 'Department of Higher Education',
      nextAction: 'Obtain current financial year income certificate and launch 1-Place application workflow',
      isSaved: true
    },
    {
      id: `opp_skill_fellowship_${userId}`,
      title: 'Digital Skills & Technology Advancement Fellowship',
      category: 'Fellowships',
      shortExplanation: 'Full sponsorship grant covering cloud and artificial intelligence developer certification exams and project stipends.',
      targetAudience: 'Graduating STEM students and early-career software engineers',
      eligibilityRequirements: [
        'Undergraduate degree in Computer Science, IT, or related engineering discipline',
        'Statement of technical purpose & project GitHub repository link'
      ],
      whyMatched: 'Directly applicable to Computer Science and engineering graduates.',
      eligibilityConfidence: 'Likely eligible',
      openingDate: '2026-08-01',
      deadline: '2026-09-30',
      benefitAmount: '$2,500 certification subsidy & developer mentorship',
      requiredDocuments: [
        'Degree Certificate',
        'Resume / Portfolio',
        'Statement of Purpose'
      ],
      missingDocuments: ['Statement of Purpose'],
      verificationStatus: 'Verified with official portal',
      lastVerifiedTimestamp: 'Verified Aug 25, 2026 via Global Tech Portal',
      officialLink: 'https://fellowships.example.org',
      informationalLink: 'https://fellowships.example.org/faq',
      provider: 'Global Tech Foundation',
      nextAction: 'Prepare statement of purpose and submit through official application link',
      isSaved: false
    },
    {
      id: `opp_innovation_grant_${userId}`,
      title: 'National Innovation & Research Grant',
      category: 'Financial Assistance',
      shortExplanation: 'Seed funding and laboratory resources for independent technical prototypes and applied research initiatives.',
      targetAudience: 'Academic researchers, graduate scholars, and university innovators',
      eligibilityRequirements: [
        'Affiliation with a recognized research institution or accredited college',
        'Institutional endorsement letter from Head of Department / Dean'
      ],
      whyMatched: 'Requires formal institution affiliation verification before approval.',
      eligibilityConfidence: 'Needs verification',
      openingDate: '2026-09-01',
      deadline: '2026-11-30',
      benefitAmount: 'Up to ₹5,00,000 prototype research seed grant',
      requiredDocuments: [
        'Project Abstract & Proposal',
        'Institutional Endorsement Letter'
      ],
      missingDocuments: ['Institutional Endorsement Letter', 'Project Abstract & Proposal'],
      verificationStatus: 'Needs user verification',
      lastVerifiedTimestamp: 'Listed Sep 01, 2026',
      officialLink: 'https://dst.gov.in',
      informationalLink: 'https://dst.gov.in/guidelines',
      provider: 'Department of Science & Technology',
      nextAction: 'Obtain university dean endorsement letter to proceed',
      isSaved: false
    }
  ];

  const deadlines: DeadlineItem[] = [
    {
      id: `dl_sridev_pass_${userId}`,
      userId,
      title: 'Passport Expiry',
      category: 'Document expiry',
      dueDate: '2026-09-22',
      status: 'Due soon',
      priority: 'high',
      associatedVaultDocId: vault[0].id,
      notes: 'Expires in 21 days. Start renewal on Passport Seva to prevent travel and KYC disruption.'
    },
    {
      id: `dl_sridev_order_${userId}`,
      userId,
      title: 'Damaged Order Return Window (48h)',
      category: 'Other',
      dueDate: '2026-09-03',
      status: 'Due soon',
      priority: 'high',
      notes: 'Evidence must be submitted before the 48-hour return window expires.'
    },
    {
      id: `dl_sridev_sch_${userId}`,
      userId,
      title: 'College Scholarship Application Deadline',
      category: 'Application deadline',
      dueDate: '2026-10-31',
      status: 'Upcoming',
      priority: 'medium',
      notes: 'Submit verified income certificate and marksheet on National Scholarship Portal.'
    }
  ];

  const actions: ActionItem[] = [
    {
      id: `act_sridev_pass_${userId}`,
      userId,
      title: 'Renew Passport',
      priority: 'NOW',
      state: 'Pending',
      dueDate: '2026-09-22',
      sourceType: 'Vault Expiry',
      sourceId: vault[0].id,
      reason: 'Expires in 21 days',
      requiredDocument: 'Passport Renewal Application & 2 Photos',
      nextStep: 'Start renewal on official Passport Seva portal',
      createdAt: '2026-09-01T00:00:00.000Z'
    },
    {
      id: `act_sridev_order_${userId}`,
      userId,
      title: 'Submit damaged-order evidence',
      priority: 'NOW',
      state: 'Pending',
      dueDate: '2026-09-03',
      sourceType: 'Problem',
      sourceId: problems[0].id,
      reason: 'Return window approaching in 48h',
      requiredDocument: 'Outer box damage photo & Invoice PDF',
      nextStep: 'Upload outer box damage photo & send ready draft to support',
      createdAt: '2026-09-01T00:00:00.000Z'
    },
    {
      id: `act_sridev_sch_${userId}`,
      userId,
      title: 'Complete scholarship document',
      priority: 'NOW',
      state: 'Pending',
      dueDate: '2026-10-31',
      sourceType: 'Opportunity',
      sourceId: opportunities[0].id,
      reason: 'Likely eligible for Central Sector Scholarship',
      requiredDocument: 'Income certificate (current year)',
      nextStep: 'Obtain income certificate and apply on National Scholarship Portal',
      createdAt: '2026-09-01T00:00:00.000Z'
    }
  ];

  const claims: InsuranceClaim[] = [
    {
      id: `claim_sridev_${userId}`,
      userId,
      policyType: 'Comprehensive Health & Mediclaim',
      policyNumber: '•••• 4920',
      insurerName: 'Apex Star Health Insurance Ltd.',
      incidentType: 'Emergency Daycare Surgery (Orthopedic Arthroscopy)',
      incidentDate: '2026-08-20',
      incidentDescription: 'Emergency meniscus arthroscopy and day-care procedure at Fortis Hospital. Paid out of pocket due to pre-authorization delay.',
      estimatedAmount: '₹54,200',
      coverageAssessment: 'Potentially covered — verify with insurer',
      coverageSummary: 'Daycare procedures listed in Section 4.2 are eligible for cashless/reimbursement without requiring continuous 24-hour hospitalization.',
      applicableClauses: [
        'Section 4.2 (Daycare Procedures): 140+ specific surgical procedures covered without 24h hospitalization requirement.',
        'Pre and post hospitalization expenses covered for 30 and 60 days respectively.'
      ],
      importantExclusions: [
        'Consumable charges (hospital gloves, admission kit) amounting to ~₹2,400 are non-payable.',
        'Delayed claim filing past 30 days requires written justification.'
      ],
      requiredDocumentation: [
        { name: 'Original Hospital Discharge Summary with Doctor Stamp', required: true, uploaded: true, fileName: 'fortis_discharge_summary.pdf' },
        { name: 'Detailed Itemized Hospital Bill with Breakup', required: true, uploaded: true, fileName: 'fortis_final_bill_54200.pdf' },
        { name: 'Pharmacy Prescriptions and Cash Memos', required: true, uploaded: true, fileName: 'pharmacy_slips.pdf' },
        { name: 'Pre-authorization Rejection/Delay Letter Copy', required: true, uploaded: false },
        { name: 'Cancelled Bank Cheque for Direct Deposit (NEFT)', required: true, uploaded: true, fileName: 'cancelled_cheque_hdfc.jpg' }
      ],
      claimDeadlines: [
        'Reimbursement claim submission cutoff: 2026-09-19 (30 days from discharge)'
      ],
      missingInformation: ['Pre-authorization Rejection/Delay Letter Copy from TPA desk'],
      generatedClaimSummary: 'Executive Summary: Daycare Arthroscopy Reimbursement Claim (₹54,200) under Policy #POL-••••-4920. Performed at Fortis Hospital on Aug 20, 2026.',
      generatedClaimLetter: `To,\nThe Senior Claims Manager\nApex Star Health Insurance Ltd.\nClaims Processing Hub, Building 4\nBangalore 560025\n\nSubject: Submission of Health Reimbursement Claim - Policy #POL-••••-4920\n\nDear Claims Team,\n\nI am writing to formally submit a reimbursement claim for daycare surgery undergone on August 20, 2026, at Fortis Hospital.\n\nClaim Details:\n- Patient: Sridev Dev\n- Policy No: POL-••••-4920\n- Procedure: Knee Arthroscopy (Daycare Code: DC-104)\n- Total Claim Amount: ₹54,200 (Rupees Fifty Four Thousand Two Hundred)\n\nDue to technical server latency at the hospital TPA desk during admission, cashless processing could not be completed, and bills were settled in cash.\n\nEnclosed are all original stamped discharge summaries, itemized hospital invoices, diagnostic MRI scans, and a cancelled cheque for NEFT settlement.\n\nKindly acknowledge receipt and issue the Claim Reference Number for real-time tracking.\n\nSincerely,\nSridev Dev\nPhone: +91 98402 39149`,
      generatedEmailDraft: `Subject: Reimbursement Claim Intimation - Policy #POL-••••-4920 - Sridev Dev\n\nDear Claims Team,\n\nI have submitted reimbursement documents for my daycare arthroscopy (₹54,200) performed on Aug 20, 2026. Please confirm receipt and provide the tracking claim ID.\n\nWarm regards,\nSridev Dev`,
      questionsToAskInsurer: [
        'Has the Third Party Administrator (TPA) registered the file in their central dashboard?',
        'Are pre-hospitalization MRI scan expenses covered under this same claim ID?',
        'What is the maximum timeline for NEFT direct credit to my bank account?'
      ],
      officialPortalUrl: 'https://claims.starhealth.example.in',
      status: 'Ready to submit',
      createdAt: '2026-08-22T08:30:00.000Z',
      lastUpdated: '2026-09-01T00:00:00.000Z'
    }
  ];

  const documents: DocumentAnalysisResult[] = [
    {
      id: `doc_sridev_inc_${userId}`,
      documentType: 'Income Certificate',
      title: 'Income Certificate (FY 2026-27)',
      issuingOrganization: 'Department of Revenue / Tahsildar Office',
      issueDate: '2025-11-01',
      expiryDate: '2026-10-31',
      associatedName: 'Sridev Dev',
      deadlines: [
        {
          title: 'Income Certificate Annual Validity Cutoff',
          dueDate: '2026-10-31',
          description: 'Certificate valid for 1 academic year. Required for scholarships and fee waivers.'
        }
      ],
      summary: 'Official government revenue certificate verifying annual family household income below ₹2,40,000. Critical for college scholarship and fee exemption schemes.',
      suggestedActions: [
        {
          title: 'Attach to Central Sector Scholarship',
          description: 'Submit this document to fulfill missing requirement on National Scholarship Portal.',
          priority: 'NOW',
          workflowType: 'opportunities'
        }
      ],
      importantClauses: [
        'Valid exclusively for education and financial assistance schemes in academic session 2026-27.',
        'Subject to biometric verification via QR code.'
      ],
      requiredDocumentsMentioned: ['Ration Card / Family Card', 'Salary Slip / Tax Return', 'Identity Proof'],
      isIncomplete: false,
      requiresVerification: false,
      confidence: 'High',
      maskedIdentifiers: [{ label: 'Certificate Ref No.', maskedValue: 'IC-2025-••••-9812' }],
      createdAt: '2026-09-01T00:00:00.000Z'
    }
  ];

  const letters: GeneratedLetter[] = [
    {
      id: `ltr_sridev_damaged_${userId}`,
      letterType: 'Damaged Goods Replacement Notice',
      tone: 'formal',
      recipient: 'Customer Grievances Cell, TechCart Online Retail Ltd.',
      subject: 'Formal Request for Immediate Replacement — Damaged Electronics Shipment (Order #84920)',
      body: `Date: September 1, 2026\n\nTo,\nThe Head of Customer Experience\nTechCart Online Retail Private Limited\nTower B, Logistics Park\nBangalore 560100\n\nSubject: Formal Request for Immediate Replacement — Damaged Order #84920\n\nDear Customer Support Team,\n\nI am writing to formally report receipt of damaged merchandise under Order #84920, delivered to my address today at 11:30 AM.\n\nUpon delivery, the courier outer shipping carton was visibly crushed and punctured. Inspection of the inner product revealed a fractured display and broken chassis.\n\nOrder & Delivery Facts:\n- Order ID: #84920\n- Item: Pro Wireless Ultra Display Unit\n- Invoice Amount: ₹18,499.00\n- Date & Time of Delivery: September 1, 2026 at 11:30 AM\n- Return Policy Window: 48 Hours\n\nPhotographs documenting the damaged exterior box, shipping label, and internal device damage are attached, along with the tax invoice.\n\nIn accordance with TechCart Buyer Protection Policy, I request an immediate replacement dispatch and issuance of a reverse pickup airway bill.\n\nThank you for your prompt resolution.\n\nYours sincerely,\n\nSridev Dev\nPhone: +91 98402 39149\nEmail: sridev.dev@example.com`,
      requiredAttachments: [
        'Photographs of damaged exterior parcel with shipping label',
        'Close-up photographs of fractured device',
        'Official Purchase Tax Invoice PDF'
      ],
      checklist: [
        'Ensure outer barcode label is clearly visible in the attached photos',
        'Transmit within the 48-hour return window cutoff',
        'Keep the original box and packing material intact for courier pickup'
      ],
      createdAt: '2026-09-01T00:00:00.000Z'
    }
  ];

  return { vault, problems, opportunities, deadlines, actions, claims, documents, letters };
}


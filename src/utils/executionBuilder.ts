import { ExecutionPayload } from '../components/execution/OnePlaceExecutionModal';
import { VaultItem, ProblemResolution, Opportunity, DeadlineItem, ActionItem } from '../types';

/**
 * Builds an ExecutionPayload for an expiring Life Vault document
 */
export function buildVaultExpiryPayload(
  vaultItem: VaultItem,
  allVaultItems: VaultItem[] = []
): ExecutionPayload {
  const expiryDate = vaultItem.expiryDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(expiryDate + (expiryDate.includes('T') ? '' : 'T00:00:00'));
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const countdown = diffDays < 0 ? `Overdue by ${Math.abs(diffDays)}d` : diffDays === 0 ? 'Due today' : diffDays === 1 ? 'Due tomorrow' : `Expires in ${diffDays} days`;

  const isPassport = vaultItem.documentType.toLowerCase().includes('passport') || vaultItem.title.toLowerCase().includes('passport');
  const isLicense = vaultItem.documentType.toLowerCase().includes('license') || vaultItem.title.toLowerCase().includes('license');

  const alreadyHave = [
    {
      label: `${vaultItem.documentType} Record in Vault`,
      detail: vaultItem.identifierNumber ? `ID: ${vaultItem.identifierNumber}` : 'Protected record',
      verified: true
    }
  ];

  if (vaultItem.issuer) {
    alreadyHave.push({
      label: 'Issuing Authority on file',
      detail: vaultItem.issuer,
      verified: true
    });
  }

  // Cross-reference other documents in Life Vault
  const aadhaar = allVaultItems.find(v => v.title.toLowerCase().includes('aadhaar') || v.documentType.toLowerCase().includes('identity'));
  if (aadhaar) {
    alreadyHave.push({
      label: 'Current National Identity Proof',
      detail: aadhaar.title,
      verified: true
    });
  }

  const missingItems: string[] = [];
  if (isPassport) {
    missingItems.push('Recent 2x2 passport-standard color photograph');
    missingItems.push('Proof of current residential address (if changed)');
    missingItems.push('Online appointment booking slot');
  } else if (isLicense) {
    missingItems.push('Medical fitness declaration / Form 1A');
    missingItems.push('Recent passport-sized photo');
  } else {
    missingItems.push('Completed renewal application form');
    missingItems.push('Payment of statutory renewal fee');
  }

  const steps = isPassport
    ? [
        {
          step: 1,
          title: 'Register or login on official Passport Seva portal',
          detail: 'Access the government portal to create a renewal application.'
        },
        {
          step: 2,
          title: 'Select "Re-issue of Passport"',
          detail: 'Choose "Validity Expired Within 3 Years / Due to Expire".'
        },
        {
          step: 3,
          title: 'Pay renewal fees & schedule appointment',
          detail: 'Select your nearest Passport Seva Kendra (PSK) or Post Office PSK.'
        },
        {
          step: 4,
          title: 'Attend verification appointment with original documents',
          detail: 'Bring your current passport, appointment receipt, and ID proofs.'
        }
      ]
    : [
        {
          step: 1,
          title: 'Verify renewal requirements',
          detail: `Check guidelines from ${vaultItem.issuer || 'the issuing authority'}.`
        },
        {
          step: 2,
          title: 'Submit renewal application & required proofs',
          detail: 'Provide identity proof and existing document registration number.'
        },
        {
          step: 3,
          title: 'Track application reference',
          detail: 'Monitor processing status until renewed document is issued.'
        }
      ];

  const officialDestination = isPassport
    ? {
        name: 'Passport Seva Official Portal (Ministry of External Affairs)',
        url: 'https://www.passportindia.gov.in',
        isVerified: true,
        disclaimer: 'Official government portal for passport applications and renewals.'
      }
    : isLicense
    ? {
        name: 'Parivahan Sarathi Official Portal (MoRTH)',
        url: 'https://parivahan.gov.in',
        isVerified: true,
        disclaimer: 'Official portal for driving license renewals and vehicle services.'
      }
    : {
        name: vaultItem.issuer ? `${vaultItem.issuer} Official Service` : 'Official Issuing Portal',
        url: 'https://india.gov.in',
        isVerified: true,
        disclaimer: 'Verify current guidelines on the official government website.'
      };

  return {
    id: `vault_exec_${vaultItem.id}`,
    rawSourceId: vaultItem.id,
    type: 'vault_expiry',
    title: `Renew ${vaultItem.title}`,
    category: vaultItem.category,
    sourceLabel: 'Vault Expiry',
    sourceType: 'Vault Expiry',
    whatHappened: `Your ${vaultItem.title} (${vaultItem.documentType}) expires on ${expiryDate}. ${diffDays <= 30 ? 'Immediate renewal is recommended.' : 'Renewal window is open.'}`,
    whyItMatters: isPassport
      ? 'International travel, visas, and most financial KYC regulations require at least 6 months of remaining passport validity. Allowing it to lapse can cause travel cancellations or account restrictions.'
      : 'Using an expired official document can lead to statutory fines, administrative delays, or invalidation of dependent permits.',
    alreadyHave,
    missingItems,
    steps,
    officialDestination,
    deadline: {
      dueDate: expiryDate,
      countdownText: countdown,
      isUrgent: diffDays <= 30
    },
    status: vaultItem.status
  };
}

/**
 * Builds an ExecutionPayload for an active Problem Case
 */
export function buildProblemPayload(
  problem: ProblemResolution,
  allVaultItems: VaultItem[] = []
): ExecutionPayload {
  const alreadyHave = [
    {
      label: 'Problem incident statement',
      detail: `Reported under ${problem.category}`,
      verified: true
    }
  ];

  if (problem.providedInformation) {
    Object.entries(problem.providedInformation).forEach(([k, v]) => {
      alreadyHave.push({
        label: k,
        detail: String(v),
        verified: true
      });
    });
  }

  // Cross-reference user identity from vault
  const idDoc = allVaultItems.find(v => v.category === 'identity');
  if (idDoc) {
    alreadyHave.push({
      label: `Account Owner Identity (${idDoc.title})`,
      detail: 'Available in Life Vault',
      verified: true
    });
  }

  const steps = (problem.actionPlan || []).map(s => ({
    step: s.step,
    title: s.title,
    detail: s.detail,
    completed: s.completed
  }));

  const isShopping = problem.category === 'Shopping / Orders';
  const isFinance = problem.category === 'Banking / Finance';
  const rawLower = ((problem.title || '') + ' ' + (problem.rawInput || '')).toLowerCase();

  let destinationUrl = problem.submissionLink;
  let destinationName = 'Official Submission / Support Page';

  if (!destinationUrl) {
    if (rawLower.includes('amazon')) {
      destinationUrl = 'https://www.amazon.in/gp/help/customer/contact-us';
      destinationName = 'Amazon Customer Support & Returns';
    } else if (rawLower.includes('flipkart')) {
      destinationUrl = 'https://www.flipkart.com/helpcentre';
      destinationName = 'Flipkart Help Centre & Disputes';
    } else if (rawLower.includes('airline') || rawLower.includes('flight')) {
      destinationUrl = 'https://airsewa.gov.in';
      destinationName = 'AirSewa Portal (Ministry of Civil Aviation)';
    } else if (isFinance) {
      destinationUrl = 'https://cms.rbi.org.in';
      destinationName = 'RBI Complaint Management System (CMS)';
    } else {
      destinationUrl = 'https://consumerhelpline.gov.in';
      destinationName = 'National Consumer Helpline (NCH)';
    }
  }

  return {
    id: `prob_exec_${problem.id}`,
    rawSourceId: problem.id,
    type: 'problem',
    title: problem.title,
    category: problem.category,
    sourceLabel: 'Problem Resolution',
    sourceType: 'Problem',
    whatHappened: problem.understanding || problem.rawInput,
    whyItMatters: isShopping
      ? 'E-commerce return windows typically expire in 48 to 72 hours. Timely evidence submission ensures an immediate replacement or full refund without merchant dispute rejection.'
      : isFinance
      ? 'Undisputed late invoices and financial discrepancies can cause severe cashflow stalls or permanent write-offs. Formal paper trails protect your legal and financial remedies.'
      : 'Resolving administrative and service disputes early prevents escalating penalties and lost entitlements.',
    alreadyHave: alreadyHave || [],
    missingItems: Array.isArray(problem.missingInformation) ? problem.missingInformation : [],
    steps: steps || [],
    officialDestination: {
      name: destinationName,
      url: destinationUrl,
      isVerified: true,
      disclaimer: 'Communicate directly through verified official support tickets to maintain a timestamped paper trail.'
    },
    deadline: {
      dueDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0],
      countdownText: 'Return window in 48h',
      isUrgent: true
    },
    communicationDraft: problem.communicationDraft,
    status: problem.status
  };
}

/**
 * Builds an ExecutionPayload for an Opportunity / Scholarship
 */
export function buildOpportunityPayload(
  opp: Opportunity,
  allVaultItems: VaultItem[] = []
): ExecutionPayload {
  // Dynamically calculate what you have vs what is missing against Life Vault
  const alreadyHave: Array<{ label: string; detail?: string; verified?: boolean }> = [];
  const missingItems: string[] = [];

  const required = opp.requiredDocuments || [];
  
  required.forEach(docReq => {
    const docLower = docReq.toLowerCase();
    const match = allVaultItems.find(v => {
      const titleLower = v.title.toLowerCase();
      const typeLower = v.documentType.toLowerCase();
      if (docLower.includes('degree') || docLower.includes('marksheet')) {
        return titleLower.includes('degree') || typeLower.includes('degree') || titleLower.includes('bachelor');
      }
      if (docLower.includes('identity') || docLower.includes('aadhaar') || docLower.includes('pan')) {
        return v.category === 'identity' || titleLower.includes('identity') || titleLower.includes('aadhaar');
      }
      if (docLower.includes('tax') || docLower.includes('gst')) {
        return v.category === 'financial' || titleLower.includes('gst') || titleLower.includes('tax');
      }
      return titleLower.includes(docLower) || docLower.includes(titleLower);
    });

    if (match) {
      alreadyHave.push({
        label: `${docReq} (Matched: ${match.title})`,
        detail: 'Ready in Life Vault',
        verified: true
      });
    } else {
      missingItems.push(docReq);
    }
  });

  const steps = [
    {
      step: 1,
      title: 'Review eligibility criteria & required documentation',
      detail: opp.whyMatched || 'Verify income, age, and academic qualifications on the official portal.'
    },
    {
      step: 2,
      title: 'Gather missing certificates',
      detail: missingItems.length > 0 ? `Obtain: ${missingItems.join(', ')}` : 'All basic documents are ready in your Vault.'
    },
    {
      step: 3,
      title: 'Submit application on official portal',
      detail: `Submit your profile and upload certified documents through ${opp.provider}.`
    },
    {
      step: 4,
      title: 'Record application reference number',
      detail: 'Add your confirmation number to Deadlines to track approval and disbursement.'
    }
  ];

  return {
    id: `opp_exec_${opp.id}`,
    rawSourceId: opp.id,
    type: 'opportunity',
    title: opp.title,
    category: opp.category,
    sourceLabel: opp.category === 'Scholarships' ? 'Scholarship Opportunity' : 'Opportunity & Benefit',
    sourceType: 'Opportunity',
    whatHappened: `${opp.shortExplanation} Offered by ${opp.provider}.`,
    whyItMatters: opp.whyMatched || 'You may qualify for financial sponsorship, scheme grants, or tuition assistance based on your profile in Life Vault.',
    alreadyHave,
    missingItems,
    steps,
    officialDestination: {
      name: `${opp.provider} Official Portal`,
      url: opp.officialLink || opp.sourceUrl || 'https://scholarships.gov.in',
      isVerified: true,
      disclaimer: 'Official verified government or educational program portal.'
    },
    deadline: opp.deadline ? {
      dueDate: opp.deadline,
      countdownText: `Deadline: ${opp.deadline}`,
      isUrgent: false
    } : undefined,
    status: opp.eligibilityConfidence
  };
}

/**
 * Builds an ExecutionPayload for an Action item
 */
export function buildActionPayload(
  action: ActionItem,
  allVaultItems: VaultItem[] = [],
  allProblems: ProblemResolution[] = [],
  allOpps: Opportunity[] = []
): ExecutionPayload {
  // 1. Check if linked to vault item directly or via deadline/expiry
  const cleanSourceId = action.sourceId?.replace('-document-expiry', '');
  const matchedVault = allVaultItems.find(v => 
    v.id === action.sourceId || 
    v.id === cleanSourceId ||
    action.title.toLowerCase().includes(v.title.toLowerCase())
  );
  if ((action.sourceType === 'Vault Expiry' || action.sourceType === 'Deadline') && matchedVault) {
    return buildVaultExpiryPayload(matchedVault, allVaultItems);
  }

  // 2. If linked to problem
  if (action.sourceType === 'Problem' && action.sourceId) {
    const prob = allProblems.find(p => p.id === action.sourceId);
    if (prob) return buildProblemPayload(prob, allVaultItems);
  }

  // 3. If linked to opportunity
  if (action.sourceType === 'Opportunity' && action.sourceId) {
    const opp = allOpps.find(o => o.id === action.sourceId);
    if (opp) return buildOpportunityPayload(opp, allVaultItems);
  }

  // 4. Check for recognized domain tasks (Tax, Lease, etc.)
  const titleLower = action.title.toLowerCase();
  const reasonLower = (action.reason || '').toLowerCase();

  // Cross-reference vault identity items
  const vaultIdProofs = allVaultItems
    .filter(v => v.category === 'identity')
    .map(v => ({ label: `Identity Proof (${v.title})`, detail: 'Verified in Life Vault', verified: true }));

  if (titleLower.includes('tax') || titleLower.includes('itr') || reasonLower.includes('tax')) {
    return {
      id: `act_exec_${action.id}`,
      rawSourceId: action.id,
      type: 'action',
      title: action.title,
      sourceLabel: 'Tax Filing Action',
      sourceType: action.sourceType || 'Personal',
      whatHappened: action.reason || 'Annual income tax return filing and compliance verification.',
      whyItMatters: 'Timely tax filing avoids statutory penalties, interest under Section 234, and ensures valid carrying-forward of losses.',
      alreadyHave: vaultIdProofs.length > 0 ? vaultIdProofs : [{ label: 'PAN Card Record', detail: 'On file in Vault', verified: true }],
      missingItems: [
        'Form 16 / Annual Information Statement (AIS)',
        'Eligible deduction proofs (Section 80C, 80D, HRA)'
      ],
      steps: [
        { step: 1, title: 'Download AIS & Form 26AS', detail: 'Access tax credit statements on the Income Tax e-Filing portal.' },
        { step: 2, title: 'Consolidate income and eligible deductions', detail: 'Match salary certificates and financial interest statements.' },
        { step: 3, title: 'Submit & e-Verify return', detail: 'File ITR and e-verify immediately via Aadhaar OTP.' }
      ],
      officialDestination: {
        name: 'Income Tax e-Filing Portal (Government of India)',
        url: 'https://www.incometax.gov.in',
        isVerified: true,
        disclaimer: 'Official government portal for filing and verifying tax returns.'
      },
      deadline: action.dueDate ? {
        dueDate: action.dueDate,
        countdownText: `Due ${action.dueDate}`,
        isUrgent: action.priority === 'NOW'
      } : undefined,
      status: action.state
    };
  }

  if (titleLower.includes('lease') || titleLower.includes('rent') || reasonLower.includes('lease')) {
    return {
      id: `act_exec_${action.id}`,
      rawSourceId: action.id,
      type: 'action',
      title: action.title,
      sourceLabel: 'Tenancy Action',
      sourceType: action.sourceType || 'Personal',
      whatHappened: action.reason || 'Residential lease agreement renewal and security deposit reconciliation.',
      whyItMatters: 'An active tenancy agreement protects legal rights, lock-in period terms, and valid address proof.',
      alreadyHave: vaultIdProofs.length > 0 ? vaultIdProofs : [{ label: 'Identity Proof', detail: 'Available in Vault', verified: true }],
      missingItems: [
        'Draft of updated lease terms with landlord',
        'Recent rent payment receipt / bank transaction slip'
      ],
      steps: [
        { step: 1, title: 'Review existing lease terms', detail: 'Confirm notice period and escalation percentage.' },
        { step: 2, title: 'Agree on revised terms', detail: 'Confirm monthly rent, maintenance, and renewal duration.' },
        { step: 3, title: 'Execute signed agreement', detail: 'Obtain stamp paper or e-stamping and exchange signatures.' }
      ],
      officialDestination: {
        name: 'Personal Task — No external portal required',
        url: undefined,
        isVerified: true,
        disclaimer: 'Private contractual agreement managed directly with landlord.'
      },
      deadline: action.dueDate ? {
        dueDate: action.dueDate,
        countdownText: `Due ${action.dueDate}`,
        isUrgent: action.priority === 'NOW'
      } : undefined,
      status: action.state
    };
  }

  // Insurance Claim / Allianz action payload
  const nextStepLower = (action.nextStep || '').toLowerCase();
  const isInsuranceClaim =
    titleLower.includes('insurance') ||
    titleLower.includes('allianz') ||
    titleLower.includes('claim') ||
    reasonLower.includes('insurance') ||
    reasonLower.includes('allianz') ||
    nextStepLower.includes('allianz') ||
    nextStepLower.includes('claims portal');

  if (isInsuranceClaim) {
    const isAllianz =
      titleLower.includes('allianz') ||
      reasonLower.includes('allianz') ||
      nextStepLower.includes('allianz');

    const destUrl = action.submissionLink || (isAllianz ? 'https://www.allianz-assistance.com' : undefined);

    const insuranceMissing: string[] = [];
    if (action.requiredDocument) {
      insuranceMissing.push(action.requiredDocument);
    } else {
      insuranceMissing.push('Itemized Invoices & Diagnostic/Repair Reports');
    }

    return {
      id: `act_exec_${action.id}`,
      rawSourceId: action.id,
      type: 'action',
      title: action.title,
      sourceLabel: 'Insurance Claim Action',
      sourceType: action.sourceType || 'Problem',
      whatHappened: action.reason || 'Filing cutoff approaching for insurance claim documentation.',
      whyItMatters: 'Submitting itemized invoices and documentation before the policy deadline ensures reimbursement eligibility.',
      alreadyHave: vaultIdProofs.length > 0 ? vaultIdProofs : [{ label: 'Personal ID & Policy Record', detail: 'Available in Vault', verified: true }],
      missingItems: insuranceMissing,
      steps: [
        {
          step: 1,
          title: 'Review required claim documents',
          detail: action.requiredDocument || 'Gather all itemized bills, receipts, and incident documentation.'
        },
        {
          step: 2,
          title: 'Upload completed documents to claims portal',
          detail: action.nextStep || (isAllianz ? 'Upload completed documents to Allianz Global Assistance claims portal' : 'Submit documentation to insurer portal.')
        },
        {
          step: 3,
          title: 'Retain claim reference and track settlement',
          detail: 'Confirm claim registration number and follow up on surveyor or settlement timeline.'
        }
      ],
      officialDestination: {
        name: isAllianz ? 'Allianz Global Assistance Official Website' : (action.submissionLink ? 'Official Insurer Portal' : 'Official Claims Website'),
        url: destUrl,
        isVerified: true,
        disclaimer: isAllianz
          ? 'Verified official Allianz Global Assistance portal. Opens in a new tab.'
          : 'Verified official insurer claims destination.'
      },
      deadline: action.dueDate ? {
        dueDate: action.dueDate,
        countdownText: `Due ${action.dueDate}`,
        isUrgent: action.priority === 'NOW'
      } : undefined,
      status: action.state
    };
  }

  // 5. Generic personal action payload
  const missingItems: string[] = [];
  if (action.requiredDocument) {
    missingItems.push(action.requiredDocument);
  }

  return {
    id: `act_exec_${action.id}`,
    rawSourceId: action.id,
    type: 'action',
    title: action.title,
    sourceLabel: 'Action Center',
    sourceType: action.sourceType || 'Personal',
    whatHappened: action.reason || action.title,
    whyItMatters: action.reason || 'Important task tracked in your Action Center.',
    alreadyHave: vaultIdProofs.length > 0 ? vaultIdProofs : [{ label: 'Personal Profile Record', detail: 'Registered in LifeOS', verified: true }],
    missingItems,
    steps: [
      {
        step: 1,
        title: 'Review task requirements',
        detail: action.reason || 'Review what is needed before proceeding.'
      },
      {
        step: 2,
        title: 'Execute action',
        detail: action.nextStep || 'Follow the planned operational steps.'
      },
      {
        step: 3,
        title: 'Confirm and record outcome',
        detail: 'Mark this action completed in Action Center.'
      }
    ],
    officialDestination: action.submissionLink ? {
      name: 'Official Submission / Support Page',
      url: action.submissionLink,
      isVerified: true,
      disclaimer: 'Official verified destination for this task.'
    } : {
      name: 'Personal Task — No external portal required',
      url: undefined,
      isVerified: true,
      disclaimer: 'Self-managed action.'
    },
    deadline: action.dueDate ? {
      dueDate: action.dueDate,
      countdownText: `Due ${action.dueDate}`,
      isUrgent: action.priority === 'NOW'
    } : undefined,
    status: action.state
  };
}

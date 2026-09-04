const fs = require('fs');
let code = fs.readFileSync('src/context/LifeOSContext.tsx', 'utf-8');

const anchor = `    const vaultItem: Omit<VaultItem, 'id' | 'userId' | 'lastUpdated'> = {
      title: doc.title || doc.documentType || 'Uploaded Document',
      category: mappedCategory,
      documentType: doc.documentType || 'Other',
      identifierNumber: doc.maskedIdentifiers?.[0]?.maskedValue || undefined,
      isSensitiveIdentifier: true,
      issuer: doc.issuingOrganization || undefined,
      issueDate: doc.issueDate || undefined,
      expiryDate: doc.expiryDate || (doc.deadlines?.[0]?.dueDate || undefined),
      status: doc.expiryDate ? 'verified' : 'verified',
      isEncryptedInVault: true,
      notes: \`\${doc.summary || ''}\\n\\nImportant Clauses: \${(doc.importantClauses || []).join('; ')}\`,
      extractedData: doc.extractedData
    };`;

const patch = `    const vaultItem: Omit<VaultItem, 'id' | 'userId' | 'lastUpdated'> = {
      title: doc.title || doc.documentType || 'Uploaded Document',
      category: mappedCategory,
      documentType: doc.documentType || 'Other',
      identifierNumber: doc.maskedIdentifiers?.[0]?.maskedValue || undefined,
      isSensitiveIdentifier: true,
      issuer: doc.issuingOrganization || undefined,
      issueDate: doc.issueDate || undefined,
      expiryDate: doc.expiryDate || (doc.deadlines?.[0]?.dueDate || undefined),
      hasExpiry: doc.hasExpiry,
      isIncomplete: doc.isIncomplete || false,
      missingFields: doc.requiredDocumentsMentioned || [],
      status: doc.isIncomplete ? 'unverified' : 'verified',
      isEncryptedInVault: true,
      notes: \`\${doc.summary || ''}\\n\\nImportant Clauses: \${(doc.importantClauses || []).join('; ')}\`,
      extractedData: doc.extractedData
    };`;

code = code.replace(anchor, patch);

fs.writeFileSync('src/context/LifeOSContext.tsx', code);
console.log("Done patching saveAnalyzedDocumentToVault");

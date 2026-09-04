const fs = require('fs');
let code = fs.readFileSync('src/context/LifeOSContext.tsx', 'utf-8');

if (!code.includes('recalculateInsights')) {
  // Add recalculateInsights to the Context type
  code = code.replace(
    "checkOpportunityEligibility: (opportunityId: string) => Promise<void>;",
    "checkOpportunityEligibility: (opportunityId: string) => Promise<void>;\n  recalculateInsights: () => Promise<void>;"
  );

  // Implement recalculateInsights
  const implementation = `
  const recalculateInsights = async () => {
    // 1. Recalculate opportunities
    // We will run checkOpportunityEligibility for all seeded opportunities
    // To avoid too many parallel calls, we do it in a loop
    for (const opp of opportunities) {
      await checkOpportunityEligibility(opp.id);
    }
    // 2. Re-evaluate deadlines based on VaultItems
    // Clear out old generated deadlines and re-create them
    const newDeadlines = vaultItems
      .filter(item => item.expiryDate)
      .map(item => ({
        id: \`dl_auto_\${item.id}\`,
        title: \`Renew \${item.title}\`,
        dueDate: item.expiryDate!,
        priority: 'high' as const,
        status: 'Pending' as const,
        relatedVaultItemId: item.id,
        category: 'Document Renewal'
      }));
    
    setDeadlines(prev => {
      // Keep manually added deadlines (those without 'dl_auto_' prefix or whatever logic, actually let's just merge)
      const manual = prev.filter(d => !d.id.startsWith('dl_auto_'));
      return [...manual, ...newDeadlines];
    });
  };
`;

  code = code.replace(
    "const checkOpportunityEligibility = async (opportunityId: string) => {",
    implementation + "\n  const checkOpportunityEligibility = async (opportunityId: string) => {"
  );

  code = code.replace(
    "checkOpportunityEligibility,",
    "checkOpportunityEligibility,\n        recalculateInsights,"
  );

  fs.writeFileSync('src/context/LifeOSContext.tsx', code);
  console.log("Added recalculateInsights.");
} else {
  console.log("recalculateInsights already exists.");
}

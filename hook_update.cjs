const fs = require('fs');
let code = fs.readFileSync('src/context/LifeOSContext.tsx', 'utf-8');

const targetStr = `  const updateVaultItem = (id: string, updates: Partial<VaultItem>) => {
    setVaultItems(prev => prev.map(item => (item.id === id ? { ...item, ...updates, lastUpdated: new Date().toISOString() } : item)));
  };`;

if (code.includes(targetStr)) {
  const replacement = `  const updateVaultItem = (id: string, updates: Partial<VaultItem>) => {
    setVaultItems(prev => prev.map(item => (item.id === id ? { ...item, ...updates, lastUpdated: new Date().toISOString() } : item)));
    setTimeout(() => {
      recalculateInsights().catch(console.error);
    }, 100);
  };`;
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/context/LifeOSContext.tsx', code);
  console.log("Hooked updateVaultItem.");
} else {
  console.log("Could not find updateVaultItem block.");
}

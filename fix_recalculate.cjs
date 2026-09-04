const fs = require('fs');
let code = fs.readFileSync('src/context/LifeOSContext.tsx', 'utf-8');

// 1. Update the interface
code = code.replace(
  /recalculateInsights: \(\) => Promise<void>;/,
  'recalculateInsights: (currentVault?: VaultItem[]) => Promise<void>;'
);

// 2. Update recalculateInsights definition
code = code.replace(
  /const recalculateInsights = async \(\) => \{/,
  'const recalculateInsights = async (currentVault?: VaultItem[]) => {\n    const activeVault = currentVault || vaultItems;'
);

code = code.replace(
  /vaultSummary: vaultItems\.map\(v => \(\{/g,
  'vaultSummary: activeVault.map(v => ({'
);

code = code.replace(
  /const newDeadlines = vaultItems/g,
  'const newDeadlines = activeVault'
);

// 3. Update addVaultItem
code = code.replace(
  /setVaultItems\(prev => \[newItem, \.\.\.prev\]\);\n\s*setTimeout\(\(\) => \{\n\s*recalculateInsights\(\)\.catch\(console\.error\);\n\s*\}, 100\);/g,
  `setVaultItems(prev => {
      const next = [newItem, ...prev];
      setTimeout(() => {
        recalculateInsights(next).catch(console.error);
      }, 100);
      return next;
    });`
);

// 4. Update updateVaultItem
code = code.replace(
  /setVaultItems\(prev => prev\.map\(item => \(item\.id === id \? \{ \.\.\.item, \.\.\.updates, lastUpdated: new Date\(\)\.toISOString\(\) \} : item\)\)\);\n\s*setTimeout\(\(\) => \{\n\s*recalculateInsights\(\)\.catch\(console\.error\);\n\s*\}, 100\);/g,
  `setVaultItems(prev => {
      const next = prev.map(item => (item.id === id ? { ...item, ...updates, lastUpdated: new Date().toISOString() } : item));
      setTimeout(() => {
        recalculateInsights(next).catch(console.error);
      }, 100);
      return next;
    });`
);

// 5. Update deleteVaultItem
code = code.replace(
  /setVaultItems\(prev => prev\.filter\(item => item\.id !== id\)\);\n\s*setTimeout\(\(\) => \{\n\s*recalculateInsights\(\)\.catch\(console\.error\);\n\s*\}, 100\);/g,
  `setVaultItems(prev => {
      const next = prev.filter(item => item.id !== id);
      setTimeout(() => {
        recalculateInsights(next).catch(console.error);
      }, 100);
      return next;
    });`
);


fs.writeFileSync('src/context/LifeOSContext.tsx', code);

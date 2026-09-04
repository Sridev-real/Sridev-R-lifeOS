const fs = require('fs');
let code = fs.readFileSync('src/context/LifeOSContext.tsx', 'utf-8');

const targetStr = "setVaultItems(prev => [newItem, ...prev]);";
if (code.includes(targetStr)) {
  const replacement = `setVaultItems(prev => [newItem, ...prev]);
    setTimeout(() => {
      recalculateInsights().catch(console.error);
    }, 100);`;
  // Let's only replace the first occurrence which is inside addVaultItem
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/context/LifeOSContext.tsx', code);
  console.log("Hooked addVaultItem.");
}

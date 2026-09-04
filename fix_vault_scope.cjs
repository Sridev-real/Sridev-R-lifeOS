const fs = require('fs');
let code = fs.readFileSync('src/context/LifeOSContext.tsx', 'utf-8');
code = code.replace(
  /vaultSummary: vaultItems\.map\(v => \(\{\n\s*title: v\.title,\n\s*category: v\.category,\n\s*documentType: v\.documentType,\n\s*extractedData: v\.extractedData/g,
  `vaultSummary: activeVault.map(v => ({\n              title: v.title,\n              category: v.category,\n              documentType: v.documentType,\n              extractedData: v.extractedData`
);
fs.writeFileSync('src/context/LifeOSContext.tsx', code);

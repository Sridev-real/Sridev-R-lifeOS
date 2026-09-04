const fs = require('fs');
const code = fs.readFileSync('src/pages/LifeVault.tsx', 'utf-8');
const match = code.match(/<button[\s\S]*?recalculateInsights[\s\S]*?<\/button>/);
console.log(match ? match[0] : 'Not found');

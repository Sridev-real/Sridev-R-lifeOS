const fs = require('fs');
let content = fs.readFileSync('src/pages/LifeVault.tsx', 'utf8');

content = content.replace(
  "AlertTriangle, RefreshCw, CheckCircle2",
  "AlertTriangle, RefreshCw, CheckCircle2, Landmark"
);

content = content.replace(
  "{ id: 'documents', label: 'Legal & Insurance', icon: FileCheck },",
  "{ id: 'documents', label: 'Legal & Insurance', icon: FileCheck },\n    { id: 'government', label: 'Government', icon: Landmark },"
);

fs.writeFileSync('src/pages/LifeVault.tsx', content);
console.log('Patched LifeVault.tsx');

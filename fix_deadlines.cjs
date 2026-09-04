const fs = require('fs');
let code = fs.readFileSync('src/context/LifeOSContext.tsx', 'utf-8');

code = code.replace(
/category: 'Document Renewal',\n\s*userId: userId/g,
"category: 'Document expiry' as const,\n        userId"
);

fs.writeFileSync('src/context/LifeOSContext.tsx', code);

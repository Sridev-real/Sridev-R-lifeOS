const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  '6. Expiry date (YYYY-MM-DD format if present, or null)',
  '6. Expiry date (YYYY-MM-DD format if present, or null). NEVER hallucinate or calculate an expiry date. Permanent documents (Aadhaar, Marks Cards, etc.) MUST have null.'
);

fs.writeFileSync('server.ts', content);
console.log('Patched server.ts');

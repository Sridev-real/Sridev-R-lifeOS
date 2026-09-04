const fs = require('fs');
let content = fs.readFileSync('src/types/index.ts', 'utf8');

const regex = /suggestedActions\?: string\[\];/;
const replacement = `suggestedActions?: string[];\n  executionPayload?: any;`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/types/index.ts', content);
console.log('Patched types again');

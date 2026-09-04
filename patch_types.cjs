const fs = require('fs');
let content = fs.readFileSync('src/types/index.ts', 'utf8');

content = content.replace(
  "| 'legal';",
  "| 'legal'\n  | 'government';"
);

fs.writeFileSync('src/types/index.ts', content);
console.log('Patched types');

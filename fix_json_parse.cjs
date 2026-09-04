const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  /const parsed = JSON\.parse\(response\.text \|\| '\{\}'\);/g,
  `const rawText = response.text || '{}';
    const cleanText = rawText.replace(/^\\s*\`\`\`json\\s*|\\s*\`\`\`\\s*$/gi, '');
    const parsed = JSON.parse(cleanText);`
);

fs.writeFileSync('server.ts', code);

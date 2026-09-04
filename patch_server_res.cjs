const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const regex = /res\.json\(\{\\n\s*reply: replyText,\\n\s*source: modelUsed === 'local-intelligence-engine' \? 'system-fallback' : 'gemini',\\n\s*model: modelUsed\\n\s*\}\);/;

const replacement = `res.json({
      reply: replyText,
      source: modelUsed === 'local-intelligence-engine' ? 'system-fallback' : 'gemini',
      model: modelUsed,
      executionPayload
    });`;

content = content.replace(regex, replacement);
fs.writeFileSync('server.ts', content);
console.log('Patched server.ts response');

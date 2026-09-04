const fs = require('fs');
let content = fs.readFileSync('src/context/LifeOSContext.tsx', 'utf8');

const regex = /body: JSON\.stringify\(\{\\n\s*message: content\.trim\(\),\\n\s*attachments,\\n\s*context: \{/;
const replacement = `body: JSON.stringify({
          message: content.trim(),
          history: copilotMessages.map(m => ({ role: m.sender === 'user' ? 'user' : 'model', content: m.content })),
          attachments,
          context: {`;

content = content.replace(regex, replacement);

const regex2 = /suggestedActions: data\.suggestedActions \|\| undefined\\n\s*\};/;
const replacement2 = `suggestedActions: data.suggestedActions || undefined,\n        executionPayload: data.executionPayload || undefined\n      };`;
content = content.replace(regex2, replacement2);

fs.writeFileSync('src/context/LifeOSContext.tsx', content);
console.log('Patched LifeOSContext sendCopilotMessage');

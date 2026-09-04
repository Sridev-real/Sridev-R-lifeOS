const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Find the broken template string
const regex = /const finalInstruction = systemInstruction \+ `[\s\S]*?`\s*;/;

const replacement = `const finalInstruction = systemInstruction + "\\n\\n7. STRUCTURED ACTION EXECUTION:\\nIf the user explicitly asks to 'Save this', 'Add a reminder', 'Create a task', 'Update my record', 'Track this deadline', or asks you to act on a solution, you MUST provide a structured execution payload in JSON format embedded in your response.\\nFormat it EXACTLY like this inside a markdown code block labeled \\"\\\`\\\`\\\`json execution\\":\\n\\\`\\\`\\\`json execution\\n{\\n  \\"id\\": \\"generated-id\\",\\n  \\"type\\": \\"action\\",\\n  \\"title\\": \\"Clear action title\\",\\n  \\"category\\": \\"category\\",\\n  \\"whatHappened\\": \\"Summary of the situation\\",\\n  \\"whyItMatters\\": \\"Why this needs to be done\\",\\n  \\"alreadyHave\\": [{\\"label\\": \\"Requirement\\", \\"verified\\": true}],\\n  \\"missingItems\\": [\\"Missing Requirement\\"],\\n  \\"steps\\": [{\\"step\\": 1, \\"title\\": \\"First Step\\", \\"detail\\": \\"Details\\"}],\\n  \\"deadline\\": {\\"dueDate\\": \\"YYYY-MM-DD\\", \\"isUrgent\\": false}\\n}\\n\\\`\\\`\\\`\\n";`;

content = content.replace(regex, replacement);
fs.writeFileSync('server.ts', content);
console.log('Fixed server.ts syntax');

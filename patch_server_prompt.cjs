const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const regex = /7\. STRUCTURED ACTION EXECUTION:[\s\S]*?\`\`\`/g;

const replacement = `7. STRUCTURED ACTION EXECUTION:
If the user explicitly asks to "Save this", "Add a reminder", "Create a task", "Update my record", "Track this deadline", or asks you to act on a solution, you MUST provide a structured execution payload in JSON format embedded in your response. 
Format it EXACTLY like this inside a markdown code block labeled \`\`\`json execution:
\`\`\`json execution
{
  "id": "generated-id",
  "type": "action",
  "title": "Clear action title",
  "category": "category",
  "whatHappened": "Summary of the situation",
  "whyItMatters": "Why this needs to be done",
  "alreadyHave": [{"label": "Requirement", "verified": true}],
  "missingItems": ["Missing Requirement"],
  "steps": [{"step": 1, "title": "First Step", "detail": "Details"}],
  "deadline": {"dueDate": "YYYY-MM-DD", "isUrgent": false}
}
\`\`\``;

content = content.replace(regex, replacement);

fs.writeFileSync('server.ts', content);
console.log('Patched server.ts prompt again');

const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  "12. requiredDocumentsMentioned (array of strings)", 
  "12. requiredDocumentsMentioned (array of strings): For standard documents, list missing REQUIRED fields (e.g. 'Annual Family Income'). If none missing, leave empty. DO NOT ask for expiry if not applicable."
);

fs.writeFileSync('server.ts', code);
console.log("Done patching prompt 2.");

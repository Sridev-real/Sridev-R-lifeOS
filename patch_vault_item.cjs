const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf-8');

code = code.replace("status: 'verified' | 'unverified' | 'expiring_soon' | 'expired';", "status: 'verified' | 'unverified' | 'expiring_soon' | 'expired';\n  isIncomplete?: boolean;\n  missingFields?: string[];");
code = code.replace("isIncomplete: boolean;\n  hasExpiry?: boolean;", "isIncomplete: boolean;\n  hasExpiry?: boolean;\n  missingFields?: string[];");

fs.writeFileSync('src/types/index.ts', code);
console.log("Done patching VaultItem types.");

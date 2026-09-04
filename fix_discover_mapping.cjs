const fs = require('fs');
let code = fs.readFileSync('src/context/LifeOSContext.tsx', 'utf-8');

if (code.includes('whyMatched: o.matchReason || o.whyMatched,')) {
  console.log("Already mapped.");
} else {
  // Find where we map discovered opportunities
  code = code.replace(
    /const discovered = data.opportunities.map\(\(o: any\) => \(\{\n\s*\.\.\.o,\n\s*id:/,
    `const discovered = data.opportunities.map((o: any) => ({\n              ...o,\n              whyMatched: o.matchReason || o.whyMatched,\n              id:`
  );
  fs.writeFileSync('src/context/LifeOSContext.tsx', code);
  console.log("Fixed discover mapping.");
}

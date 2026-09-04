const fs = require('fs');
let content = fs.readFileSync('src/context/LifeOSContext.tsx', 'utf8');

const regex = /const mappedCategory = validCategories\.includes\(category\) \? category as any : 'legal';/;

const replacement = `let mappedCategory = validCategories.includes(category) ? category as any : 'documents';
    
    // Explicit mapping to handle Gemini's textual variations
    const docTypeLower = (doc.documentType || '').toLowerCase();
    const titleLower = (doc.title || '').toLowerCase();
    const combinedStr = docTypeLower + ' ' + titleLower + ' ' + category;
    
    if (combinedStr.includes('education') || combinedStr.includes('marks card') || combinedStr.includes('sslc') || combinedStr.includes('puc') || combinedStr.includes('student id') || combinedStr.includes('degree') || combinedStr.includes('study certificate')) {
      mappedCategory = 'education';
    } else if (combinedStr.includes('identity') || combinedStr.includes('aadhaar') || combinedStr.includes('driving') || combinedStr.includes('licence') || combinedStr.includes('passport')) {
      mappedCategory = 'identity';
    } else if (combinedStr.includes('financial') || combinedStr.includes('passbook') || combinedStr.includes('bank') || combinedStr.includes('pan')) {
      mappedCategory = 'financial';
    } else if (combinedStr.includes('insurance') || combinedStr.includes('legal')) {
      mappedCategory = 'documents'; // Documents corresponds to Legal & Insurance in UI
    } else if (combinedStr.includes('government') || combinedStr.includes('income certificate') || combinedStr.includes('caste certificate') || combinedStr.includes('ration') || combinedStr.includes('bpl')) {
      mappedCategory = 'government';
    }`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/context/LifeOSContext.tsx', content);
console.log('Patched LifeOSContext category mapping');

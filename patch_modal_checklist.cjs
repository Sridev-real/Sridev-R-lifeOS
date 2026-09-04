const fs = require('fs');
let code = fs.readFileSync('src/components/documents/DocumentUploadModal.tsx', 'utf-8');

const checklistAnchor = `                  {(analysisResult.requiredDocumentsMentioned || [
                    'Government photo identity proof',
                    'Recent passport-sized photographs',
                    'Proof of residential address'
                  ]).map((reqItem, idx) => {
                    const status = idx === 0 ? 'vault' : idx === 1 ? 'missing' : 'verify';`;

const checklistPatch = `                  {(analysisResult.requiredDocumentsMentioned || []).map((reqItem, idx) => {
                    // Properly cross-reference Life Vault to see if we have it
                    // For now, we will mark it Needs Verification unless it explicitly matches a known doc.
                    const vaultHasItem = vaultItems.some(vi => vi.title.toLowerCase().includes(reqItem.toLowerCase()) || vi.documentType.toLowerCase().includes(reqItem.toLowerCase()));
                    const status = vaultHasItem ? 'vault' : 'verify';`;

code = code.replace(checklistAnchor, checklistPatch);

fs.writeFileSync('src/components/documents/DocumentUploadModal.tsx', code);
console.log("Done patching DocumentUploadModal checklist");

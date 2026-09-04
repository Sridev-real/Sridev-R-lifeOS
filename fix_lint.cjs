const fs = require('fs');

// Fix DocumentUploadModal.tsx
let docCode = fs.readFileSync('src/components/documents/DocumentUploadModal.tsx', 'utf-8');
docCode = docCode.replace(
  "const { addAction, analyzedDocuments, setAnalyzedDocuments } = useLifeOS();",
  "const { addAction, analyzedDocuments, setAnalyzedDocuments, vaultItems } = useLifeOS();"
);

// Remove the `status === 'missing'` branch since it's obsolete
docCode = docCode.replace(
  `} else if (status === 'missing') {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-semibold shrink-0">
                              <AlertTriangle className="w-3 h-3" /> Missing
                            </span>
                          );`,
  ""
);

// That replace didn't work because I didn't see exactly how it was written, let's use regex
docCode = docCode.replace(
  /status === 'vault' \? \([\s\S]*?\) : status === 'missing' \? \([\s\S]*?\) : \(/,
  "status === 'vault' ? (\n                          <span className=\"inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold shrink-0\">\n                            <Check className=\"w-3 h-3\" /> Available in Vault\n                          </span>\n                        ) : ("
);

fs.writeFileSync('src/components/documents/DocumentUploadModal.tsx', docCode);

// Fix LifeVault.tsx
let vaultCode = fs.readFileSync('src/pages/LifeVault.tsx', 'utf-8');
vaultCode = vaultCode.replace(
  "const { vaultItems, addVaultItem, deleteVaultItem, analyzedDocuments } = useLifeOS();",
  "const { vaultItems, addVaultItem, updateVaultItem, deleteVaultItem, analyzedDocuments } = useLifeOS();"
);
vaultCode = vaultCode.replace(
  "import { Search, Plus, Filter, ShieldCheck, Zap, X, ShieldAlert, GraduationCap, Briefcase, CreditCard, FileCheck, Info, FileText } from 'lucide-react';",
  "import { Search, Plus, Filter, ShieldCheck, Zap, X, ShieldAlert, GraduationCap, Briefcase, CreditCard, FileCheck, Info, FileText, AlertTriangle } from 'lucide-react';"
);

fs.writeFileSync('src/pages/LifeVault.tsx', vaultCode);
console.log("Done fixing linter");

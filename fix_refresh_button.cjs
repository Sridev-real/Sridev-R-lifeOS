const fs = require('fs');
let code = fs.readFileSync('src/pages/LifeVault.tsx', 'utf-8');

const targetStr = "setIsAddModalOpen(true)";

if (code.includes(targetStr)) {
  const replacement = `
          <button
            type="button"
            onClick={async () => {
              if ((window as any).recalculateInsights) {
                await (window as any).recalculateInsights();
              }
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
`;
  
  // Actually, wait, let's use the context
  // find: const { vaultItems, analyzedDocuments, deleteVaultItem } = useLifeOS();
  code = code.replace(
    "const { vaultItems, analyzedDocuments, deleteVaultItem } = useLifeOS();",
    "const { vaultItems, analyzedDocuments, deleteVaultItem, recalculateInsights } = useLifeOS();"
  );
  
  // insert before the Add Item button
  const regex = /<button[^>]*onClick={\(\) => setIsAddModalOpen\(true\)}[^>]*>[\s\S]*?<\/button>/;
  const match = code.match(regex);
  if (match) {
    const finalReplacement = `
          <button
            type="button"
            onClick={async () => {
              if (recalculateInsights) await recalculateInsights();
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
          ${match[0]}
`;
    code = code.replace(match[0], finalReplacement);
  }
  
  if (!code.includes('RefreshCw')) {
    code = code.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { RefreshCw, $1 } from 'lucide-react';");
  }

  fs.writeFileSync('src/pages/LifeVault.tsx', code);
  console.log("Added Reanalyze button.");
}

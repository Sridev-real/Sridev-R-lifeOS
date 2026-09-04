const fs = require('fs');
let code = fs.readFileSync('src/pages/LifeVault.tsx', 'utf-8');

const targetStr = `          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-2xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Item</span>
          </button>`;

if (code.includes(targetStr)) {
  const replacement = `          <button
            type="button"
            onClick={async () => {
              // TODO: connect to context reanalyze
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
${targetStr}`;
  // Let's add RefreshCw to lucide-react import
  if (!code.includes('RefreshCw')) {
    code = code.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { RefreshCw, $1 } from 'lucide-react';");
  }

  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/pages/LifeVault.tsx', code);
  console.log("Added Reanalyze button.");
} else {
  console.log("Could not find Add Item button to insert Reanalyze.");
}

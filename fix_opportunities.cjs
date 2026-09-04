const fs = require('fs');
let code = fs.readFileSync('src/pages/Opportunities.tsx', 'utf-8');

// 1. Add RefreshCw to imports
code = code.replace(
  /CheckCircle2,\n\s*DollarSign,\n\s*Users\n\} from 'lucide-react';/,
  "CheckCircle2,\n  DollarSign,\n  Users,\n  RefreshCw\n} from 'lucide-react';"
);

// 2. Add recalculateInsights to useLifeOS
code = code.replace(
  /const \{ opportunities, toggleSaveOpportunity, checkOpportunityEligibility, vaultItems, addDeadline \} = useLifeOS\(\);/,
  "const { opportunities, toggleSaveOpportunity, checkOpportunityEligibility, vaultItems, addDeadline, recalculateInsights } = useLifeOS();\n  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);"
);

// 3. Add handleRefresh function
code = code.replace(
  /const handleRunAiMatch = async \(oppId: string\) => \{/,
  `const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await recalculateInsights();
      // Optional: show a toast or alert
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRunAiMatch = async (oppId: string) => {`
);

// 4. Add the Refresh button near the header
code = code.replace(
  /<div className="flex items-center gap-1\.5 self-start sm:self-auto">\n\s*<span className="text-\[11px\] font-bold px-2\.5 py-1 rounded-xl bg-emerald-50/,
  `<div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={\`w-3.5 h-3.5 \${isRefreshing ? 'animate-spin' : ''}\`} />
            {isRefreshing ? 'Refreshing opportunities...' : 'Refresh'}
          </button>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-50`
);

fs.writeFileSync('src/pages/Opportunities.tsx', code);

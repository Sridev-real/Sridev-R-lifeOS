const fs = require('fs');
let code = fs.readFileSync('src/pages/LifeVault.tsx', 'utf-8');

// 1. Add states
code = code.replace(
  /const \[editFormData, setEditFormData\] = useState<any>\(\{\}\);/,
  `const [editFormData, setEditFormData] = useState<any>({});\n  const [isRefreshing, setIsRefreshing] = useState(false);\n  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);`
);

// 2. Add message display under the header or above it
code = code.replace(
  /<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">/,
  `{refreshMessage && (
        <div className={\`p-3 mb-4 rounded-xl text-xs font-semibold flex items-center gap-2 \${refreshMessage.includes('error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}\`}>
          <CheckCircle2 className="w-4 h-4" />
          {refreshMessage}
        </div>
      )}\n      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">`
);

// 3. Replace the button
const buttonRegex = /<button[\s\S]*?onClick=\{async \(\) => \{[\s\S]*?if \(recalculateInsights\) await recalculateInsights\(\);[\s\S]*?\}\}[\s\S]*?className="inline-flex items-center justify-center gap-1\.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"[\s\S]*?>[\s\S]*?<RefreshCw className="w-3\.5 h-3\.5 text-indigo-500" \/>[\s\S]*?<span className="hidden sm:inline">Refresh Data<\/span>[\s\S]*?<\/button>/;

const newButton = `<button
            type="button"
            disabled={isRefreshing}
            onClick={async () => {
              if (recalculateInsights) {
                setIsRefreshing(true);
                setRefreshMessage(null);
                try {
                  await recalculateInsights();
                  setRefreshMessage('Life Vault refreshed successfully.');
                  setTimeout(() => setRefreshMessage(null), 3000);
                } catch (e: any) {
                  setRefreshMessage('Refresh error: ' + e.message);
                } finally {
                  setIsRefreshing(false);
                }
              }
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={\`w-3.5 h-3.5 text-indigo-500 \${isRefreshing ? 'animate-spin' : ''}\`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>`;

code = code.replace(buttonRegex, newButton);

fs.writeFileSync('src/pages/LifeVault.tsx', code);

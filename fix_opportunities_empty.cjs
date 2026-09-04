const fs = require('fs');
let code = fs.readFileSync('src/pages/Opportunities.tsx', 'utf-8');

const emptyStateCode = `{/* Opportunity Cards List */}
      {filteredOpportunities.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 space-y-4">
          <Award className="w-8 h-8 text-slate-400 mx-auto opacity-70" />
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No opportunities match your criteria
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              Add more verified documents like an Income Certificate, Caste Certificate, or Academic Transcript to your Life Vault to trigger new matches.
            </p>
          </div>
          
          <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 max-w-md mx-auto text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Your Current Profile Context</span>
            {vaultItems.length === 0 ? (
              <p className="text-xs text-slate-600 dark:text-slate-400">No structured information available in Life Vault yet.</p>
            ) : (
              <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                {vaultItems.slice(0, 5).map(v => (
                  <li key={v.id} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span className="truncate">{v.documentType || v.title}: Verified</span>
                  </li>
                ))}
                {vaultItems.length > 5 && (
                  <li className="text-slate-500 pl-4">+ {vaultItems.length - 5} more documents</li>
                )}
              </ul>
            )}
          </div>
        </div>
      ) : (`;

code = code.replace(
/\{\/\* Opportunity Cards List \*\/\}\s*\{filteredOpportunities\.length === 0 \? \([\s\S]*?\) : \(/,
emptyStateCode
);

fs.writeFileSync('src/pages/Opportunities.tsx', code);

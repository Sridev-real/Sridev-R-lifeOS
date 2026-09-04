const fs = require('fs');
let content = fs.readFileSync('src/pages/Opportunities.tsx', 'utf8');

const regex = /CURRENT PROFILE USED FOR MATCHING[\s\S]*?(<\/div>\s*<\/div>\s*<\/div>\s*\)\s*:\s*\(\s*<div className="space-y-4">)/;

content = content.replace(
  /<span className="text-\[11px\] font-bold uppercase tracking-wider text-slate-500 block mb-2">CURRENT PROFILE USED FOR MATCHING<\/span>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\)\s*:\s*\(\s*<div className="space-y-4">/,
  `<span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">YOUR AVAILABLE DOCUMENTS</span>
            {vaultItems.length === 0 ? (
              <p className="text-xs text-slate-600 dark:text-slate-400">No documents available in Life Vault yet.</p>
            ) : (
              <div className="space-y-1.5">
                {vaultItems.map(v => (
                  <div key={v.id} className="text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="truncate">{v.title || v.documentType}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">`
);

fs.writeFileSync('src/pages/Opportunities.tsx', content);
console.log('Patched Opportunities.tsx');

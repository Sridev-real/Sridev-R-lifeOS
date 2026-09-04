const fs = require('fs');
let code = fs.readFileSync('src/pages/LifeVault.tsx', 'utf-8');

// Insert new missing information state
const importAnchor = `  const [activeExecutionPayload, setActiveExecutionPayload] = useState<ExecutionPayload | null>(null);`;
const importPatch = `  const [activeExecutionPayload, setActiveExecutionPayload] = useState<ExecutionPayload | null>(null);
  const [missingInfoInput, setMissingInfoInput] = useState<string>('');
  const [showMissingInput, setShowMissingInput] = useState<boolean>(false);

  const handleProvideMissingInfo = () => {
    if (!selectedItem || !missingInfoInput.trim()) return;
    
    // Merge new info into extractedData
    const updatedExtractedData = {
      ...(selectedItem.extractedData || {}),
      userProvidedAdditionalInfo: missingInfoInput.trim()
    };
    
    // Update the vault item
    updateVaultItem(selectedItem.id, {
      extractedData: updatedExtractedData,
      isIncomplete: false,
      status: 'verified',
      missingFields: []
    });
    
    // Update local state to reflect UI change immediately
    setSelectedItem(prev => prev ? {
      ...prev,
      extractedData: updatedExtractedData,
      isIncomplete: false,
      status: 'verified',
      missingFields: []
    } : null);
    
    setMissingInfoInput('');
    setShowMissingInput(false);
  };
`;
code = code.replace(importAnchor, importPatch);

const uiAnchor = `                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-[11px]">
                      {item.expiryDate ? \`Expires: \${item.expiryDate}\` : 'Permanent record'}
                    </span>`;
const uiPatch = `                  {item.isIncomplete && (
                    <div className="mb-2 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-200 dark:border-amber-900/60 flex items-center gap-1 w-max">
                      <AlertTriangle className="w-3 h-3" />
                      Missing Information
                    </div>
                  )}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-[11px]">
                      {item.hasExpiry === false ? 'Permanent record' : item.expiryDate ? \`Expires: \${item.expiryDate}\` : 'No Expiry Set'}
                    </span>`;
code = code.replace(uiAnchor, uiPatch);

const modalAnchor = `            {/* Security Guarantee */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Isolated by user account. Never exposed without authorization.</span>
            </div>`;

const modalPatch = `            {selectedItem.isIncomplete && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400 text-xs font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Provide Missing Information
                </div>
                <p className="text-[10px] text-amber-700 dark:text-amber-500 leading-relaxed">
                  Important details (such as {selectedItem.missingFields?.join(', ') || 'required fields'}) could not be extracted from the document.
                </p>
                {showMissingInput ? (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white"
                      placeholder="Enter missing details..."
                      value={missingInfoInput}
                      onChange={(e) => setMissingInfoInput(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleProvideMissingInfo}
                      disabled={!missingInfoInput.trim()}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowMissingInput(true)}
                    className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline"
                  >
                    Provide Now &rarr;
                  </button>
                )}
              </div>
            )}
            
            {/* Security Guarantee */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Isolated by user account. Never exposed without authorization.</span>
            </div>`;

code = code.replace(modalAnchor, modalPatch);

fs.writeFileSync('src/pages/LifeVault.tsx', code);
console.log('Done updating LifeVault.tsx');

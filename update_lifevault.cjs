const fs = require('fs');

let vaultCode = fs.readFileSync('src/pages/LifeVault.tsx', 'utf-8');

// Replace the {selectedItem && ... } block with the new one.
// We'll just define the start and end tokens.
const startToken = "{selectedItem && (";
const endToken = "{/* Add Item Modal */}";

if (!vaultCode.includes('isEditingItem')) {
  // Add state
  vaultCode = vaultCode.replace(
    "const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);",
    "const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);\n  const [isEditingItem, setIsEditingItem] = useState(false);\n  const [editFormData, setEditFormData] = useState<any>({});"
  );
}

const startIndex = vaultCode.indexOf(startToken);
const endIndex = vaultCode.indexOf(endToken);

if (startIndex !== -1 && endIndex !== -1) {
  const newModal = `{selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-5 shadow-xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {selectedItem.category}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isEditingItem ? 'Edit Document Data' : selectedItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedItem(null); setIsEditingItem(false); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isEditingItem ? (
              <div className="space-y-4 text-xs">
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-500 mb-1">Title</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                      value={editFormData.title || ''}
                      onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 mb-1">Document Type</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                        value={editFormData.documentType || ''}
                        onChange={(e) => setEditFormData({...editFormData, documentType: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Category</label>
                      <select 
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                        value={editFormData.category || ''}
                        onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}
                      >
                        <option value="identity">Identity</option>
                        <option value="education">Education</option>
                        <option value="financial">Financial</option>
                        <option value="government">Government</option>
                        <option value="documents">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 mb-1">Issuer / Authority</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                        value={editFormData.issuer || ''}
                        onChange={(e) => setEditFormData({...editFormData, issuer: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Expiration (YYYY-MM-DD)</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                        value={editFormData.expiryDate || ''}
                        placeholder="Leave blank if permanent"
                        onChange={(e) => setEditFormData({...editFormData, expiryDate: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-2">Structured Data</span>
                  <div className="space-y-3">
                    {Object.entries(editFormData.extractedData || {}).map(([key, value], idx) => (
                      <div key={idx}>
                        <label className="block text-[10px] text-indigo-500 font-medium mb-1">{key}</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                          value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          onChange={(e) => {
                            setEditFormData({
                              ...editFormData,
                              extractedData: {
                                ...editFormData.extractedData,
                                [key]: e.target.value
                              }
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingItem(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateVaultItem(selectedItem.id, editFormData);
                      // Force local update so it feels instant
                      setSelectedItem({...selectedItem, ...editFormData});
                      setIsEditingItem(false);
                      // Optionally we can trigger re-evaluation here
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              // Original View Mode
              <>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500">Document Type</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedItem.documentType}</span>
                  </div>

                  {selectedItem.issuer && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="text-slate-500">Issuer / Authority</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedItem.issuer}</span>
                    </div>
                  )}

                  {selectedItem.identifierNumber && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60 items-center">
                      <span className="text-slate-500">Masked Identifier</span>
                      <MaskedValue value={selectedItem.identifierNumber} isSensitive={selectedItem.isSensitiveIdentifier} />
                    </div>
                  )}

                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500">Expiration</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedItem.expiryDate || 'Permanent / No Expiration'}
                    </span>
                  </div>

                  {selectedItem.notes && (
                    <div className="pt-1">
                      <span className="text-slate-500 block mb-1">Notes</span>
                      <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 leading-relaxed">
                        {selectedItem.notes}
                      </p>
                    </div>
                  )}
                </div>

                {selectedItem.extractedData && Object.keys(selectedItem.extractedData).length > 0 && (
                  <div className="pt-2">
                    <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">Structured AI Extract</span>
                    <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
                      {Object.entries(selectedItem.extractedData).map(([key, value], idx) => (
                        <div key={idx} className="flex flex-col">
                          <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedItem.isIncomplete && (
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

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Isolated by user account. Never exposed without authorization.</span>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditFormData(JSON.parse(JSON.stringify(selectedItem)));
                        setIsEditingItem(true);
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      Edit Data
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        deleteVaultItem(selectedItem.id);
                        setSelectedItem(null);
                      }}
                      className="text-rose-600 hover:text-rose-700 text-xs font-medium px-2 py-1 transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedItem(null); setIsEditingItem(false); }}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Item Modal */}`;

  const newVaultCode = vaultCode.substring(0, startIndex) + newModal + vaultCode.substring(endIndex + endToken.length);
  fs.writeFileSync('src/pages/LifeVault.tsx', newVaultCode);
  console.log("Replaced modal block");
} else {
  console.log("Could not find start/end tokens");
}

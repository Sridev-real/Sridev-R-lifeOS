const fs = require('fs');
let code = fs.readFileSync('src/components/documents/DocumentUploadModal.tsx', 'utf-8');

const checklistAnchor = `{/* Requirements Checklist (Vault status vs Missing vs Needs verification) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Document Requirements Checklist</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(analysisResult.requiredDocumentsMentioned || []).map((reqItem, idx) => {`;

const checklistPatch = `{/* Requirements Checklist (Vault status vs Missing vs Needs verification) */}
              {analysisResult.requiredDocumentsMentioned && analysisResult.requiredDocumentsMentioned.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Document Requirements Checklist</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {analysisResult.requiredDocumentsMentioned.map((reqItem, idx) => {`;

code = code.replace(checklistAnchor, checklistPatch);
code = code.replace("</div>\n              </div>\n\n              {/* Document Chat", "</div>\n              </div>\n              )}\n\n              {/* Document Chat");

fs.writeFileSync('src/components/documents/DocumentUploadModal.tsx', code);
console.log("Done patching checklist conditional");

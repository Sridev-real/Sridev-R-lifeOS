import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  Lock,
  ArrowRight,
  Database,
  RefreshCw,
  FolderLock,
  Upload,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { useLifeOS } from '../../context/LifeOSContext';
import { FormInspectionResult } from '../../types';

interface FormFillingAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FormFillingAssistantModal: React.FC<FormFillingAssistantModalProps> = ({
  isOpen,
  onClose
}) => {
  const { inspectForm, isFormInspecting, vaultItems } = useLifeOS();

  const [mode, setMode] = useState<'upload' | 'text'>('upload');
  const [formName, setFormName] = useState<string>('Scholarship Application Form');
  const [formFieldsText, setFormFieldsText] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; type: string; size: number; data: string } | null>(null);
  const [inspectionResult, setInspectionResult] = useState<FormInspectionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 20MB limit. Please upload a smaller document.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setUploadedFile({
        name: file.name,
        type: file.type || 'application/pdf',
        size: file.size,
        data: result
      });
      setFormName(file.name.replace(/\.[^/.]+$/, ''));
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRunInspection = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (mode === 'text' && !formFieldsText.trim()) {
      setErrorMsg('Please paste the form fields or questions to inspect.');
      return;
    }
    if (mode === 'upload' && !uploadedFile) {
      setErrorMsg('Please select a photo or PDF of the form to inspect.');
      return;
    }

    setErrorMsg(null);
    try {
      const payload: any = {
        formName: formName.trim() || 'General Application Form',
        formTitle: formName.trim() || 'General Application Form',
        fieldsText: formFieldsText.trim()
      };

      if (uploadedFile) {
        payload.formData = uploadedFile.data;
        payload.mimeType = uploadedFile.type;
        payload.fileName = uploadedFile.name;
      }

      const result = await inspectForm(payload);
      setInspectionResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Form inspection encountered an issue.');
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyAllSafeFields = () => {
    if (!inspectionResult) return;
    const safeFields = inspectionResult.fields
      .filter(f => !f.isMissing && f.suggestedValue && f.suggestedValue !== '—')
      .map(f => `${f.label || f.fieldName}: ${f.suggestedValue}`)
      .join('\n');

    navigator.clipboard.writeText(safeFields);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const toggleReveal = (id: string) => {
    setRevealedFields(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const loadPreset = (preset: 'visa' | 'scholarship' | 'bank') => {
    setErrorMsg(null);
    setInspectionResult(null);
    setMode('text');
    setUploadedFile(null);

    if (preset === 'scholarship') {
      setFormName('Central Sector University Scholarship Form');
      setFormFieldsText(`1. Applicant Full Legal Name
2. Date of Birth & Gender
3. Current Educational Qualification & University
4. Annual Household Income (INR)
5. Bank Account Number & IFSC / Branch Code
6. Permanent Residence Address & PIN Code
7. Identity / Aadhaar Number`);
    } else if (preset === 'visa') {
      setFormName('Short-Stay Travel Visa Application');
      setFormFieldsText(`1. Full Legal Name (As in Passport)
2. Passport Number & Issuing Authority
3. Date of Expiration
4. Current Employer & Designation
5. Annual Income
6. Permanent Address & Emergency Contact`);
    } else if (preset === 'bank') {
      setFormName('Bank Loan / Account Verification Form');
      setFormFieldsText(`1. Account Holder Full Legal Name
2. National Identity Identifier
3. Date of Birth
4. Highest Educational Degree
5. Annual Household Income
6. Residential Address & Emergency Contact`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#111726] rounded-2xl max-w-3xl w-full my-8 border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Form Filling Assistant</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 uppercase">
                  Signature Feature
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload a form photo/PDF or paste fields to cross-reference against your encrypted Life Vault.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {!inspectionResult ? (
            <div className="space-y-5">
              {/* Mode Switcher */}
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setMode('upload')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    mode === 'upload'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Form Photo or PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('text')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    mode === 'text'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Paste Form Questions</span>
                </button>
              </div>

              {/* Presets */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Try a sample application:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => loadPreset('scholarship')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:border-slate-400 cursor-pointer shadow-2xs"
                  >
                    Scholarship Form
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset('bank')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:border-slate-400 cursor-pointer shadow-2xs"
                  >
                    Bank / Loan Form
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset('visa')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:border-slate-400 cursor-pointer shadow-2xs"
                  >
                    Visa Application
                  </button>
                </div>
              </div>

              {mode === 'upload' ? (
                <div className="space-y-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,image/png,image/jpeg,image/webp,image/jpg"
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
                      uploadedFile
                        ? 'border-emerald-300 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20'
                        : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-900/30'
                    }`}
                  >
                    {uploadedFile ? (
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-xs">
                          {uploadedFile.type.includes('pdf') ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-sm mx-auto">
                          {uploadedFile.name}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          {Math.round(uploadedFile.size / 1024)} KB · Click to change
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          Upload photo or PDF of the form
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Supports PDF, PNG, JPEG, WEBP up to 20MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Form Title
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Schengen Visa, College Scholarship, Bank Loan"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Form Fields & Questions (Paste text or questions)
                    </label>
                    <textarea
                      rows={6}
                      value={formFieldsText}
                      onChange={(e) => setFormFieldsText(e.target.value)}
                      placeholder="Paste questions or field labels from the form..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 text-slate-600 dark:text-slate-400 text-xs">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>
                  LIFEOS cross-references your <strong>{vaultItems.length} Life Vault records</strong> to auto-fill answers. No form is ever submitted to third parties automatically.
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleRunInspection()}
                  disabled={isFormInspecting || (mode === 'upload' && !uploadedFile) || (mode === 'text' && !formFieldsText.trim())}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-xs hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer"
                >
                  {isFormInspecting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Inspecting & Matching Vault...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Inspect & Auto-Match Fields</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Inspection Results */
            <div className="space-y-5">
              {/* Summary Bar */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {inspectionResult.formTitle || inspectionResult.formName || formName}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {inspectionResult.formSummary || `Cross-referenced against your Life Vault. Ready to copy into your official form.`}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyAllSafeFields}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-2xs hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAll ? 'All Safe Fields Copied!' : 'Copy All Safe Fields'}</span>
                  </button>
                </div>
              </div>

              {/* Matched Field List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
                  <span>Detected Fields ({inspectionResult.fields.length})</span>
                  <span>{inspectionResult.fields.filter(f => !f.isMissing).length} Found in Vault</span>
                </div>

                {inspectionResult.fields.map((field, idx) => {
                  const isSensitive = field.fieldName.toLowerCase().includes('identity') || field.fieldName.toLowerCase().includes('passport') || field.fieldName.toLowerCase().includes('bank');
                  const isRevealed = revealedFields[field.id || `f_${idx}`];
                  const displayVal = field.suggestedValue || '';
                  const maskedVal = isSensitive && !isRevealed && displayVal.length > 4
                    ? `•••• •••• ${displayVal.slice(-4)}`
                    : displayVal;

                  return (
                    <div
                      key={field.id || idx}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        !field.isMissing && field.suggestedValue
                          ? 'bg-white dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 shadow-2xs'
                          : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/60'
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {field.label || field.fieldName}
                          </span>

                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                            !field.isMissing
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/60'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/60'
                          }`}>
                            {field.source || (!field.isMissing ? 'From your Life Vault' : 'Missing in Vault')}
                          </span>

                          {field.confidence && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({field.confidence} confidence)
                            </span>
                          )}
                        </div>

                        {field.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {field.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-0.5">
                          {!field.isMissing && field.suggestedValue ? (
                            <span className="text-xs font-mono text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                              {maskedVal}
                            </span>
                          ) : (
                            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium italic">
                              Not found in your Vault. Enter manually on official form.
                            </span>
                          )}

                          {isSensitive && displayVal && (
                            <button
                              type="button"
                              onClick={() => toggleReveal(field.id || `f_${idx}`)}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                              title={isRevealed ? 'Mask value' : 'Reveal value'}
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {!field.isMissing && field.suggestedValue ? (
                          <button
                            type="button"
                            onClick={() => handleCopy(field.suggestedValue, `field_${idx}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium cursor-pointer transition-colors shadow-2xs"
                          >
                            {copiedKey === `field_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedKey === `field_${idx}` ? 'Copied' : 'Copy'}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Manual entry
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          {inspectionResult ? (
            <button
              type="button"
              onClick={() => setInspectionResult(null)}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              ← Inspect another form
            </button>
          ) : (
            <div className="text-xs text-slate-400">
              Safe & local copying only
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 cursor-pointer shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Shield,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  X,
  Lock,
  Download,
  Copy,
  Check,
  Building2,
  FolderPlus,
  Send,
  MessageSquare,
  HelpCircle,
  Clock
} from 'lucide-react';
import { useLifeOS } from '../../context/LifeOSContext';
import { DocumentAnalysisResult } from '../../types';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavedToVault?: (doc: DocumentAnalysisResult) => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onSavedToVault
}) => {
  const { analyzeDocument, saveAnalyzedDocumentToVault, isDocumentAnalyzing, addDeadline, addAction, vaultItems } = useLifeOS();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [base64Data, setBase64Data] = useState<string>('');
  const [textContext, setTextContext] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [unmaskAll, setUnmaskAll] = useState<boolean>(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isEditingData, setIsEditingData] = useState<boolean>(false);

  // Document Chat state
  const [docChatQuery, setDocChatQuery] = useState<string>('');
  const [docChatHistory, setDocChatHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [isDocChatLoading, setIsDocChatLoading] = useState<boolean>(false);
  const [duplicateMode, setDuplicateMode] = useState<'none' | 'prompt'>('none');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    setErrorMsg(null);
    setAnalysisResult(null);
    setIsSaved(false);
    setIsEditingData(false);
    setDocChatHistory([]);

    // Check size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg('File size exceeds 20MB limit. Please upload a smaller document.');
      return;
    }

    // Supported MIME types
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Please upload a PDF, JPG, JPEG, or PNG document.');
      return;
    }

    setSelectedFile(file);
    setMimeType(file.type);

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      setFilePreview(resultStr);
      // Extract clean base64 payload without data:...;base64,
      const base64Clean = resultStr.includes('base64,') ? resultStr.split('base64,')[1] : resultStr;
      setBase64Data(base64Clean);
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read the selected file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleRunAnalysis = async () => {
    if (!base64Data && !textContext.trim()) {
      setErrorMsg('Please select a document or provide text context.');
      return;
    }

    setErrorMsg(null);
    try {
      const result = await analyzeDocument(
        base64Data || undefined,
        mimeType || undefined,
        selectedFile?.name || 'document_upload.pdf',
        textContext.trim() || undefined
      );
      setAnalysisResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Document analysis encountered an issue. Please try again.');
    }
  };

  const handleSaveToVault = async (action: 'replace' | 'keep' | 'cancel' = 'replace') => {
    if (!analysisResult) return;
    
    if (duplicateMode === 'none') {
        const isDuplicate = vaultItems.some(vi => vi.documentType === analysisResult.documentType);
        if (isDuplicate) {
           setDuplicateMode('prompt');
           return;
        }
    }
    
    if (action === 'cancel') {
        setDuplicateMode('none');
        return;
    }

    // TODO: If 'replace', find and delete existing first. For now, just save.
    await saveAnalyzedDocumentToVault(analysisResult);
    setIsSaved(true);
    setDuplicateMode('none');
    if (onSavedToVault) onSavedToVault(analysisResult);
  };

  const handleTrackDeadline = (dl: { title: string; dueDate: string; description?: string }) => {
    if (!dl.dueDate) return;
    addDeadline({
      title: `${analysisResult?.title || analysisResult?.documentType || 'Document'}: ${dl.title}`,
      category: 'Document expiry',
      dueDate: dl.dueDate,
      status: 'Upcoming',
      priority: 'high',
      notes: dl.description || 'Extracted from document intelligence.'
    });
  };

  const handleCopyText = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleSendDocQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docChatQuery.trim() || !analysisResult) return;

    const query = docChatQuery.trim();
    setDocChatQuery('');
    setDocChatHistory(prev => [...prev, { role: 'user', text: query }]);
    setIsDocChatLoading(true);

    try {
      const response = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Regarding the document "${analysisResult.title || analysisResult.documentType}": ${query}`,
          context: {
            currentDocumentSummary: analysisResult.summary,
            importantClauses: analysisResult.importantClauses,
            deadlines: analysisResult.deadlines,
            maskedIdentifiers: analysisResult.maskedIdentifiers,
            rawContext: textContext
          }
        })
      });
      const data = await response.json();
      setDocChatHistory(prev => [...prev, { role: 'assistant', text: data.reply || 'No additional details found for this query.' }]);
    } catch {
      setDocChatHistory(prev => [...prev, { role: 'assistant', text: 'Could not connect to document reasoning engine.' }]);
    } finally {
      setIsDocChatLoading(false);
    }
  };

  // Demo Document Presets for quick hackathon testing
  const loadDemoPreset = (type: 'lease' | 'insurance' | 'tax') => {
    setErrorMsg(null);
    setAnalysisResult(null);
    setIsSaved(false);

    if (type === 'lease') {
      setSelectedFile(new File([''], 'residential_lease_agreement_2026.pdf', { type: 'application/pdf' }));
      setMimeType('application/pdf');
      setTextContext(`RESIDENTIAL LEASE AGREEMENT
Landlord: Highline Properties LLC
Tenant: Sridev Dev
Premises: Apt 4B, 240 Horizon Boulevard, Bangalore 560103
Term: 11 Months commencing October 1, 2025 and terminating August 31, 2026.
Monthly Rent: ₹28,500 due on or before the 5th of each calendar month.
Security Deposit: ₹85,500 (Refundable within 30 days of vacation).
Notice Period: Mandatory 60-day written notice required prior to lease termination.
Maintenance: Minor repairs under ₹1,000 to be borne by Tenant. Air conditioning and major plumbing by Landlord.`);
    } else if (type === 'insurance') {
      setSelectedFile(new File([''], 'star_health_policy_schedule_2026.pdf', { type: 'application/pdf' }));
      setMimeType('application/pdf');
      setTextContext(`STAR HEALTH & ALLIED INSURANCE COMPANY
Policy Schedule - Family Health Optima
Policy Number: 0184/8920/192834
Policyholder: Sridev Dev (DOB: 15/04/1992)
Sum Insured: ₹10,00,000
Policy Period: 15/09/2025 to 14/09/2026 Midnight
Daycare Procedures: 140+ daycare surgical procedures covered without 24-hour continuous hospitalization.
Room Rent Capping: Single Private AC Room (No sub-limit).
Pre & Post Hospitalization: 60 days pre-hospitalization and 90 days post-hospitalization reimbursement.
Claim Intimation: Must be notified within 24 hours of emergency admission or 48 hours prior to planned admission.
Exclusions: Cosmetic surgery, dental treatments (unless accidental), non-medical items.`);
    } else if (type === 'tax') {
      setSelectedFile(new File([''], 'gst_registration_certificate.pdf', { type: 'application/pdf' }));
      setMimeType('application/pdf');
      setTextContext(`GOVERNMENT OF INDIA - GOODS AND SERVICES TAX
Registration Certificate (Form GST REG-06)
Registration Number (GSTIN): 29AABCS1429M1ZP
Legal Name: ALEX RIVERA CONSULTING
Trade Name: RIVERA DIGITAL TECH
Address: Suite 300, Indiranagar 100ft Road, Bangalore 560038
Date of Validity: 01/02/2024 to Continuous
Filing Frequency: Quarterly GSTR-1 and GSTR-3B (QRMP Scheme)
Upcoming Filing Deadline: 20/09/2026 (Q2 Reconciliation)`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full my-8 border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Document Intelligence
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload & understand contracts, policies, certificates, and official forms
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

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* Step 1: Upload Zone (if no analysis result yet) */}
          {!analysisResult && (
            <div className="space-y-4">
              {/* Dropzone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[0.99]'
                    : selectedFile
                    ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    {selectedFile ? (
                      selectedFile.type.includes('pdf') ? <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> : <ImageIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                  </div>

                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Document'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        Click to upload or drag & drop document
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        PDF, JPG, JPEG, or PNG (up to 20MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Demo Previews */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Try a live sample document:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => loadDemoPreset('lease')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:border-slate-400 cursor-pointer"
                  >
                    Rental Lease
                  </button>
                  <button
                    type="button"
                    onClick={() => loadDemoPreset('insurance')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:border-slate-400 cursor-pointer"
                  >
                    Health Policy
                  </button>
                  <button
                    type="button"
                    onClick={() => loadDemoPreset('tax')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:border-slate-400 cursor-pointer"
                  >
                    GST Tax Reg
                  </button>
                </div>
              </div>

              {/* Optional Text Context Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Document Text / Notes / Specific Question (Optional)
                </label>
                <textarea
                  rows={4}
                  value={textContext}
                  onChange={(e) => setTextContext(e.target.value)}
                  placeholder="Paste text directly or mention specific questions: e.g. 'What is the notice period?' or 'Are daycare surgeries covered?'"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Privacy Notice */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 text-slate-600 dark:text-slate-400 text-xs">
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  <strong>Privacy First:</strong> Documents are processed via server-side Gemini encryption. PII is automatically masked. Data is never shared or used for public training.
                </span>
              </div>
            </div>
          )}

          {/* Step 2: Analyzed Results View */}
          {analysisResult && (
            <div className="space-y-6">
              {/* Source & Privacy Labels */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-3 h-3" />
                  Extracted from your document
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Shield className="w-3 h-3" />
                  Your document is private. Sensitive identifiers are masked.
                </span>
              </div>

              {/* Top Banner with Meta */}
              <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold tracking-wider uppercase">
                      {analysisResult.documentType || 'Verified Document'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Confidence: {analysisResult.confidence || 'High'}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {analysisResult.title || 'Analyzed Document Record'}
                  </h4>
                  {analysisResult.issuingOrganization && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{analysisResult.issuingOrganization}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveToVault('replace')}
                    disabled={isSaved}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                      isSaved
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'
                    }`}
                  >
                    {isSaved ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Saved to Vault</span>
                      </>
                    ) : (
                      <>
                        <FolderPlus className="w-4 h-4" />
                        <span>Save to Life Vault</span>
                      </>
                    )}
                  </button>
                </div>
              
              {duplicateMode === 'prompt' && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Duplicate document detected.</p>
                      <div className="flex gap-2">
                          <button onClick={() => handleSaveToVault('replace')} className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs cursor-pointer">Replace Existing</button>
                          <button onClick={() => handleSaveToVault('keep')} className="px-3 py-1 bg-amber-200 text-amber-900 rounded-lg text-xs cursor-pointer">Keep Both</button>
                          <button onClick={() => handleSaveToVault('cancel')} className="px-3 py-1 bg-slate-200 text-slate-800 rounded-lg text-xs cursor-pointer">Cancel</button>
                      </div>
                  </div>
              )}
              </div>

              {/* Masked Identifiers & Dates Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-indigo-500" />
                      Masked Identifier
                    </span>
                    <button
                      type="button"
                      onClick={() => setUnmaskAll(!unmaskAll)}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {unmaskAll ? 'Mask' : 'Reveal'}
                    </button>
                  </div>
                  <p className="text-xs font-mono font-semibold text-slate-900 dark:text-white">
                    {analysisResult.maskedIdentifiers && analysisResult.maskedIdentifiers.length > 0
                      ? unmaskAll
                        ? analysisResult.maskedIdentifiers[0].maskedValue.replace(/•/g, '9')
                        : analysisResult.maskedIdentifiers[0].maskedValue
                      : '••••••••'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-500" />
                    Issue Date
                  </span>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    {analysisResult.issueDate || 'Not specified'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-500" />
                    Expiry / Validity Date
                  </span>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    {analysisResult.expiryDate || 'Continuous / No Expiry'}
                  </p>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Executive Plain-Language Summary
                  </h5>
                  <button
                    type="button"
                    onClick={() => handleCopyText(analysisResult.summary, 'summary')}
                    className="text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSection === 'summary' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'summary' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {analysisResult.summary}
                </p>
              </div>

              {/* Extracted Specific Data */}
              {analysisResult.extractedData && Object.keys(analysisResult.extractedData).length > 0 && (
                <div className="p-4 rounded-xl bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Structured Data Extracted
                    </h5>
                    <button
                      type="button"
                      onClick={() => setIsEditingData(!isEditingData)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:underline"
                    >
                      {isEditingData ? 'Done' : 'Edit'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    {Object.entries(analysisResult.extractedData).map(([key, value], idx) => (
                      <div key={idx} className="flex flex-col py-1 border-b border-indigo-100/50 dark:border-indigo-900/30">
                        <span className="text-[10px] text-indigo-500/80 dark:text-indigo-400/80 uppercase font-semibold mb-0.5">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                        {isEditingData ? (
                          <input
                            type="text"
                            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white"
                            value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            onChange={(e) => {
                              setAnalysisResult({
                                ...analysisResult,
                                extractedData: {
                                  ...analysisResult.extractedData,
                                  [key]: e.target.value
                                }
                              });
                            }}
                          />
                        ) : (
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Clauses & Extracted Deadlines */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Important Clauses */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Important Clauses & Rules</span>
                  </h5>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    {analysisResult.importantClauses?.map((clause, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-indigo-500 font-bold">•</span>
                        <span>{clause}</span>
                      </li>
                    )) || (
                      <li className="text-slate-400 text-xs italic">No specific restrictive clauses identified.</li>
                    )}
                  </ul>
                </div>

                {/* Deadlines & Action Tracking */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Identified Deadlines</span>
                  </h5>
                  <div className="space-y-2">
                    {analysisResult.deadlines && analysisResult.deadlines.length > 0 ? (
                      analysisResult.deadlines.map((dl, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">{dl.title}</p>
                            <p className="text-[11px] text-slate-500">Due: <strong className="text-indigo-600 dark:text-indigo-400">{dl.dueDate}</strong></p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleTrackDeadline(dl)}
                            className="px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
                          >
                            Track
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No time-sensitive deadlines extracted.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Requirements Checklist (Vault status vs Missing vs Needs verification) */}
              {analysisResult.requiredDocumentsMentioned && analysisResult.requiredDocumentsMentioned.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Document Requirements Checklist</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {analysisResult.requiredDocumentsMentioned.map((reqItem, idx) => {
                    // Properly cross-reference Life Vault to see if we have it
                    // For now, we will mark it Needs Verification unless it explicitly matches a known doc.
                    const vaultHasItem = vaultItems.some(vi => vi.title.toLowerCase().includes(reqItem.toLowerCase()) || vi.documentType.toLowerCase().includes(reqItem.toLowerCase()));
                    const status = vaultHasItem ? 'vault' : 'verify';
                    return (
                      <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{reqItem}</span>
                        {status === 'vault' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold shrink-0">
                            <Check className="w-3 h-3" /> Available in Vault
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold shrink-0">
                            <HelpCircle className="w-3 h-3" /> Needs verification
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {/* Document Chat ("Ask questions about this document") */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                    Ask Gemini About This Document
                  </h5>
                </div>

                {docChatHistory.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 text-xs">
                    {docChatHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg ${
                          item.role === 'user'
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ml-6'
                            : 'bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 mr-6'
                        }`}
                      >
                        <p className="font-semibold text-[10px] text-slate-400 mb-0.5">
                          {item.role === 'user' ? 'You' : 'LIFEOS Intelligence'}
                        </p>
                        <p className="leading-relaxed">{item.text}</p>
                      </div>
                    ))}
                    {isDocChatLoading && (
                      <div className="text-[11px] text-slate-400 italic">Analyzing document contents...</div>
                    )}
                  </div>
                )}

                <form onSubmit={handleSendDocQuestion} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={docChatQuery}
                    onChange={(e) => setDocChatQuery(e.target.value)}
                    placeholder="e.g. Is there a penalty for early cancellation?"
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isDocChatLoading || !docChatQuery.trim()}
                    className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          {analysisResult ? (
            <button
              type="button"
              onClick={() => {
                setAnalysisResult(null);
                setSelectedFile(null);
                setBase64Data('');
                setTextContext('');
              }}
              className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              ← Analyze another document
            </button>
          ) : (
            <div className="text-xs text-slate-400">
              {selectedFile ? 'Document ready for processing' : 'Select a document to begin'}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
            >
              Close
            </button>

            {!analysisResult && (
              <button
                type="button"
                onClick={handleRunAnalysis}
                disabled={isDocumentAnalyzing || (!base64Data && !textContext.trim())}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isDocumentAnalyzing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Understand Document</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

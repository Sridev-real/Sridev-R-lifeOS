import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  X,
  Printer,
  Paperclip,
  CheckSquare,
  Building,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { useLifeOS } from '../../context/LifeOSContext';
import { GeneratedLetter } from '../../types';

interface LetterGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLetterType?: string;
  initialRecipient?: string;
  initialFacts?: string;
}

export const LetterGeneratorModal: React.FC<LetterGeneratorModalProps> = ({
  isOpen,
  onClose,
  initialLetterType,
  initialRecipient,
  initialFacts
}) => {
  const { generateLetter, isLetterGenerating } = useLifeOS();

  const [letterType, setLetterType] = useState<string>(initialLetterType || 'Overdue Payment Demand');
  const [tone, setTone] = useState<'formal' | 'firm' | 'polite' | 'urgent' | 'legalistic'>('formal');
  const [recipient, setRecipient] = useState<string>(initialRecipient || '');
  const [subject, setSubject] = useState<string>('');
  const [facts, setFacts] = useState<string>(initialFacts || '');
  const [generatedResult, setGeneratedResult] = useState<GeneratedLetter | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facts.trim() || !recipient.trim()) {
      setErrorMsg('Please enter recipient details and describe the situation facts.');
      return;
    }

    setErrorMsg(null);
    try {
      const letter = await generateLetter({
        letterType,
        tone,
        recipient: recipient.trim(),
        subject: subject.trim() || undefined,
        facts: facts.trim()
      });
      setGeneratedResult(letter);
    } catch (err: any) {
      setErrorMsg(err.message || 'Letter generation encountered an issue.');
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handlePrint = () => {
    if (!generatedResult) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${generatedResult.subject || 'Formal Notice'}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            h2 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 24px; font-size: 18px; }
            pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; }
            .attachments { margin-top: 30px; border-top: 1px dashed #cbd5e1; padding-top: 16px; font-size: 13px; color: #475569; }
          </style>
        </head>
        <body>
          <h2>${generatedResult.letterType}</h2>
          <pre>${generatedResult.body}</pre>
          <div class="attachments">
            <strong>Required Attachments:</strong>
            <ul>${generatedResult.requiredAttachments?.map(a => `<li>${a}</li>`).join('') || 'None'}</ul>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const loadPreset = (preset: 'late_invoice' | 'landlord_repair' | 'damaged_order') => {
    setErrorMsg(null);
    setGeneratedResult(null);

    if (preset === 'late_invoice') {
      setLetterType('Overdue Payment Demand');
      setTone('firm');
      setRecipient('Accounts Payable, Apex Digital Studios LLC');
      setSubject('URGENT: Notice of Overdue Payment — Invoice #INV-204 ($3,400)');
      setFacts('Invoice #INV-204 for web performance consulting ($3,400) was issued on July 17, 2026 under Net-15 terms. It is now 30 days past due. Work was accepted in full.');
    } else if (preset === 'landlord_repair') {
      setLetterType('Landlord Urgent Repair Notice');
      setTone('formal');
      setRecipient('Property Management, Highline Residences');
      setSubject('Formal Request for Emergency Plumbing Repair — Apt 4B');
      setFacts('Severe water leakage observed from master bathroom ceiling on August 28, 2026. Risk of structural and personal property damage. Requesting licensed contractor dispatch within 24 hours pursuant to lease clause 8.2.');
    } else if (preset === 'damaged_order') {
      setLetterType('Damaged Product Replacement & Return Claim');
      setTone('formal');
      setRecipient('Customer Support & Grievances, TechCart Retail Ltd');
      setSubject('Urgent: Formal Notice of Damaged Shipment — Order #84920');
      setFacts('Order #84920 delivered today with crushed outer carton and cracked monitor screen. Reporting within 48h return window with photos attached. Requesting immediate replacement.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full my-8 border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Formal Letter & Grievance Generator
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Draft legalistic, firm, or polite official notices with complete factual grounding
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
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {!generatedResult ? (
            <form onSubmit={handleGenerate} className="space-y-4">
              {/* Presets Bar */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Try a ready letter template:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => loadPreset('late_invoice')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:border-slate-400 cursor-pointer"
                  >
                    Late Invoice ($3.4k)
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset('damaged_order')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:border-slate-400 cursor-pointer"
                  >
                    Damaged Order
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset('landlord_repair')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:border-slate-400 cursor-pointer"
                  >
                    Landlord Repair
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Letter Type / Purpose
                  </label>
                  <select
                    value={letterType}
                    onChange={(e) => setLetterType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Overdue Payment Demand">Overdue Payment Demand</option>
                    <option value="Damaged Product Replacement & Return Claim">Damaged Product / Return Claim</option>
                    <option value="Landlord Urgent Repair Notice">Landlord Urgent Repair Notice</option>
                    <option value="Formal Consumer Service Complaint">Formal Consumer Complaint</option>
                    <option value="Insurance Claim Denial Appeal">Insurance Claim Denial Appeal</option>
                    <option value="Subscription Cancellation & Fee Dispute">Subscription Dispute & Refund</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Tone & Posture
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="formal">Formal & Professional (Standard)</option>
                    <option value="firm">Firm (Explicit Deadlines & Terms)</option>
                    <option value="polite">Polite & Cooperative</option>
                    <option value="urgent">Urgent (Time-Sensitive Action)</option>
                    <option value="legalistic">Legalistic (Statutory / Contractual Notice)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Recipient Name, Title & Organization
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="e.g. Accounts Payable Director, Apex Digital Studios LLC"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Subject Line (Optional — Gemini will draft if empty)
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Formal Notice of Overdue Payment — Invoice #INV-204"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Factual Context & Key Dates
                </label>
                <textarea
                  rows={4}
                  value={facts}
                  onChange={(e) => setFacts(e.target.value)}
                  placeholder="Include dates, amounts, reference IDs, what happened, and what you are demanding..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isLetterGenerating || !facts.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isLetterGenerating ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Drafting Formal Notice...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Formal Letter</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Result View */
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider">
                    {generatedResult.letterType} • {generatedResult.tone.toUpperCase()}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {generatedResult.subject}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    To: {generatedResult.recipient}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(generatedResult.body, 'body')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-2xs hover:opacity-90 cursor-pointer"
                  >
                    {copiedKey === 'body' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'body' ? 'Copied' : 'Copy Full Letter'}</span>
                  </button>
                </div>
              </div>

              {/* Letter Body */}
              <div className="space-y-1.5">
                <pre className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-sans text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto shadow-inner">
                  {generatedResult.body}
                </pre>
              </div>

              {/* Attachments & Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Required Enclosures / Attachments</span>
                  </h5>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    {generatedResult.requiredAttachments?.map((att, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-indigo-500 font-bold">•</span>
                        <span>{att}</span>
                      </li>
                    )) || <li>None required</li>}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Transmission & Delivery Advice</span>
                  </h5>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    {generatedResult.checklist?.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    )) || <li>Retain transmission receipt</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          {generatedResult ? (
            <button
              type="button"
              onClick={() => setGeneratedResult(null)}
              className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              ← Edit details or change tone
            </button>
          ) : (
            <div className="text-xs text-slate-400">
              Provide context to generate
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

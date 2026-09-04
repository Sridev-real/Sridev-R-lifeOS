import React, { useState } from 'react';
import {
  ShieldAlert,
  Sparkles,
  FileCheck,
  AlertTriangle,
  Calendar,
  DollarSign,
  Copy,
  Check,
  Mail,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  X,
  FileText,
  Clock,
  ShieldCheck,
  Building,
  Upload,
  Plus
} from 'lucide-react';
import { useLifeOS } from '../../context/LifeOSContext';
import { InsuranceClaim } from '../../types';

interface InsuranceClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingClaim?: InsuranceClaim | null;
}

export const InsuranceClaimModal: React.FC<InsuranceClaimModalProps> = ({
  isOpen,
  onClose,
  existingClaim
}) => {
  const { analyzeInsuranceClaim, updateInsuranceClaim, isClaimAnalyzing, addAction, addDeadline } = useLifeOS();

  const [policyType, setPolicyType] = useState<string>(existingClaim?.policyType || 'Health / Mediclaim');
  const [policyNumber, setPolicyNumber] = useState<string>(existingClaim?.policyNumber || '');
  const [insurerName, setInsurerName] = useState<string>(existingClaim?.insurerName || '');
  const [incidentType, setIncidentType] = useState<string>(existingClaim?.incidentType || '');
  const [incidentDate, setIncidentDate] = useState<string>(existingClaim?.incidentDate || '2026-08-28');
  const [incidentDescription, setIncidentDescription] = useState<string>(existingClaim?.incidentDescription || '');
  const [estimatedAmount, setEstimatedAmount] = useState<string>(existingClaim?.estimatedAmount || '');
  const [policyDocumentContext, setPolicyDocumentContext] = useState<string>('');

  const [activeClaim, setActiveClaim] = useState<InsuranceClaim | null>(existingClaim || null);
  const [activeTab, setActiveTab] = useState<'assessment' | 'letter' | 'email' | 'checklist'>('assessment');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentType.trim() || !incidentDescription.trim()) {
      setErrorMsg('Please describe the incident and provide policy details.');
      return;
    }

    setErrorMsg(null);
    try {
      const claim = await analyzeInsuranceClaim({
        policyType,
        policyNumber: policyNumber.trim() || '•••• 8920',
        insurerName: insurerName.trim() || 'Insurance Provider',
        incidentType: incidentType.trim(),
        incidentDate,
        incidentDescription: incidentDescription.trim(),
        estimatedAmount: estimatedAmount.trim() || undefined,
        policyDocumentContext: policyDocumentContext.trim() || undefined
      });

      if (claim.insurerName?.toLowerCase().includes('allianz') && (!claim.officialPortalUrl || claim.officialPortalUrl.includes('example'))) {
        claim.officialPortalUrl = 'https://www.allianz-assistance.com';
      }

      setActiveClaim(claim);

      // Auto-add deadline to user's dashboard if claim has submission cutoffs
      if (claim.claimDeadlines && claim.claimDeadlines.length > 0) {
        addDeadline({
          title: `Insurance Claim: ${claim.incidentType} (${claim.insurerName})`,
          category: 'Payment deadline',
          dueDate: '2026-09-28',
          status: 'Upcoming',
          priority: 'high',
          notes: claim.claimDeadlines.join('; ')
        });

        const isAllianz = claim.insurerName?.toLowerCase().includes('allianz');
        const officialUrl = isAllianz
          ? 'https://www.allianz-assistance.com'
          : (claim.officialPortalUrl && !claim.officialPortalUrl.includes('example') ? claim.officialPortalUrl : undefined);

        addAction({
          title: `Submit Insurance Claim Documents to ${claim.insurerName}`,
          priority: 'NOW',
          reason: `Filing cutoff approaching for ${claim.incidentType}`,
          dueDate: '2026-09-28',
          requiredDocument: 'Itemized Invoices & Diagnostic/Repair Reports',
          nextStep: `Upload completed documents to ${claim.insurerName} claims portal`,
          sourceType: 'Problem',
          sourceId: claim.id,
          state: 'Pending',
          submissionLink: officialUrl
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Claim evaluation encountered an issue.');
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleDocUploaded = (docName: string) => {
    if (!activeClaim) return;
    const docs = Array.isArray(activeClaim.requiredDocumentation) ? activeClaim.requiredDocumentation : [];
    const updatedDocs = docs.map(d =>
      d.name === docName ? { ...d, uploaded: !d.uploaded } : d
    );
    const updated = { ...activeClaim, requiredDocumentation: updatedDocs };
    setActiveClaim(updated);
    updateInsuranceClaim(activeClaim.id, { requiredDocumentation: updatedDocs });
  };

  // Demo presets
  const loadPreset = (type: 'health' | 'laptop' | 'travel') => {
    setErrorMsg(null);
    if (type === 'health') {
      setPolicyType('Comprehensive Health & Mediclaim');
      setInsurerName('Star Health & Allied Insurance');
      setPolicyNumber('•••• 4920');
      setIncidentType('Emergency Daycare Orthopedic Surgery');
      setIncidentDate('2026-08-20');
      setEstimatedAmount('₹54,200');
      setIncidentDescription('Underwent emergency knee arthroscopy daycare procedure at Fortis Hospital. Paid out of pocket due to hospital server network timeout for cashless processing.');
      setPolicyDocumentContext('Daycare procedures listed in schedule 4.2 are covered without 24h hospitalization requirement. 30-day pre and 60-day post expenses eligible.');
    } else if (type === 'laptop') {
      setPolicyType('Professional Equipment & Commercial Property');
      setInsurerName('Chubb Commercial Insurance');
      setPolicyNumber('•••• 8192');
      setIncidentType('Water damage to MacBook Pro & Monitor');
      setIncidentDate('2026-08-28');
      setEstimatedAmount('$3,200');
      setIncidentDescription('Overhead plumbing leak at shared office space flooded workstation overnight. Logic board and display destroyed.');
      setPolicyDocumentContext('Electronic Data Processing Equipment rider covers sudden water leaks. $250 deductible applies.');
    } else if (type === 'travel') {
      setPolicyType('International Travel Protection');
      setInsurerName('Allianz Global Assistance');
      setPolicyNumber('•••• 7731');
      setIncidentType('Flight Cancellation & 24-Hour Baggage Delay');
      setIncidentDate('2026-08-25');
      setEstimatedAmount('$850');
      setIncidentDescription('Connecting flight cancelled due to mechanical fault. Stranded overnight in Frankfurt. Essential clothing and accommodation expenses incurred.');
      setPolicyDocumentContext('Trip delay over 6 hours reimburses up to $250/day. Baggage delay over 12 hours covers emergency purchases up to $500.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full my-8 border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Insurance Claim Assistant
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI policy coverage assessment, formal claim letter generator & documentation checklist
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {!activeClaim ? (
            /* Claim Input Form */
            <form onSubmit={handleRunAnalysis} className="space-y-4">
              {/* Presets Bar */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Try a ready insurance claim scenario:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => loadPreset('health')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:border-slate-400 cursor-pointer"
                  >
                    Hospital Daycare (₹54k)
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset('laptop')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:border-slate-400 cursor-pointer"
                  >
                    Workstation Leak ($3.2k)
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset('travel')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:border-slate-400 cursor-pointer"
                  >
                    Flight Delay ($850)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Policy Type
                  </label>
                  <select
                    value={policyType}
                    onChange={(e) => setPolicyType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Health / Mediclaim">Health / Mediclaim</option>
                    <option value="Professional Equipment & Commercial Property">Professional Equipment / Commercial</option>
                    <option value="Auto / Vehicle Collision & Comprehensive">Auto / Vehicle Insurance</option>
                    <option value="Home / Renter's Property Protection">Home / Renter's Insurance</option>
                    <option value="Travel / Trip Delay Protection">Travel / Flight Delay Insurance</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Insurer Name
                  </label>
                  <input
                    type="text"
                    value={insurerName}
                    onChange={(e) => setInsurerName(e.target.value)}
                    placeholder="e.g. Star Health, Chubb, Geico, Allianz"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Incident Title / Category
                  </label>
                  <input
                    type="text"
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    placeholder="e.g. Emergency Daycare Surgery, Laptop Water Damage"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Incident Date
                    </label>
                    <input
                      type="date"
                      value={incidentDate}
                      onChange={(e) => setIncidentDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Claim Amount (Est.)
                    </label>
                    <input
                      type="text"
                      value={estimatedAmount}
                      onChange={(e) => setEstimatedAmount(e.target.value)}
                      placeholder="e.g. $3,200 or ₹54,000"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Incident Description & Facts
                </label>
                <textarea
                  rows={3}
                  value={incidentDescription}
                  onChange={(e) => setIncidentDescription(e.target.value)}
                  placeholder="Describe what happened, where it occurred, who was involved, and current status of payments/receipts..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Policy Document / Clauses Snippet (Optional)
                </label>
                <textarea
                  rows={2}
                  value={policyDocumentContext}
                  onChange={(e) => setPolicyDocumentContext(e.target.value)}
                  placeholder="Paste policy clauses, deductible limits, or specific coverage definitions from your policy schedule..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 font-mono text-[11px]"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isClaimAnalyzing || !incidentDescription.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isClaimAnalyzing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Evaluating Policy & Claim...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Evaluate Claim & Generate Letter</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Analysis & Generated Artifacts */
            <div className="space-y-5">
              {/* Top Claim Card */}
              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider">
                      {activeClaim.coverageAssessment}
                    </span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {activeClaim.insurerName} • {activeClaim.policyType}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {activeClaim.incidentType} {activeClaim.estimatedAmount ? `(${activeClaim.estimatedAmount})` : ''}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {activeClaim.coverageSummary}
                  </p>
                </div>

                <div className="shrink-0 flex sm:flex-col items-end gap-1.5">
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    Status: {activeClaim.status}
                  </span>
                  {activeClaim.officialPortalUrl && (
                    <a
                      href={activeClaim.officialPortalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <span>Insurer Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Sub-tab Navigation */}
              <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('assessment')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    activeTab === 'assessment'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Coverage & Exclusions
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('letter')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    activeTab === 'letter'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Claim Letter
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('email')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    activeTab === 'email'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Email Draft
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('checklist')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    activeTab === 'checklist'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Required Docs ({((activeClaim.requiredDocumentation || []).filter(d => d.uploaded)).length}/{(activeClaim.requiredDocumentation || []).length})
                </button>
              </div>

              {/* Assessment View */}
              {activeTab === 'assessment' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Applicable Clauses */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Applicable Coverage Clauses</span>
                      </h5>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                        {activeClaim.applicableClauses?.map((c, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-500 font-bold">•</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Important Exclusions */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span>Important Policy Exclusions</span>
                      </h5>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                        {activeClaim.importantExclusions?.map((ex, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>{ex}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Questions to Ask Adjuster */}
                  <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/60 space-y-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-indigo-500" />
                      <span>Questions to Ask Claims Adjuster</span>
                    </h5>
                    <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {activeClaim.questionsToAskInsurer?.map((q, i) => (
                        <div key={i} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50">
                          {q}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Claim Letter View */}
              {activeTab === 'letter' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Formal Claim Submission Letter
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeClaim.generatedClaimLetter, 'letter')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-2xs hover:opacity-90 cursor-pointer"
                    >
                      {copiedKey === 'letter' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'letter' ? 'Copied to Clipboard' : 'Copy Letter'}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs font-sans text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                    {activeClaim.generatedClaimLetter}
                  </pre>
                </div>
              )}

              {/* Email View */}
              {activeTab === 'email' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Intimation Email Draft
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeClaim.generatedEmailDraft, 'email')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-2xs hover:opacity-90 cursor-pointer"
                    >
                      {copiedKey === 'email' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'email' ? 'Copied' : 'Copy Email'}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs font-sans text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {activeClaim.generatedEmailDraft}
                  </pre>
                </div>
              )}

              {/* Required Documentation Checklist View */}
              {activeTab === 'checklist' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Check off documents as you gather or upload them to the insurer portal:
                    </p>
                  </div>
                  <div className="space-y-2">
                    {(activeClaim.requiredDocumentation || []).map((doc, idx) => (
                      <div
                        key={idx}
                        onClick={() => toggleDocUploaded(doc.name)}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          doc.uploaded
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                              doc.uploaded
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {doc.uploaded && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <p className={`text-xs font-semibold ${doc.uploaded ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                              {doc.name}
                            </p>
                            {doc.fileName && (
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Attached: {doc.fileName}</p>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] font-medium text-slate-400">
                          {doc.uploaded ? 'Ready' : 'Missing'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          {activeClaim ? (
            <button
              type="button"
              onClick={() => setActiveClaim(null)}
              className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              ← Edit Claim Details
            </button>
          ) : (
            <div className="text-xs text-slate-400">
              Fill details to evaluate with Gemini
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

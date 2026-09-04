import React, { useState } from 'react';
import {
  Award,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Search,
  X,
  Zap,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Users,
  RefreshCw
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import { Opportunity, EligibilityConfidence } from '../types';
import { OnePlaceExecutionModal, ExecutionPayload } from '../components/execution/OnePlaceExecutionModal';
import { buildOpportunityPayload } from '../utils/executionBuilder';
import { downloadCalendarEvent } from '../utils/calendarExport';

export const Opportunities: React.FC = () => {
  const { opportunities, toggleSaveOpportunity, checkOpportunityEligibility, vaultItems, addDeadline, recalculateInsights } = useLifeOS();
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [isCheckingAi, setIsCheckingAi] = useState<boolean>(false);
  const [activeModalPayload, setActiveModalPayload] = useState<ExecutionPayload | null>(null);

  const CATEGORIES = [
    'All',
    'Scholarships',
    'Government Benefits',
    'Education',
    'Financial Assistance',
    'Grants',
    'Tax Benefits',
    'Freelancer Grants'
  ];

  const filteredOpportunities = opportunities.filter(opp => {
    const isSaved = opp.isSaved ?? opp.saved ?? false;
    const confidence = opp.eligibilityConfidence || opp.confidence || 'Needs verification';

    const matchesCat = selectedCategory === 'All' || opp.category === selectedCategory;
    
    let matchesFilter = true;
    if (selectedFilter === 'saved') matchesFilter = isSaved;
    else if (selectedFilter === 'likely') matchesFilter = confidence === 'Likely eligible';
    else if (selectedFilter === 'possible') matchesFilter = confidence === 'Possibly eligible';
    else if (selectedFilter === 'needs_verification') matchesFilter = confidence === 'Needs verification';

    const matchesSearch =
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.shortExplanation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (opp.targetAudience && opp.targetAudience.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCat && matchesFilter && matchesSearch;
  });

  const getConfidenceBadge = (confidence?: EligibilityConfidence) => {
    const conf = confidence || 'Needs verification';
    switch (conf) {
      case 'Likely eligible':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60">
            Likely eligible
          </span>
        );
      case 'Possibly eligible':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/60">
            Possibly eligible
          </span>
        );
      case 'Needs verification':
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
            Needs verification
          </span>
        );
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await recalculateInsights();
      // Optional: show a toast or alert
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRunAiMatch = async (oppId: string) => {
    setIsCheckingAi(true);
    try {
      await checkOpportunityEligibility(oppId);
    } finally {
      setIsCheckingAi(false);
    }
  };

  const handleAddDeadline = (opp: Opportunity) => {
    if (opp.deadline && opp.deadline !== 'Rolling' && opp.deadline !== 'Ongoing') {
      addDeadline({
        title: `Apply: ${opp.title}`,
        category: 'Opportunity',
        dueDate: opp.deadline,
        priority: 'high',
        status: 'Upcoming'
      });
      downloadCalendarEvent(
        `Application Deadline: ${opp.title}`,
        `Deadline to apply for ${opp.title} (${opp.provider}). Link: ${opp.officialLink || opp.sourceUrl || ''}`,
        opp.deadline,
        opp.provider
      );
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Opportunities & Benefits
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Verified scholarships, government schemes, and grants matched to your profile.
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing opportunities...' : 'Refresh'}
          </button>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Sources</span>
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Eligibility Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Opportunities' },
              { id: 'likely', label: 'Likely Eligible' },
              { id: 'possible', label: 'Possibly Eligible' },
              { id: 'saved', label: 'Bookmarked' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedFilter === f.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or provider..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-[#111726] border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-2xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Opportunity Cards List */}
      {filteredOpportunities.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 space-y-4">
          <Award className="w-8 h-8 text-slate-400 mx-auto opacity-70" />
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No current opportunities match all verified criteria.
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              Adding a valid Income Certificate or Academic Transcript may unlock additional matches.
            </p>
          </div>
          
          <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 max-w-md mx-auto text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">CURRENT PROFILE USED FOR MATCHING</span>
            {vaultItems.length === 0 ? (
              <p className="text-xs text-slate-600 dark:text-slate-400">No structured information available in Life Vault yet.</p>
            ) : (
              <div className="space-y-3">
                {vaultItems.slice(0, 5).map(v => (
                  <div key={v.id} className="text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 font-semibold mb-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span className="truncate">{v.documentType || v.title}</span>
                    </div>
                    {v.extractedData && Object.keys(v.extractedData).length > 0 ? (
                      <ul className="pl-5 space-y-1 text-slate-500 dark:text-slate-400">
                        {Object.entries(v.extractedData).slice(0, 3).map(([key, value]) => (
                          <li key={key}><span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>: {String(value)}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="pl-5 text-slate-400 italic">No structured data extracted</span>
                    )}
                  </div>
                ))}
                {vaultItems.length > 5 && (
                  <div className="text-slate-500 pl-5 text-xs font-medium pt-1">+ {vaultItems.length - 5} more documents</div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOpportunities.map((opp) => {
            const isSaved = opp.isSaved ?? opp.saved ?? false;
            const confidence = opp.eligibilityConfidence || opp.confidence;
            const requiredDocs = Array.isArray(opp.requiredDocuments)
              ? opp.requiredDocuments
              : (Array.isArray(opp.missingDocuments) ? opp.missingDocuments : []);
            const benefitAmount = opp.benefitAmount || (opp as any).amount;
            const targetAudience = opp.targetAudience;

            return (
              <div
                key={opp.id}
                onClick={() => setSelectedOpp(opp)}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs transition-all cursor-pointer flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {opp.provider}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {opp.category}
                      </span>
                      {getConfidenceBadge(confidence)}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSaveOpportunity(opp.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title={isSaved ? 'Remove bookmark' : 'Bookmark opportunity'}
                    >
                      {isSaved ? (
                        <BookmarkCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {opp.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed line-clamp-2">
                      {opp.shortExplanation || opp.whyMatched}
                    </p>
                  </div>

                  {/* Highlights Row */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {benefitAmount && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs border border-emerald-200/60 dark:border-emerald-900/60">
                        <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{benefitAmount}</span>
                      </span>
                    )}

                    {targetAudience && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200/60 dark:border-slate-700">
                        <Users className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{targetAudience}</span>
                      </span>
                    )}

                    {opp.deadline && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-mono border border-slate-200/60 dark:border-slate-700">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Deadline: {opp.deadline}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {requiredDocs.length > 0 ? (
                      <span>
                        <strong className="text-slate-800 dark:text-slate-200">{requiredDocs.length}</strong> required documents
                      </span>
                    ) : (
                      <span>Standard application</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const payload = buildOpportunityPayload(opp, vaultItems);
                        setActiveModalPayload(payload);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs hover:opacity-90 transition-opacity"
                    >
                      <Zap className="w-3.5 h-3.5 text-indigo-400" />
                      <span>1-Place Application</span>
                    </button>

                    {(opp.officialLink || opp.sourceUrl) && (
                      <a
                        href={opp.officialLink || opp.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>Official portal</span>
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Opportunity Detail Modal */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {selectedOpp.provider}
                  </span>
                  {getConfidenceBadge(selectedOpp.eligibilityConfidence || selectedOpp.confidence)}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedOpp.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOpp(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Benefit Amount & Audience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(selectedOpp.benefitAmount || (selectedOpp as any).amount) && (
                  <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-0.5">
                      Benefit Value
                    </span>
                    <p className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                      {selectedOpp.benefitAmount || (selectedOpp as any).amount}
                    </p>
                  </div>
                )}

                {selectedOpp.targetAudience && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                      Target Audience
                    </span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedOpp.targetAudience}
                    </p>
                  </div>
                )}
              </div>

              {/* Match Reason */}
              <div>
                <span className="font-bold text-xs text-slate-900 dark:text-white block mb-1">
                  Why this matches your profile
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  {selectedOpp.whyMatched || selectedOpp.shortExplanation}
                </p>
              </div>

              {/* Deadline with 1-click Calendar button */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                    Application Deadline
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedOpp.deadline || 'Ongoing / Open'}
                  </span>
                </div>
                {selectedOpp.deadline && selectedOpp.deadline !== 'Rolling' && selectedOpp.deadline !== 'Ongoing' && (
                  <button
                    type="button"
                    onClick={() => handleAddDeadline(selectedOpp)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer border border-indigo-200/60 dark:border-indigo-900/60"
                  >
                    <Calendar className="w-3 h-3 text-indigo-600" />
                    <span>Export to .ics</span>
                  </button>
                )}
              </div>

              {/* Required Documents Checklist */}
              {(selectedOpp.requiredDocuments || selectedOpp.missingDocuments) && (
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block mb-1.5">
                    Required Application Documents
                  </span>
                  <div className="space-y-1.5">
                    {(selectedOpp.requiredDocuments || selectedOpp.missingDocuments || []).map((doc, i) => {
                      const inVault = vaultItems.some(v => v.title.toLowerCase().includes(doc.toLowerCase()) || doc.toLowerCase().includes(v.title.toLowerCase()));
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800"
                        >
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{doc}</span>
                          {inVault ? (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Ready in Vault
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              Missing from Vault
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const payload = buildOpportunityPayload(selectedOpp, vaultItems);
                    setActiveModalPayload(payload);
                    setSelectedOpp(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs hover:opacity-90"
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Launch 1-Place Application</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunAiMatch(selectedOpp.id)}
                  disabled={isCheckingAi}
                  className="px-3 py-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:underline cursor-pointer"
                >
                  {isCheckingAi ? 'Verifying...' : 'Re-verify'}
                </button>
              </div>

              {(selectedOpp.officialLink || selectedOpp.sourceUrl) && (
                <a
                  href={selectedOpp.officialLink || selectedOpp.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Official portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* One-Place Execution Modal */}
      <OnePlaceExecutionModal
        isOpen={Boolean(activeModalPayload)}
        onClose={() => setActiveModalPayload(null)}
        payload={activeModalPayload}
      />
    </div>
  );
};

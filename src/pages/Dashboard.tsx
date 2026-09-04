import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldAlert,
  FolderLock,
  Award,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Wrench,
  FileCheck,
  Zap,
  FileSpreadsheet,
  FileText,
  Upload
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLifeOS } from '../context/LifeOSContext';
import { CommandBar } from '../components/common/CommandBar';
import { NavTab } from '../components/layout/Sidebar';
import { OnePlaceExecutionModal, ExecutionPayload } from '../components/execution/OnePlaceExecutionModal';
import { DocumentUploadModal } from '../components/documents/DocumentUploadModal';
import { FormFillingAssistantModal } from '../components/forms/FormFillingAssistantModal';
import { LetterGeneratorModal } from '../components/letters/LetterGeneratorModal';
import { InsuranceClaimModal } from '../components/insurance/InsuranceClaimModal';
import {
  buildVaultExpiryPayload,
  buildProblemPayload,
  buildOpportunityPayload,
  buildActionPayload
} from '../utils/executionBuilder';

interface DashboardProps {
  onNavigate: (tab: NavTab) => void;
  onExecuteCommand: (query: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onExecuteCommand }) => {
  const { user } = useAuth();
  const {
    vaultItems,
    problems,
    opportunities,
    deadlines,
    actions
  } = useLifeOS();

  const [activeModalPayload, setActiveModalPayload] = useState<ExecutionPayload | null>(null);

  // Instant AI Action Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isFormFillingModalOpen, setIsFormFillingModalOpen] = useState<boolean>(false);
  const [isLetterModalOpen, setIsLetterModalOpen] = useState<boolean>(false);
  const [isInsuranceModalOpen, setIsInsuranceModalOpen] = useState<boolean>(false);

  // Derive Top 1-3 NOW items with high clarity
  const nowItems = useMemo(() => {
    const items: Array<{
      id: string;
      tag: string;
      tagColor: 'rose' | 'amber' | 'emerald' | 'indigo';
      title: string;
      what: string;
      why: string;
      when: string;
      actionLabel: string;
      payload: ExecutionPayload;
    }> = [];

    // 1. Expiring documents (Vault Expiry)
    const expiring = vaultItems.find(
      v => v.status === 'expiring_soon' || (v.expiryDate && new Date(v.expiryDate) < new Date(Date.now() + 60 * 86400000))
    );
    if (expiring) {
      const payload = buildVaultExpiryPayload(expiring, vaultItems);
      items.push({
        id: `now_vault_${expiring.id}`,
        tag: 'DOCUMENT EXPIRY',
        tagColor: 'rose',
        title: `${expiring.title} renewal`,
        what: `Your ${expiring.title} is approaching its expiry date.`,
        why: 'Renewal is required to avoid administrative penalties and travel/banking disruptions.',
        when: payload.deadline?.countdownText || (expiring.expiryDate ? `Expires ${expiring.expiryDate}` : 'Due soon'),
        actionLabel: 'Start renewal',
        payload
      });
    }

    // 2. Active problem needing attention / evidence
    const activeProblem = problems.find(p => p.status !== 'Resolved');
    if (activeProblem && items.length < 3) {
      const payload = buildProblemPayload(activeProblem, vaultItems);
      const missingInfo = Array.isArray(activeProblem.missingInformation) ? activeProblem.missingInformation : [];
      const missingCount = missingInfo.length;
      items.push({
        id: `now_prob_${activeProblem.id}`,
        tag: 'PROBLEM RESOLUTION',
        tagColor: 'amber',
        title: activeProblem.title,
        what: activeProblem.understanding || activeProblem.rawInput,
        why: missingCount > 0
          ? `Missing ${missingInfo[0] || 'details'} to finalize dispute.`
          : 'Your claim window is open; draft is prepared for submission.',
        when: 'Immediate action recommended',
        actionLabel: 'Continue',
        payload
      });
    }

    // 3. Top matched opportunity or urgent action
    const topOpp = opportunities.find(o => o.eligibilityConfidence === 'Likely eligible');
    if (topOpp && items.length < 3) {
      const payload = buildOpportunityPayload(topOpp, vaultItems);
      items.push({
        id: `now_opp_${topOpp.id}`,
        tag: 'OPPORTUNITY',
        tagColor: 'emerald',
        title: topOpp.title,
        what: `Opportunity offered by ${topOpp.provider}.`,
        why: topOpp.whyMatched || 'Matched with your verified profile in Life Vault.',
        when: topOpp.deadline ? `Deadline: ${topOpp.deadline}` : 'Open application',
        actionLabel: 'Prepare application',
        payload
      });
    } else {
      const urgentAction = actions.find(
        a => a.state !== 'Completed' && a.priority === 'NOW'
      );
      if (urgentAction && items.length < 3) {
        const payload = buildActionPayload(urgentAction, vaultItems, problems, opportunities);
        items.push({
          id: `now_act_${urgentAction.id}`,
          tag: 'ACTION',
          tagColor: 'indigo',
          title: urgentAction.title,
          what: urgentAction.nextStep || 'Action queued for execution.',
          why: urgentAction.reason || 'Operational deadline approaching.',
          when: urgentAction.dueDate ? `Due ${urgentAction.dueDate}` : 'Pending',
          actionLabel: 'Handle this',
          payload
        });
      }
    }

    return items.slice(0, 3);
  }, [vaultItems, problems, actions, opportunities]);

  // Derive 2-3 NEXT items
  const nextItems = useMemo(() => {
    const list: Array<{
      id: string;
      icon: typeof CalendarClock;
      title: string;
      date: string;
      status: string;
      tab?: NavTab;
      payload?: ExecutionPayload;
    }> = [];

    // Next upcoming deadline
    const upcomingDl = deadlines.find(d => d.status !== 'Completed');
    if (upcomingDl) {
      list.push({
        id: `next_dl_${upcomingDl.id}`,
        icon: CalendarClock,
        title: upcomingDl.title,
        date: upcomingDl.dueDate,
        status: upcomingDl.category,
        tab: 'deadlines'
      });
    }

    // Next pending action
    const nextAct = actions.find(
      a => a.state === 'Pending' && !nowItems.some(n => n.title.toLowerCase().includes(a.title.toLowerCase()))
    );
    if (nextAct) {
      const payload = buildActionPayload(nextAct, vaultItems, problems, opportunities);
      list.push({
        id: `next_act_${nextAct.id}`,
        icon: Zap,
        title: nextAct.title,
        date: nextAct.dueDate || 'Queued',
        status: nextAct.priority,
        tab: 'actions',
        payload
      });
    }

    // Additional opportunity
    const nextOpp = opportunities.find(
      o => !nowItems.some(n => n.title.toLowerCase().includes(o.title.toLowerCase()))
    );
    if (nextOpp) {
      const payload = buildOpportunityPayload(nextOpp, vaultItems);
      list.push({
        id: `next_opp_${nextOpp.id}`,
        icon: Award,
        title: nextOpp.title,
        date: nextOpp.deadline || 'Open',
        status: nextOpp.eligibilityConfidence || 'Verification needed',
        tab: 'opportunities',
        payload
      });
    }

    return list.slice(0, 3);
  }, [deadlines, actions, opportunities, vaultItems, nowItems, problems]);

  return (
    <div className="space-y-6 sm:space-y-7 max-w-4xl mx-auto">
      {/* 1. HERO AI ENTRY */}
      <CommandBar
        onExecutePrompt={(query) => {
          onExecuteCommand(query);
          onNavigate('copilot');
        }}
      />

      {/* 2. NEW USER ONBOARDING IF NO VAULT ITEMS */}
      {vaultItems.length === 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-linear-to-br from-indigo-50/90 via-white to-violet-50/90 dark:from-indigo-950/40 dark:via-[#111726] dark:to-violet-950/40 border border-indigo-200/80 dark:border-indigo-900/60 shadow-xs space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-sm">
            <Upload className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Start with one document.
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Upload an important document and LIFEOS will understand it, find important dates, and tell you what to do next.
            </p>
          </div>
          <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Add your first document
            </button>
          </div>
          <div className="pt-2 flex items-center justify-center gap-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-600 dark:text-slate-300">Try uploading:</span>
            <span className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Passport</span>
            <span className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Insurance policy</span>
            <span className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Income certificate</span>
            <span className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Bank form</span>
          </div>
        </div>
      )}

      {/* 2. TODAY / NOW: "Needs your attention" */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Needs your attention
          </h3>
          {nowItems.length > 0 && (
            <span className="text-xs text-slate-400 font-medium">
              {nowItems.length} priority {nowItems.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {nowItems.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              You're all caught up.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              No urgent disputes or expiring documents require immediate action.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('opportunities')}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Explore opportunities
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {nowItems.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md border ${
                      item.tagColor === 'rose'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-900/60'
                        : item.tagColor === 'amber'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/60'
                        : item.tagColor === 'emerald'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-900/60'
                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-900/60'
                    }`}>
                      {item.tag}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      · {item.when}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    {item.title}
                  </h4>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                    {item.why}
                  </p>
                </div>

                <div className="shrink-0 pt-1 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => setActiveModalPayload(item.payload)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 text-xs font-semibold shadow-2xs transition-opacity cursor-pointer text-center"
                  >
                    {item.actionLabel}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. NEXT: "Coming up" */}
      {nextItems.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Coming up
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
            {nextItems.map((item) => {
              const IconComp = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.payload) {
                      setActiveModalPayload(item.payload);
                    } else if (item.tab) {
                      onNavigate(item.tab);
                    }
                  }}
                  className="p-3.5 sm:px-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                        {item.date} · {item.status}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0" />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. LATER / EXPLORE: "Your LIFEOS" (Future-Ready Modules) */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Your LIFEOS
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Solve a Problem */}
          <button
            type="button"
            onClick={() => onNavigate('problems')}
            className="p-3.5 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-left transition-all group cursor-pointer shadow-2xs"
          >
            <div className="w-7 h-7 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2.5">
              <Wrench className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
              Solve a problem
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Disputes & refunds
            </p>
          </button>

          {/* Life Vault */}
          <button
            type="button"
            onClick={() => onNavigate('vault')}
            className="p-3.5 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-left transition-all group cursor-pointer shadow-2xs"
          >
            <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5">
              <FolderLock className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Life Vault
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Secure documents
            </p>
          </button>

          {/* Opportunities */}
          <button
            type="button"
            onClick={() => onNavigate('opportunities')}
            className="p-3.5 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-left transition-all group cursor-pointer shadow-2xs"
          >
            <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5">
              <Award className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Find benefits
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Grants & schemes
            </p>
          </button>

          {/* Deadlines */}
          <button
            type="button"
            onClick={() => onNavigate('deadlines')}
            className="p-3.5 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-left transition-all group cursor-pointer shadow-2xs"
          >
            <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2.5">
              <CalendarClock className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              Deadlines
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Upcoming cutoffs
            </p>
          </button>
        </div>
      </section>

      {/* 5. INSTANT AI TOOL SUITE */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Specialized AI Copilots</span>
          </h3>
          <span className="text-[11px] text-slate-400">Zero-friction single workflows</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            onClick={() => setIsUploadModalOpen(true)}
            className="p-4 rounded-2xl bg-linear-to-br from-indigo-50/70 to-violet-50/70 dark:from-indigo-950/30 dark:to-violet-950/30 border border-indigo-200/70 dark:border-indigo-800/60 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer group flex items-start justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
                  <Upload className="w-3.5 h-3.5" />
                </span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Document Intelligence
                </h4>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                Upload PDFs, receipts, leases, policies. Understand hidden clauses, penalties & deadlines.
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0 mt-1" />
          </div>

          <div
            onClick={() => setIsFormFillingModalOpen(true)}
            className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group flex items-start justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-2xs">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Auto Form-Filling Assistant
                </h4>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                Paste any complex visa, scholarship, or loan application text to auto-fill from your Vault.
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0 mt-1" />
          </div>

          <div
            onClick={() => setIsLetterModalOpen(true)}
            className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group flex items-start justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
                  <FileText className="w-3.5 h-3.5" />
                </span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Formal Letter & Legal Notices
                </h4>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                Generate airtight formal letters for refunds, defective products, bank complaints & landlord disputes.
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 mt-1" />
          </div>

          <div
            onClick={() => setIsInsuranceModalOpen(true)}
            className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group flex items-start justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-teal-600 text-white shadow-2xs">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  Insurance Claim Guide
                </h4>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                Prepare health, vehicle, travel, or property claims with checklist & claim letter.
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 shrink-0 mt-1" />
          </div>
        </div>
      </section>

      {/* Modal Tool Overlays */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />

      <FormFillingAssistantModal
        isOpen={isFormFillingModalOpen}
        onClose={() => setIsFormFillingModalOpen(false)}
      />

      <LetterGeneratorModal
        isOpen={isLetterModalOpen}
        onClose={() => setIsLetterModalOpen(false)}
      />

      <InsuranceClaimModal
        isOpen={isInsuranceModalOpen}
        onClose={() => setIsInsuranceModalOpen(false)}
      />

      {/* Signature 1-Place Execution Modal */}
      <OnePlaceExecutionModal
        isOpen={Boolean(activeModalPayload)}
        onClose={() => setActiveModalPayload(null)}
        payload={activeModalPayload}
        onNavigateToTab={onNavigate}
      />
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Plus,
  Calendar,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLifeOS } from '../../context/LifeOSContext';
import { ActionSourceType } from '../../types';
import { downloadCalendarEvent } from '../../utils/calendarExport';

export type ExecutionItemType = 'vault_expiry' | 'problem' | 'opportunity' | 'deadline' | 'action';

export interface ExecutionPayload {
  id: string;
  type: ExecutionItemType;
  title: string;
  category?: string;
  sourceLabel?: string;
  sourceType?: ActionSourceType;
  
  // 1. UNDERSTAND / WHAT HAPPENED
  whatHappened: string;
  
  // 2. WHY IT MATTERS
  whyItMatters: string;
  
  // 3. WHAT YOU ALREADY HAVE
  alreadyHave: Array<{ label: string; detail?: string; verified?: boolean }>;
  
  // 4. WHAT IS MISSING
  missingItems: string[];
  
  // 5. WHAT TO DO (Steps)
  steps: Array<{ step: number; title: string; detail: string; completed?: boolean }>;
  
  // 6. WHERE TO DO IT (Official Destination)
  officialDestination?: {
    name: string;
    url?: string;
    isVerified: boolean;
    disclaimer?: string;
  };
  
  // 7. WHEN TO DO IT (Deadline & Urgency)
  deadline?: {
    dueDate: string;
    countdownText: string;
    isUrgent: boolean;
  };
  
  // Communication Draft if relevant (e.g. for problems)
  communicationDraft?: string;
  
  // Raw source object reference
  rawSourceId?: string;
  status?: string;
}

interface OnePlaceExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: ExecutionPayload | null;
  onNavigateToTab?: (tab: any) => void;
}

export const OnePlaceExecutionModal: React.FC<OnePlaceExecutionModalProps> = ({
  isOpen,
  onClose,
  payload
}) => {
  const {
    addAction,
    addDeadline,
    updateAction,
    resolveProblem,
    updateVaultItem,
    actions
  } = useLifeOS();

  const [copiedDraft, setCopiedDraft] = useState(false);
  const [actionCreated, setActionCreated] = useState(false);
  const [reminderSet, setReminderSet] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState<string>('');

  if (!isOpen || !payload) return null;

  const isAllianz = Boolean(
    payload.title?.toLowerCase().includes('allianz') ||
    payload.sourceLabel?.toLowerCase().includes('allianz') ||
    payload.whatHappened?.toLowerCase().includes('allianz') ||
    payload.officialDestination?.name?.toLowerCase().includes('allianz') ||
    payload.officialDestination?.url?.toLowerCase().includes('allianz')
  );

  const isInsuranceOrAllianz = Boolean(
    isAllianz ||
    payload.sourceLabel?.toLowerCase().includes('insurance') ||
    payload.title?.toLowerCase().includes('insurance') ||
    payload.title?.toLowerCase().includes('claim')
  );

  const officialUrl = payload.officialDestination?.url || (isAllianz ? 'https://www.allianz-assistance.com' : undefined);

  // Check if an action already exists for this source
  const existingAction = actions.find(
    a => a.sourceId === payload.id || (payload.rawSourceId && a.sourceId === payload.rawSourceId)
  );

  const handleCreateAction = () => {
    if (existingAction) {
      updateAction(existingAction.id, { state: 'In Progress' });
      setActionCreated(true);
      return;
    }

    addAction({
      title: payload.title,
      priority: payload.deadline?.isUrgent ? 'NOW' : 'NEXT',
      state: 'In Progress',
      dueDate: payload.deadline?.dueDate,
      reason: payload.whyItMatters,
      nextStep: payload.steps[0]?.detail || 'Follow step 1 in workflow',
      requiredDocument: payload.missingItems[0] || undefined,
      sourceType: payload.sourceType || 'Personal',
      sourceId: payload.rawSourceId || payload.id,
      submissionLink: payload.officialDestination?.url
    });
    setActionCreated(true);
  };

  const handleSetReminder = () => {
    if (payload.deadline?.dueDate) {
      addDeadline({
        title: `Reminder: ${payload.title}`,
        category: payload.type === 'vault_expiry' ? 'Document expiry' : 'Application deadline',
        dueDate: payload.deadline.dueDate,
        status: 'Upcoming',
        priority: 'high',
        notes: payload.whyItMatters
      });
      downloadCalendarEvent(
        payload.title,
        payload.whyItMatters,
        payload.deadline.dueDate,
        payload.officialDestination?.name || 'LIFEOS Operations Assistant'
      );
      setReminderSet(true);
    }
  };

  const handleCopyDraft = () => {
    if (payload.communicationDraft) {
      navigator.clipboard.writeText(payload.communicationDraft);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2000);
    }
  };

  const handleMarkResolved = () => {
    if (payload.type === 'problem' && payload.rawSourceId) {
      resolveProblem(payload.rawSourceId);
    } else if (payload.type === 'vault_expiry' && payload.rawSourceId) {
      updateVaultItem(payload.rawSourceId, { status: 'verified' });
    }
    if (existingAction) {
      updateAction(existingAction.id, { state: 'Completed' });
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-white dark:bg-[#111726] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 my-6 flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {payload.sourceLabel || '1-Place Execution'}
                  </span>
                  {payload.deadline?.countdownText && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/50">
                      {payload.deadline.countdownText}
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  {payload.title}
                </h3>
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

          {/* Scrollable Workflow Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
            
            {/* 1. Situation & Importance */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">WHAT THIS IS</h4>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                {payload.whatHappened}
              </p>
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-indigo-950 dark:text-indigo-200 font-medium leading-relaxed">
                {payload.whyItMatters}
              </div>
            </div>

            {/* 2. Documents & Missing */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">WHAT YOU ALREADY HAVE</h4>
                {(payload.alreadyHave?.length ?? 0) > 0 ? (
                  (payload.alreadyHave || []).map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {item.detail && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                          {item.detail}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl">
                    No relevant documents currently found in your Vault.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">MISSING / REQUIRED ITEMS</h4>
                {(payload.missingItems?.length ?? 0) > 0 ? (
                  <div className="space-y-2">
                    {(payload.missingItems || []).map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-center gap-2 text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="font-semibold text-amber-900 dark:text-amber-200">
                          Missing: {item}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 border border-emerald-200/60 dark:border-emerald-900/60">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>All necessary documents and evidence are ready.</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Steps Checklist */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">PREPARATION & ACTION STEPS</h4>
              <div className="space-y-2">
                {(payload.steps || []).map((st) => (
                  <div key={st.step} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3 text-xs">
                    <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">{st.step}</div>
                    <div className="min-w-0 flex-1">
                      <h5 className="font-bold text-slate-900 dark:text-white">{st.title}</h5>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 leading-relaxed">{st.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 4. Communication Draft if available */}
            {payload.communicationDraft && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">COMMUNICATION DRAFT</h4>
                  <button
                    type="button"
                    onClick={handleCopyDraft}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1 cursor-pointer border border-indigo-200/60 dark:border-indigo-900/60"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedDraft ? 'Copied to Clipboard!' : 'Copy Draft'}</span>
                  </button>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {payload.communicationDraft}
                </div>
              </div>
            )}

            {/* 5. Official Destination Link */}
            {officialUrl ? (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {isInsuranceOrAllianz
                    ? 'OFFICIAL APPLICATION / CLAIMS WEBSITE'
                    : 'OFFICIAL DESTINATION'}
                </h4>
                <a
                  href={officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    <span>
                      {isAllianz
                        ? 'Open Allianz Global Assistance Official Website →'
                        : `Open ${payload.officialDestination?.name || 'Official Destination'}`}
                    </span>
                  </div>
                  {!isAllianz && <span className="text-[11px] opacity-80">Official Portal &rarr;</span>}
                </a>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 pl-1">
                  {payload.officialDestination?.disclaimer || (isAllianz ? 'Verified official Allianz Global Assistance portal. Opens in a new tab.' : 'Official destination')}
                </p>
              </div>
            ) : payload.officialDestination?.name ? (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{payload.officialDestination.name}</span>
                {payload.officialDestination.disclaimer && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{payload.officialDestination.disclaimer}</p>
                )}
              </div>
            ) : null}

            {/* 6. Personal Deadline */}
            <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
               <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">SET PERSONAL DEADLINE</h4>
               <div className="flex gap-2">
                 <select 
                    value={selectedDeadline}
                    onChange={(e) => setSelectedDeadline(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
                 >
                   <option value="">Select personal target window...</option>
                   <option value="7 days">In 7 days</option>
                   <option value="14 days">In 14 days</option>
                   <option value="30 days">In 30 days</option>
                   <option value="60 days">In 60 days</option>
                 </select>
                 <button 
                    type="button"
                    onClick={() => {
                        const daysMap: Record<string, number> = {'7 days': 7, '14 days': 14, '30 days': 30, '60 days': 60};
                        const days = daysMap[selectedDeadline];
                        if (!days) return;
                        const date = new Date();
                        date.setDate(date.getDate() + days);
                        const dateStr = date.toISOString().split('T')[0];
                        
                        if (payload.type === 'vault_expiry' && payload.rawSourceId) {
                            updateVaultItem(payload.rawSourceId, { personalDeadline: dateStr });
                        } else {
                            addDeadline({
                                title: `Target: ${payload.title}`,
                                category: 'Personal reminder',
                                dueDate: dateStr,
                                status: 'Upcoming',
                                priority: 'medium',
                                notes: 'Set via 1-Place execution workflow'
                            });
                        }
                        setReminderSet(true);
                    }}
                    disabled={!selectedDeadline}
                    className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer disabled:opacity-50"
                 >
                    {reminderSet ? 'Saved!' : 'Set'}
                 </button>
               </div>
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCreateAction}
                disabled={actionCreated}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-400 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-60"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-500" />
                <span>{actionCreated ? 'Action in Center' : 'Create Action'}</span>
              </button>

              {payload.deadline?.dueDate && (
                <button
                  type="button"
                  onClick={handleSetReminder}
                  disabled={reminderSet}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-400 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-60"
                >
                  <Calendar className="w-3.5 h-3.5 text-purple-500" />
                  <span>{reminderSet ? 'Calendar Exported (.ics)' : 'Export to .ics'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMarkResolved}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Completed</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

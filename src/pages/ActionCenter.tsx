import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  CheckCircle2,
  Circle,
  Clock3,
  Plus,
  Trash2,
  FolderLock,
  ShieldAlert,
  Award,
  CalendarClock,
  ArrowUpRight,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  ExternalLink
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import { ActionItem, ActionPriority, ActionState, ActionSourceType } from '../types';
import { NavTab } from '../components/layout/Sidebar';
import { OnePlaceExecutionModal, ExecutionPayload } from '../components/execution/OnePlaceExecutionModal';
import { buildActionPayload } from '../utils/executionBuilder';

interface ActionCenterProps {
  onNavigate?: (tab: NavTab) => void;
}

export const ActionCenter: React.FC<ActionCenterProps> = ({ onNavigate }) => {
  const {
    actions,
    addAction,
    updateAction,
    toggleActionState,
    deleteAction,
    vaultItems,
    problems,
    opportunities
  } = useLifeOS();

  const [activeModalPayload, setActiveModalPayload] = useState<ExecutionPayload | null>(null);

  // Active status tab: 'todo' | 'in_progress' | 'done'
  const [activeTab, setActiveTab] = useState<'todo' | 'in_progress' | 'done'>('todo');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<'all' | ActionSourceType>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | ActionPriority>('all');

  // Add Action Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState<ActionPriority>('NOW');
  const [newReason, setNewReason] = useState('');
  const [newNextStep, setNewNextStep] = useState('');
  const [newRequiredDoc, setNewRequiredDoc] = useState('');

  // Filtered items
  const filteredActions = useMemo(() => {
    return actions.filter(action => {
      // Tab matching
      if (activeTab === 'todo' && action.state !== 'Pending') return false;
      if (activeTab === 'in_progress' && action.state !== 'In Progress') return false;
      if (activeTab === 'done' && action.state !== 'Completed') return false;

      // Secondary filters
      if (sourceFilter !== 'all' && action.sourceType !== sourceFilter) return false;
      if (priorityFilter !== 'all' && action.priority !== priorityFilter) return false;

      return true;
    });
  }, [actions, activeTab, sourceFilter, priorityFilter]);

  const todoCount = actions.filter(a => a.state === 'Pending').length;
  const inProgressCount = actions.filter(a => a.state === 'In Progress').length;
  const doneCount = actions.filter(a => a.state === 'Completed').length;

  const handleCreateAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addAction({
      title: newTitle.trim(),
      priority: newPriority,
      state: 'Pending',
      dueDate: newDueDate || undefined,
      sourceType: 'Personal',
      reason: newReason.trim() || 'Manual operational task',
      nextStep: newNextStep.trim() || 'Complete this task',
      requiredDocument: newRequiredDoc.trim() || undefined
    });

    setNewTitle('');
    setNewDueDate('');
    setNewPriority('NOW');
    setNewReason('');
    setNewNextStep('');
    setNewRequiredDoc('');
    setIsAddOpen(false);
  };

  const getSourceIcon = (source?: ActionSourceType) => {
    switch (source) {
      case 'Vault Expiry':
        return <FolderLock className="w-3.5 h-3.5 text-blue-500" />;
      case 'Problem':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />;
      case 'Opportunity':
        return <Award className="w-3.5 h-3.5 text-emerald-500" />;
      case 'Deadline':
        return <CalendarClock className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <CheckSquare className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getPriorityBadge = (p: ActionPriority) => {
    switch (p) {
      case 'NOW':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/60">
            NOW
          </span>
        );
      case 'NEXT':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60">
            NEXT
          </span>
        );
      case 'LATER':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            LATER
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Action Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Operational task pipeline synchronized with Vault, disputes, and cutoffs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-2xs hover:opacity-90 transition-opacity cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New action</span>
        </button>
      </div>

      {/* Primary Status Tabs & Filters */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('todo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'todo'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>To do</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'todo'
                ? 'bg-slate-700 text-slate-200 dark:bg-slate-200 dark:text-slate-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {todoCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('in_progress')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'in_progress'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>In progress</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'in_progress'
                ? 'bg-slate-700 text-slate-200 dark:bg-slate-200 dark:text-slate-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {inProgressCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('done')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'done'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>Completed</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'done'
                ? 'bg-slate-700 text-slate-200 dark:bg-slate-200 dark:text-slate-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {doneCount}
            </span>
          </button>
        </div>

        {/* Filter Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
            showAdvancedFilters || sourceFilter !== 'all' || priorityFilter !== 'all'
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Filter</span>
        </button>
      </div>

      {/* Advanced Filter Bar */}
      {showAdvancedFilters && (
        <div className="p-3 bg-white dark:bg-[#111726] rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="all">All Sources</option>
              <option value="Problem">Disputes & Problems</option>
              <option value="Vault Expiry">Life Vault Expiries</option>
              <option value="Deadline">Deadlines</option>
              <option value="Opportunity">Opportunities</option>
              <option value="Personal">Personal</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="NOW">NOW</option>
              <option value="NEXT">NEXT</option>
              <option value="LATER">LATER</option>
            </select>
          </div>

          {(sourceFilter !== 'all' || priorityFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSourceFilter('all');
                setPriorityFilter('all');
              }}
              className="ml-auto text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* Action Items List */}
      {filteredActions.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto opacity-70" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No actions in this view
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {activeTab === 'todo'
              ? "You're all caught up! Everything is in progress or completed."
              : activeTab === 'in_progress'
              ? 'No items currently in progress.'
              : 'No completed tasks yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredActions.map((action) => {
            const isExpanded = expandedId === action.id;
            const isDone = action.state === 'Completed';
            const isInProgress = action.state === 'In Progress';

            return (
              <div
                key={action.id}
                className={`p-4 rounded-2xl bg-white dark:bg-[#111726] border transition-all ${
                  isDone
                    ? 'border-slate-200/60 dark:border-slate-800/60 opacity-60'
                    : isInProgress
                    ? 'border-indigo-200 dark:border-indigo-900/60 shadow-2xs'
                    : 'border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Main Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Checkbox trigger */}
                    <button
                      type="button"
                      onClick={() => toggleActionState(action.id)}
                      className="mt-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0 cursor-pointer"
                      title={isDone ? 'Mark to do' : 'Mark completed'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : isInProgress ? (
                        <Clock3 className="w-5 h-5 text-indigo-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-400 hover:text-indigo-500" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      {/* Priority & Source Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {getPriorityBadge(action.priority)}
                        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-800">
                          {getSourceIcon(action.sourceType)}
                          <span>{action.sourceType}</span>
                        </span>
                        {action.dueDate && (
                          <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded-md ${
                            action.dueDate === new Date().toISOString().split('T')[0]
                              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 font-bold border border-rose-100 dark:border-rose-900/50'
                              : 'text-slate-400'
                          }`}>
                            {action.dueDate === new Date().toISOString().split('T')[0] ? 'Due Today' : `Due ${action.dueDate}`}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4
                        className={`text-sm font-bold cursor-pointer ${
                          isDone
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-white'
                        }`}
                        onClick={() => setExpandedId(isExpanded ? null : action.id)}
                      >
                        {action.title}
                      </h4>

                      {/* Next step preview */}
                      {action.nextStep && !isExpanded && !isDone && (
                        <div className="mt-1 space-y-1">
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                            <span className="text-indigo-600 dark:text-indigo-400 font-medium">Next: </span>
                            {action.nextStep}
                          </p>
                          {(action.submissionLink || action.title.toLowerCase().includes('allianz') || action.nextStep.toLowerCase().includes('allianz')) && (
                            <div className="pt-0.5">
                              <a
                                href={action.submissionLink || (action.title.toLowerCase().includes('allianz') || action.nextStep.toLowerCase().includes('allianz') ? 'https://www.allianz-assistance.com' : '#')}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>
                                  {action.title.toLowerCase().includes('allianz') || action.nextStep.toLowerCase().includes('allianz')
                                    ? 'Open Allianz Global Assistance Official Website →'
                                    : 'Open Official Website →'}
                                </span>
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & expand toggle */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isDone && (
                      <button
                        type="button"
                        onClick={() => {
                          if (action.state === 'Pending') {
                            updateAction(action.id, { state: 'In Progress' });
                          } else {
                            updateAction(action.id, { state: 'Completed' });
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                          isInProgress
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {isInProgress ? 'Mark done' : 'Start'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : action.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                      aria-label="Toggle details"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                    {action.reason && (
                      <div>
                        <span className="text-slate-400 font-medium">Why: </span>
                        <span className="text-slate-700 dark:text-slate-300">{action.reason}</span>
                      </div>
                    )}

                    {action.requiredDocument && (
                      <div>
                        <span className="text-slate-400 font-medium">Required Info: </span>
                        <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">{action.requiredDocument}</span>
                      </div>
                    )}

                    {action.nextStep && (
                      <div>
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">Action Step: </span>
                        <span className="text-slate-700 dark:text-slate-300">{action.nextStep}</span>
                      </div>
                    )}

                    {/* Official Website Section */}
                    {Boolean(
                      action.submissionLink || 
                      action.title?.toLowerCase().includes('allianz') || 
                      action.nextStep?.toLowerCase().includes('allianz')
                    ) && (
                      <div className="pt-2.5 pb-1 space-y-1.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          OFFICIAL APPLICATION / CLAIMS WEBSITE
                        </span>
                        <a 
                          href={
                            action.submissionLink || 
                            (action.title?.toLowerCase().includes('allianz') || action.nextStep?.toLowerCase().includes('allianz')
                              ? 'https://www.allianz-assistance.com' 
                              : '#')
                          } 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>
                            {action.title?.toLowerCase().includes('allianz') || action.nextStep?.toLowerCase().includes('allianz')
                              ? 'Open Allianz Global Assistance Official Website →'
                              : 'Open Official Submission / Support Page →'}
                          </span>
                        </a>
                      </div>
                    )}

                    {/* Deadline Adjustments */}
                    {!isDone && (
                      <div className="pt-2">
                        <span className="block text-slate-400 font-medium mb-1.5">Action Deadline:</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const today = new Date().toISOString().split('T')[0];
                              updateAction(action.id, { dueDate: today });
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 text-[11px] font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors cursor-pointer"
                          >
                            Set for Today
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const tmrw = new Date();
                              tmrw.setDate(tmrw.getDate() + 1);
                              const tomorrow = tmrw.toISOString().split('T')[0];
                              updateAction(action.id, { dueDate: tomorrow });
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 text-[11px] font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors cursor-pointer"
                          >
                            Set for Tomorrow
                          </button>
                          <div className="relative flex items-center">
                            <input
                              type="date"
                              value={action.dueDate || ''}
                              onChange={(e) => {
                                if (e.target.value) {
                                  updateAction(action.id, { dueDate: e.target.value });
                                }
                              }}
                              className="pl-2.5 pr-2.5 py-1.5 h-[28px] rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 text-[11px] font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors cursor-pointer outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-50 dark:border-slate-800/50">
                      <button
                        type="button"
                        onClick={() => {
                          const payload = buildActionPayload(action, vaultItems, problems, opportunities);
                          setActiveModalPayload(payload);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs hover:opacity-90"
                      >
                        <Zap className="w-3 h-3 text-indigo-400" />
                        <span>Launch 1-Place</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => deleteAction(action.id)}
                          className="text-slate-400 hover:text-rose-500 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                New Action
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAction} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  What do you need to do? *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Renew passport before travel"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as ActionPriority)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="NOW">NOW (Urgent)</option>
                    <option value="NEXT">NEXT (This Week)</option>
                    <option value="LATER">LATER (Upcoming)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Next Step (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Schedule appointment on government portal"
                  value={newNextStep}
                  onChange={(e) => setNewNextStep(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-2xs hover:opacity-90 cursor-pointer"
                >
                  Save Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1-Place Execution Modal */}
      <OnePlaceExecutionModal
        isOpen={Boolean(activeModalPayload)}
        onClose={() => setActiveModalPayload(null)}
        payload={activeModalPayload}
        onNavigateToTab={onNavigate}
      />
    </div>
  );
};

import React, { useState } from 'react';
import {
  CalendarClock,
  Plus,
  CheckCircle2,
  Calendar,
  Check,
  Trash2,
  X,
  Zap,
  ChevronRight
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import { DeadlineCategory, DeadlineItem } from '../types';
import { OnePlaceExecutionModal, ExecutionPayload } from '../components/execution/OnePlaceExecutionModal';
import { buildActionPayload } from '../utils/executionBuilder';
import { downloadCalendarEvent } from '../utils/calendarExport';

export const Deadlines: React.FC = () => {
  const { deadlines, addDeadline, toggleDeadlineStatus, deleteDeadline, vaultItems, problems, opportunities } = useLifeOS();
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [activeModalPayload, setActiveModalPayload] = useState<ExecutionPayload | null>(null);

  // New Deadline Form
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<DeadlineCategory>('Document expiry');
  const [newDueDate, setNewDueDate] = useState<string>('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newNotes, setNewNotes] = useState<string>('');

  const CATEGORIES: DeadlineCategory[] = [
    'Document expiry',
    'Application deadline',
    'Payment deadline',
    'Personal reminder',
    'Other'
  ];

  // Helper for human-readable countdown
  const getCountdown = (dueDateStr: string) => {
    const today = new Date('2026-09-01T00:00:00');
    const due = new Date(dueDateStr + 'T00:00:00');
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)}d`, isUrgent: true, isOverdue: true, days: diffDays };
    }
    if (diffDays === 0) {
      return { text: 'Due today', isUrgent: true, isOverdue: false, days: 0 };
    }
    if (diffDays === 1) {
      return { text: 'Due tomorrow', isUrgent: true, isOverdue: false, days: 1 };
    }
    return { text: `In ${diffDays} days`, isUrgent: diffDays <= 7, isOverdue: false, days: diffDays };
  };

  const handleCreateDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDueDate) return;

    addDeadline({
      title: newTitle.trim(),
      category: newCategory,
      dueDate: newDueDate,
      status: 'Upcoming',
      priority: newPriority,
      notes: newNotes.trim() || undefined
    });

    setNewTitle('');
    setNewDueDate('');
    setNewNotes('');
    setIsAddModalOpen(false);
  };

  // Group into This week, This month, Later
  const activeItems = deadlines.filter(d => d.status !== 'Completed');
  const completedItems = deadlines.filter(d => d.status === 'Completed');

  const thisWeekItems: DeadlineItem[] = [];
  const thisMonthItems: DeadlineItem[] = [];
  const laterItems: DeadlineItem[] = [];

  activeItems.forEach(item => {
    const countdown = getCountdown(item.dueDate);
    if (countdown.days <= 7) {
      thisWeekItems.push(item);
    } else if (countdown.days <= 30) {
      thisMonthItems.push(item);
    } else {
      laterItems.push(item);
    }
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Deadlines & Expiries
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Automated intelligence tracking renewals, application cutoffs, and tax dates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-2xs hover:opacity-90 transition-opacity cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add deadline</span>
        </button>
      </div>

      {/* Main Groups */}
      {deadlines.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 space-y-2">
          <CalendarClock className="w-8 h-8 text-slate-400 mx-auto opacity-70" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No upcoming deadlines.
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Add a renewal date or application deadline to stay ahead.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
            >
              Add deadline
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* This Week */}
          {thisWeekItems.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <span>This Week</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-mono font-bold">
                  {thisWeekItems.length}
                </span>
              </h3>
              <div className="space-y-2">
                {thisWeekItems.map(item => renderDeadlineCard(item))}
              </div>
            </div>
          )}

          {/* This Month */}
          {thisMonthItems.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span>This Month</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-bold">
                  {thisMonthItems.length}
                </span>
              </h3>
              <div className="space-y-2">
                {thisMonthItems.map(item => renderDeadlineCard(item))}
              </div>
            </div>
          )}

          {/* Later */}
          {laterItems.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <span>Later</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono font-bold">
                  {laterItems.length}
                </span>
              </h3>
              <div className="space-y-2">
                {laterItems.map(item => renderDeadlineCard(item))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completedItems.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span>Completed</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono font-bold">
                  {completedItems.length}
                </span>
              </h3>
              <div className="space-y-2">
                {completedItems.map(item => renderDeadlineCard(item))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Add Deadline
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDeadline} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Passport Renewal, Scholarship Application"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as DeadlineCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context or requirements..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-2xs hover:opacity-90 cursor-pointer"
                >
                  Save Deadline
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
      />
    </div>
  );

  function renderDeadlineCard(item: DeadlineItem) {
    const isCompleted = item.status === 'Completed';
    const countdown = getCountdown(item.dueDate);

    return (
      <div
        key={item.id}
        className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs ${
          isCompleted
            ? 'bg-slate-50/60 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800/60 opacity-60'
            : 'bg-white dark:bg-[#111726] border-slate-200/80 dark:border-slate-800 shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => toggleDeadlineStatus(item.id)}
            className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
              isCompleted
                ? 'bg-emerald-500 text-white'
                : 'border border-slate-300 dark:border-slate-700 hover:border-indigo-500'
            }`}
          >
            {isCompleted && <Check className="w-3.5 h-3.5" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`font-bold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'} truncate`}>
                {item.title}
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-mono">
                · {item.category}
              </span>
            </div>
            {item.notes && (
              <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate mt-0.5">
                {item.notes}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              const payload = buildActionPayload(
                {
                  id: item.id,
                  userId: item.userId || 'current_user',
                  title: item.title,
                  priority: item.priority === 'high' ? 'NOW' : item.priority === 'medium' ? 'NEXT' : 'LATER',
                  state: item.status === 'Completed' ? 'Completed' : 'Pending',
                  dueDate: item.dueDate,
                  sourceType: 'Deadline',
                  reason: item.notes || `Urgent deadline due ${item.dueDate}`,
                  nextStep: 'Complete required preparation and submission',
                  createdAt: new Date().toISOString()
                },
                vaultItems,
                problems,
                opportunities
              );
              setActiveModalPayload(payload);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-2xs hover:opacity-90"
          >
            <Zap className="w-3 h-3 text-indigo-400" />
            <span className="hidden sm:inline">1-Place</span>
          </button>

          <div className="text-right pl-1">
            <span className={`text-[11px] font-bold block ${
              isCompleted
                ? 'text-slate-400'
                : countdown.isUrgent
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-700 dark:text-slate-300'
            }`}>
              {countdown.text}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {item.dueDate}
            </span>
          </div>

          <button
            type="button"
            onClick={() => deleteDeadline(item.id)}
            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }
};

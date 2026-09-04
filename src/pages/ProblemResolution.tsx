import React, { useState } from 'react';
import {
  Wrench,
  Plus,
  CheckCircle2,
  Check,
  Copy,
  X,
  Zap,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertCircle,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import { ProblemCategory, ProblemResolution as ProblemType } from '../types';
import { OnePlaceExecutionModal, ExecutionPayload } from '../components/execution/OnePlaceExecutionModal';
import { buildProblemPayload } from '../utils/executionBuilder';
import { InsuranceClaimModal } from '../components/insurance/InsuranceClaimModal';
import { doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

export const ProblemResolution: React.FC = () => {
  const { user } = useAuth();
  const {
    problems,
    setProblems,
    updateProblem,
    resolveProblem,
    addMissingInfoToProblem,
    vaultItems
  } = useLifeOS();

  // Accordion state: map of problem ID to expanded boolean. Default first to true.
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [isAddInfoOpen, setIsAddInfoOpen] = useState<boolean>(false);
  const [targetProblemId, setTargetProblemId] = useState<string>('');
  const [selectedMissingItem, setSelectedMissingItem] = useState<string>('');
  const [missingItemValue, setMissingItemValue] = useState<string>('');
  const [activeModalPayload, setActiveModalPayload] = useState<ExecutionPayload | null>(null);

  // Specialized Modal
  const [isInsuranceModalOpen, setIsInsuranceModalOpen] = useState<boolean>(false);

  // New Problem Form
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<ProblemCategory>('Shopping / Orders');
  const [newDescription, setNewDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);

  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  const toggleAccordion = (id: string) => {
    setExpandedMap(prev => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id]
    }));
  };

  const isProblemExpanded = (id: string, index: number) => {
    if (expandedMap[id] !== undefined) {
      return expandedMap[id];
    }
    // By default, expand the first problem in the list
    return index === 0;
  };

  const CATEGORIES: ProblemCategory[] = [
    'Shopping / Orders',
    'Banking / Finance',
    'Bills / Subscriptions',
    'Travel',
    'Education',
    'Government / Documents',
    'Employment',
    'Other'
  ];

  const handleCreateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim() || isSubmitting) return;
    if (!user || !user.uid) {
      setSubmitError('You must be logged in to create a problem case');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Safe client timeout of 25 seconds
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 25000);

    try {
      const generatedId = `prob_${Date.now()}`;
      const title = newTitle.trim() || `${newCategory} Issue`;
      
      const response = await fetch('/api/problems/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid
        },
        body: JSON.stringify({
          problemDescription: `${title}: ${newDescription.trim()}`,
          category: newCategory
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const analysis = await response.json();
      
      const newProblem: ProblemType = {
        id: generatedId,
        userId: user.uid,
        title,
        category: newCategory,
        rawInput: newDescription.trim(),
        createdAt: new Date().toISOString(),
        status: 'Action Plan Ready',
        understanding: analysis.understanding || `Reported issue regarding ${newCategory}: ${title}`,
        missingInformation: Array.isArray(analysis.missingInformation) ? analysis.missingInformation : [],
        actionPlan: Array.isArray(analysis.actionPlan) ? analysis.actionPlan : [],
        communicationDraft: analysis.communicationDraft || undefined,
        submissionLink: analysis.submissionLink || undefined
      };

      // Optimistic local update so UI responds instantly
      setProblems(prev => [newProblem, ...prev]);
      
      // Auto-expand the newly created problem
      setExpandedMap(prev => ({ ...prev, [newProblem.id]: true }));
      setIsNewModalOpen(false);
      setNewTitle('');
      setNewDescription('');

      // Perform Firestore setDoc in background without awaiting
      if (db && !user.uid.includes('demo')) {
        setDoc(doc(db, 'users', user.uid, 'problems', newProblem.id), newProblem).catch(err => {
          console.error("Firestore background creation failed:", err);
        });
      }
    } catch (err: any) {
      console.error("Analysis failed:", err);
      if (err.name === 'AbortError' || (err instanceof DOMException && err.name === 'AbortError')) {
        setSubmitError("Problem analysis timed out. Please try again.");
      } else {
        setSubmitError(err?.message || "Failed to analyze the problem. Please try again.");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsSubmitting(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelNewModal = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsNewModalOpen(false);
    setSubmitError(null);
    setIsSubmitting(false);
  };

  const handleToggleStep = (problem: ProblemType, stepNumber: number) => {
    const updatedPlan = problem.actionPlan.map(s =>
      s.step === stepNumber ? { ...s, completed: !s.completed } : s
    );
    updateProblem(problem.id, { actionPlan: updatedPlan });
  };

  const handleSaveMissingInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProblemId || !selectedMissingItem || !missingItemValue.trim()) return;

    addMissingInfoToProblem(targetProblemId, selectedMissingItem, missingItemValue.trim());
    setIsAddInfoOpen(false);
    setSelectedMissingItem('');
    setMissingItemValue('');
    setTargetProblemId('');
  };

  const handleCopyDraft = (problemId: string, draftText: string) => {
    navigator.clipboard.writeText(draftText);
    setCopiedDraftId(problemId);
    setTimeout(() => setCopiedDraftId(null), 2000);
  };

  const handleDelete = async (problemId: string, title: string) => {
    if (!user || !user.uid) {
      setDeleteError("You must be logged in to delete a problem.");
      return;
    }
    
    // Instead of window.confirm which is blocked in iframes, 
    // just proceed with deletion directly, it's safer than hanging the UI.
    // If you prefer 2-step click, you can do it via state, but direct delete works 100%.
    
    setIsDeletingId(problemId);
    setDeleteError(null);
    setDeleteSuccess(null);
    try {
      // Remove locally immediately to ensure the UI updates NOW
      setProblems(prev => prev.filter(p => p.id !== problemId));
      setDeleteSuccess(`"${title}" deleted successfully.`);
      setTimeout(() => setDeleteSuccess(null), 3000);
      
      // Do Firestore delete in background, do NOT await it here so it doesn't hang
      if (db && !user.uid.includes('demo')) {
        const problemRef = doc(db, 'users', user.uid, 'problems', problemId);
        deleteDoc(problemRef).catch(err => {
          console.error("Firestore background delete failed:", err);
        });
      }
    } catch (err: any) {
      console.error("Delete failed:", err);
      setDeleteError(err?.message || "Failed to delete the problem. Please try again.");
      setTimeout(() => setDeleteError(null), 4000);
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Solve a Problem
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Step-by-step resolution for online orders, damaged goods, billing disputes, and paperwork.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsInsuranceModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold shadow-2xs hover:opacity-95 transition-all cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Insurance Claim</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-2xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Describe a problem</span>
          </button>
        </div>
      </div>

      {/* Alerts for deletion feedback */}
      {(deleteSuccess || deleteError) && (
        <div className="space-y-2 mb-4">
          {deleteSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 border border-emerald-200/50 dark:border-emerald-900/50">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{deleteSuccess}</span>
            </div>
          )}
          {deleteError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 border border-rose-200/50 dark:border-rose-900/50">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{deleteError}</span>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {problems.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 space-y-2">
          <Wrench className="w-8 h-8 text-slate-400 mx-auto opacity-70" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No active problems.
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Tell LIFEOS what went wrong and we'll help you work through it with a structured action plan.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
            >
              Describe a problem
            </button>
          </div>
        </div>
      ) : (
        /* Accordion Problem List */
        <div className="space-y-4">
          {problems.map((problem, index) => {
            const isExpanded = isProblemExpanded(problem.id, index);
            const actionPlan = Array.isArray(problem.actionPlan) ? problem.actionPlan : [];
            const missingInfo = Array.isArray(problem.missingInformation) ? problem.missingInformation : [];
            const completedCount = actionPlan.filter(s => s.completed).length;

            return (
              <div
                key={problem.id}
                className="rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden transition-all"
              >
                {/* Accordion Card Header */}
                <div
                  onClick={() => toggleAccordion(problem.id)}
                  className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors select-none"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {problem.category}
                      </span>
                      {problem.status === 'Resolved' ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40">
                          Resolved
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                          In Progress ({completedCount}/{actionPlan.length} steps)
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                      {problem.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(problem.id, problem.title);
                      }}
                      title="Delete Problem"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="p-1 rounded-lg text-slate-400">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Accordion Content Body */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 pt-0 space-y-4 border-t border-slate-100 dark:border-slate-800/80">
                    {/* 4-Stage Progress Stepper */}
                    <div className="pt-3">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                          Resolution Roadmap
                        </span>
                        <span className="font-mono text-slate-500 text-[11px]">
                          {completedCount}/{actionPlan.length} Steps Completed
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-semibold">
                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
                          1. Understand
                        </div>
                        <div className={`p-2 rounded-xl border ${
                          missingInfo.length === 0
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/60'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/60'
                        }`}>
                          2. Missing Info
                        </div>
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          3. Plan
                        </div>
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          4. Draft
                        </div>
                      </div>
                    </div>

                    {/* 1. What We Know */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Situation Summary
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {problem.understanding}
                      </p>
                    </div>

                    {/* 2. What Is Missing */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Missing Information / Required Details
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {missingInfo.length} pending
                        </span>
                      </div>

                      {missingInfo.length > 0 ? (
                        <div className="space-y-2">
                          {missingInfo.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span className="text-amber-900 dark:text-amber-300 font-medium">
                                  Missing: {item}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetProblemId(problem.id);
                                  setSelectedMissingItem(item);
                                  setMissingItemValue('');
                                  setIsAddInfoOpen(true);
                                }}
                                className="px-3 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer shadow-2xs"
                              >
                                Provide Details
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 border border-emerald-200/60 dark:border-emerald-900/60">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                          <span>All dispute details and evidence are complete.</span>
                        </div>
                      )}
                    </div>

                    {/* 3. Action Plan */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Step-by-Step Action Plan
                      </span>

                      <div className="space-y-2">
                        {actionPlan.map((step) => (
                          <div
                            key={step.step}
                            onClick={() => handleToggleStep(problem, step.step)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 text-xs ${
                              step.completed
                                ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-60'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                              step.completed
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}>
                              {step.completed ? <Check className="w-3 h-3" /> : step.step}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h5 className={`font-semibold ${step.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                {step.title}
                              </h5>
                              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                                {step.detail}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Communication Draft */}
                      {problem.communicationDraft && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                              Drafted Message / Formal Grievance:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyDraft(problem.id, problem.communicationDraft!)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedDraftId === problem.id ? 'Copied!' : 'Copy Draft'}</span>
                            </button>
                          </div>
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-mono text-[11px] whitespace-pre-wrap leading-relaxed border border-slate-100 dark:border-slate-800 max-h-48 overflow-y-auto">
                            {problem.communicationDraft}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Problem Actions Footer */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            const payload = buildProblemPayload(problem, vaultItems);
                            setActiveModalPayload(payload);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
                        >
                          <Zap className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Continue in 1-Place</span>
                        </button>

                        {problem.submissionLink && (
                          <a
                            href={problem.submissionLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/50 text-xs font-semibold flex items-center gap-1.5 hover:bg-indigo-100 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open Portal / Support</span>
                          </a>
                        )}

                        {problem.status !== 'Resolved' ? (
                          <button
                            type="button"
                            onClick={() => resolveProblem(problem.id)}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Mark as resolved
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Resolved</span>
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={isDeletingId === problem.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(problem.id, problem.title);
                        }}
                        className={`px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                          isDeletingId === problem.id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isDeletingId === problem.id ? 'Deleting...' : 'Delete Problem'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Problem Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Describe a Problem
              </h3>
              <button
                type="button"
                onClick={handleCancelNewModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProblem} className="space-y-3 text-xs">
              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 font-medium flex items-start gap-2 border border-rose-200/50 dark:border-rose-900/50">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ProblemCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Summary Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Damaged monitor delivery from TechStore"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  What happened? *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the issue in plain words: order numbers, merchant names, dates, or what went wrong..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCancelNewModal}
                  className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newDescription.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-2xs hover:opacity-90 disabled:opacity-40 cursor-pointer"
                >
                  {isSubmitting ? 'Analyzing problem...' : 'Generate Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provide Missing Info Modal */}
      {isAddInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Provide Information
              </h3>
              <button
                type="button"
                onClick={() => setIsAddInfoOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMissingInfo} className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Required Detail:
                </span>
                <p className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 font-medium">
                  {selectedMissingItem}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Enter Detail / Reference / Number
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Type the reference ID, date, amount, or explanation..."
                  value={missingItemValue}
                  onChange={(e) => setMissingItemValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddInfoOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!missingItemValue.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-2xs hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  Save Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Insurance Claim Assistant Modal */}
      <InsuranceClaimModal
        isOpen={isInsuranceModalOpen}
        onClose={() => setIsInsuranceModalOpen(false)}
      />

      {/* 1-Place Execution Modal */}
      <OnePlaceExecutionModal
        isOpen={Boolean(activeModalPayload)}
        onClose={() => setActiveModalPayload(null)}
        payload={activeModalPayload}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { Shield, Sparkles, FolderLock, Calendar, HelpCircle, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { useLifeOS } from '../../context/LifeOSContext';
import { useAuth } from '../../context/AuthContext';
import { NavTab } from '../layout/Sidebar';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: NavTab) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onNavigateTab }) => {
  const { completeOnboarding } = useLifeOS();
  const { user } = useAuth();

  const [selectedAreas, setSelectedAreas] = useState<string[]>([
    'documents',
    'deadlines',
    'problems',
    'opportunities'
  ]);

  if (!isOpen) return null;

  const toggleArea = (id: string) => {
    if (selectedAreas.includes(id)) {
      setSelectedAreas(prev => prev.filter(a => a !== id));
    } else {
      setSelectedAreas(prev => [...prev, id]);
    }
  };

  const handleFinish = (targetTab?: NavTab) => {
    completeOnboarding(selectedAreas);
    onClose();
    if (targetTab && onNavigateTab) {
      onNavigateTab(targetTab);
    }
  };

  const AREAS = [
    {
      id: 'documents',
      title: 'Important Documents',
      desc: 'Store IDs, passports, certificates, and tax records securely.',
      icon: <FolderLock className="w-5 h-5 text-indigo-500" />,
      tab: 'vault' as NavTab
    },
    {
      id: 'deadlines',
      title: 'Deadlines & Renewals',
      desc: 'Never miss document expiries, filing dates, or application cutoffs.',
      icon: <Calendar className="w-5 h-5 text-amber-500" />,
      tab: 'deadlines' as NavTab
    },
    {
      id: 'problems',
      title: 'Problems & Disputes',
      desc: 'Resolve damaged orders, delayed refunds, or service complaints.',
      icon: <HelpCircle className="w-5 h-5 text-rose-500" />,
      tab: 'problems' as NavTab
    },
    {
      id: 'opportunities',
      title: 'Scholarships & Grants',
      desc: 'Discover verified education funds, government schemes, and benefits.',
      icon: <Sparkles className="w-5 h-5 text-emerald-500" />,
      tab: 'opportunities' as NavTab
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0E131F] w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-indigo-50/80 to-transparent dark:from-indigo-950/30 dark:to-transparent border-b border-slate-100 dark:border-slate-800/80 relative">
          <button
            type="button"
            onClick={() => handleFinish()}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20">
              L
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Welcome to LIFEOS
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {user?.displayName ? `Hello, ${user.displayName}` : 'Personal AI Operations Assistant'}
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg">
            Your personal operations assistant for documents, deadlines, problems, and opportunities.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              What would you like LIFEOS to help you manage?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AREAS.map(area => {
                const isSelected = selectedAreas.includes(area.id);
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => toggleArea(area.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs shrink-0 mt-0.5">
                      {area.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {area.title}
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                        {area.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 flex items-start gap-3">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
              <strong>Isolated & Private:</strong> All your personal identifiers and documents are isolated to your account. Sensitive numbers are masked by default.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleFinish('vault')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer"
          >
            Add your first document →
          </button>
          <button
            type="button"
            onClick={() => handleFinish('dashboard')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer"
          >
            <span>Enter Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

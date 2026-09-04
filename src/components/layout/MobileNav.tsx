import React, { useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  FolderLock,
  Sparkles,
  MoreHorizontal,
  Wrench,
  Award,
  CalendarClock,
  ShieldCheck,
  Shield,
  X,
  ArrowLeftRight,
  Sun,
  Moon,
  LogOut
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { useLifeOS } from '../../context/LifeOSContext';
import { useAuth } from '../../context/AuthContext';

interface MobileNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenCopilot: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenCopilot
}) => {
  const { summaryStats, actions } = useLifeOS();
  const { user, toggleDarkMode, loginDemo, exitDemo, signOut, isDemoMode } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const activeActionsCount = actions.filter(a => a.state !== 'Completed').length;
  const isAlex = user?.email?.toLowerCase().includes('alex') || user?.displayName?.toLowerCase().includes('alex');

  const handleSelectMoreTab = (tab: NavTab) => {
    onSelectTab(tab);
    setIsMoreOpen(false);
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FBFBFC]/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-3 py-2 safe-area-pb transition-colors">
        <div className="flex items-center justify-around">
          {/* Home */}
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[10px]">Home</span>
          </button>

          {/* Actions */}
          <button
            type="button"
            onClick={() => onSelectTab('actions')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-colors relative cursor-pointer ${
              activeTab === 'actions'
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span className="text-[10px]">Actions</span>
            {activeActionsCount > 0 && (
              <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-indigo-600" />
            )}
          </button>

          {/* Center AI Ask Button */}
          <button
            type="button"
            onClick={onOpenCopilot}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'copilot'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-xs'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/60'
            }`}
            aria-label="Ask LIFEOS"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-bold">Ask</span>
          </button>

          {/* Vault */}
          <button
            type="button"
            onClick={() => onSelectTab('vault')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-colors relative cursor-pointer ${
              activeTab === 'vault'
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <FolderLock className="w-4 h-4" />
            <span className="text-[10px]">Vault</span>
            {summaryStats.expiringDocsCount > 0 && (
              <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-amber-500" />
            )}
          </button>

          {/* More */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
              ['problems', 'opportunities', 'deadlines', 'settings'].includes(activeTab)
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
            <span className="text-[10px]">More</span>
          </button>
        </div>
      </nav>

      {/* More Sheet / Drawer */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111726] border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Additional Modules
              </span>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectMoreTab('problems')}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-colors cursor-pointer ${
                  activeTab === 'problems'
                    ? 'bg-slate-50 dark:bg-slate-900 border-indigo-500 text-slate-900 dark:text-white'
                    : 'bg-white dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Wrench className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">Solve</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Problem resolution</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMoreTab('opportunities')}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-colors cursor-pointer ${
                  activeTab === 'opportunities'
                    ? 'bg-slate-50 dark:bg-slate-900 border-indigo-500 text-slate-900 dark:text-white'
                    : 'bg-white dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Award className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">Opportunities</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Grants & benefits</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMoreTab('deadlines')}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-colors cursor-pointer ${
                  activeTab === 'deadlines'
                    ? 'bg-slate-50 dark:bg-slate-900 border-indigo-500 text-slate-900 dark:text-white'
                    : 'bg-white dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <CalendarClock className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">Deadlines</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Important cutoffs</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMoreTab('settings')}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-colors cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-slate-50 dark:bg-slate-900 border-indigo-500 text-slate-900 dark:text-white'
                    : 'bg-white dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">Privacy</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Security & settings</div>
                </div>
              </button>
            </div>

            {/* Quick Demo & Theme Switchers */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
              {isDemoMode && (
                <button
                  type="button"
                  onClick={() => {
                    loginDemo(isAlex ? 'sridev' : 'alex');
                    setIsMoreOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Switch: {isAlex ? 'Sridev' : 'Alex'}</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  {user?.preferences?.darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isDemoMode) {
                      exitDemo();
                    } else {
                      signOut();
                    }
                    setIsMoreOpen(false);
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold cursor-pointer"
                  title={isDemoMode ? 'Exit Demo' : 'Sign Out'}
                >
                  {isDemoMode ? 'Exit Demo' : 'Sign Out'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

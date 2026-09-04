import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  FolderLock,
  Wrench,
  Award,
  CalendarClock,
  Sparkles,
  ShieldCheck,
  Shield,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLifeOS } from '../../context/LifeOSContext';
import { BrandLogo } from '../common/BrandLogo';

export type NavTab = 'dashboard' | 'actions' | 'vault' | 'problems' | 'opportunities' | 'deadlines' | 'copilot' | 'settings' | 'admin';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenAuthModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab
}) => {
  const { user, session, signOut, toggleDarkMode } = useAuth();
  const { summaryStats, actions } = useLifeOS();

  const activeActionsCount = actions.filter(a => a.state !== 'Completed').length;

  const PRIMARY_NAV = [
    {
      id: 'dashboard' as NavTab,
      label: 'HOME',
      icon: LayoutDashboard
    },
    {
      id: 'actions' as NavTab,
      label: 'ACTIONS',
      icon: CheckSquare,
      badge: activeActionsCount > 0 ? `${activeActionsCount}` : null,
      badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
    },
    {
      id: 'vault' as NavTab,
      label: 'VAULT',
      icon: FolderLock,
      badge: summaryStats.expiringDocsCount > 0 ? `${summaryStats.expiringDocsCount}` : null,
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
    },
    {
      id: 'problems' as NavTab,
      label: 'SOLVE',
      icon: Wrench,
      badge: summaryStats.activeProblemsCount > 0 ? `${summaryStats.activeProblemsCount}` : null,
      badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
    },
    {
      id: 'opportunities' as NavTab,
      label: 'OPPORTUNITIES',
      icon: Award
    },
    {
      id: 'deadlines' as NavTab,
      label: 'DEADLINES',
      icon: CalendarClock,
      badge: summaryStats.urgentDeadlinesCount > 0 ? `${summaryStats.urgentDeadlinesCount}` : null,
      badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
    }
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-[#FBFBFC] dark:bg-[#0B0F19] border-r border-slate-200/80 dark:border-slate-800/80 p-3 select-none z-30 transition-colors">
      {/* Brand Identity */}
      <div className="px-3 py-3 mb-3">
        <BrandLogo size="md" />
      </div>

      {/* Primary AI Trigger */}
      <div className="px-2 mb-4">
        <button
          type="button"
          onClick={() => onSelectTab('copilot')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'copilot'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-slate-400 border border-slate-200/80 dark:border-slate-800 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>ASK LIFEOS</span>
          </div>
          <span className="text-[10px] font-mono opacity-60">⌘K</span>
        </button>
      </div>

      {/* Primary Navigation */}
      <div className="flex-1 space-y-1 overflow-y-auto px-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
          Navigation
        </div>
        {PRIMARY_NAV.map((item) => {
          const IconComp = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all group cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs border border-slate-200/60 dark:border-slate-800 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <IconComp
                  className={`w-4 h-4 ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-md ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Secondary Navigation: Privacy & Settings */}
      <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/80 px-2 space-y-1">
        <button
          type="button"
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold border border-slate-200/60 dark:border-slate-800'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-900/50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Privacy & Security</span>
        </button>

        {/* User Footer */}
        <div className="flex items-center justify-between pt-2 px-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center uppercase shrink-0">
              {(session?.displayName || user?.displayName || 'U').slice(0, 1)}
            </div>
            <span className="truncate text-slate-800 dark:text-slate-200 font-semibold text-[11px]">
              {session?.displayName || user?.displayName || 'Account'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleDarkMode}
              title="Toggle theme"
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {user?.preferences?.darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

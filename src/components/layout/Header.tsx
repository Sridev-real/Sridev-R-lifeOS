import React from 'react';
import { Search, Lock, Moon, Sun, ArrowLeftRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NavTab } from './Sidebar';
import { NotificationDropdown } from '../notifications/NotificationDropdown';
import { BrandLogo } from '../common/BrandLogo';

interface HeaderProps {
  activeTab: NavTab;
  onOpenAuthModal: () => void;
  onOpenCommandBar: () => void;
  onNavigateTab?: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenAuthModal,
  onOpenCommandBar,
  onNavigateTab
}) => {
  const { user, session, toggleDarkMode, loginDemo, isDemoMode } = useAuth();

  const isDemo = session?.mode === 'demo';
  const isAlex = session?.mode === 'demo' ? session.demoUserId === 'alex' : false;

  // Greeting helper based on local time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = session?.displayName
    ? session.displayName.split(' ')[0]
    : (user?.displayName ? user.displayName.split(' ')[0] : 'there');

  return (
    <header className="sticky top-0 z-20 bg-[#FBFBFC]/90 dark:bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between transition-colors">
      {/* Left side: Brand (on mobile) or Greeting */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="md:hidden flex items-center gap-2">
          <BrandLogo size="sm" showText={false} />
          <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">LIFE<span className="text-indigo-600 dark:text-indigo-400">OS</span></span>
        </div>

        <div className="hidden sm:block">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              {getGreeting()}, {firstName}
            </h2>
            {isDemo ? (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80" title="Sample data — not real personal information">
                DEMO MODE
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80" title="Your private, encrypted UID namespace">
                SECURE WORKSPACE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Here's what needs your attention.
          </p>
        </div>
      </div>

      {/* Right side: Quick Search + Demo Switcher + Notifications + Theme + Account */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Quick Search / Command Bar */}
        <button
          type="button"
          onClick={onOpenCommandBar}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 text-slate-500 dark:text-slate-400 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          title="Search or execute actions (⌘K / Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Ask or search...</span>
          <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">⌘K</kbd>
        </button>

        {/* 1-Click Demo Switcher */}
        {isDemoMode && (
          <button
            type="button"
            onClick={() => loginDemo(isAlex ? 'sridev' : 'alex')}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            title={`Switch to ${isAlex ? 'Sridev Dev (Student)' : 'Alex Rivera (Freelancer)'}`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500" />
            <span>Switch: {isAlex ? 'Sridev' : 'Alex'}</span>
          </button>
        )}

        {/* Notifications Dropdown */}
        <NotificationDropdown onNavigateTab={onNavigateTab} />

        {/* Privacy & Protection Status Indicator */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50/80 dark:bg-emerald-950/40 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Private & protected</span>
        </div>

        {/* Dark/Light Mode Switch */}
        <button
          type="button"
          onClick={toggleDarkMode}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={user?.preferences?.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {user?.preferences?.darkMode ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-slate-600" />
          )}
        </button>

        {/* User Account / Profile */}
        <button
          type="button"
          onClick={onOpenAuthModal}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <div className="w-5 h-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-[10px] font-bold">
            {user?.displayName ? user.displayName.slice(0, 1) : 'U'}
          </div>
          <span className="max-w-[90px] truncate hidden sm:inline">{user?.displayName || 'Account'}</span>
        </button>
      </div>
    </header>
  );
};

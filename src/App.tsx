import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LifeOSProvider, useLifeOS } from './context/LifeOSContext';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { Header } from './components/layout/Header';
import { Dashboard } from './pages/Dashboard';
import { ActionCenter } from './pages/ActionCenter';
import { LifeVault } from './pages/LifeVault';
import { ProblemResolution } from './pages/ProblemResolution';
import { Opportunities } from './pages/Opportunities';
import { Deadlines } from './pages/Deadlines';
import { Copilot } from './pages/Copilot';
import { Settings } from './pages/Settings';
import { Admin } from './pages/Admin';
import { AuthModal } from './components/auth/AuthModal';
import { AuthGate } from './components/auth/AuthGate';
import { CommandBar } from './components/common/CommandBar';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { Sparkles } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, session, isAuthenticated, isInitialized, loading, authSuccessToast, clearAuthSuccessToast } = useAuth();
  const { sendCopilotMessage, isOnboardingCompleted } = useLifeOS();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isCommandBarModalOpen, setIsCommandBarModalOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  // Auto-dismiss auth success toast after 7 seconds
  useEffect(() => {
    if (authSuccessToast) {
      const timer = setTimeout(() => {
        clearAuthSuccessToast();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [authSuccessToast, clearAuthSuccessToast]);

  // Trigger onboarding modal if not yet completed
  useEffect(() => {
    if (isAuthenticated && !isOnboardingCompleted) {
      setIsOnboardingOpen(true);
    }
  }, [isAuthenticated, isOnboardingCompleted]);

  // Apply dark mode class to root HTML element
  useEffect(() => {
    if (user?.preferences?.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [user?.preferences?.darkMode]);

  const handleExecuteCommand = (query: string) => {
    sendCopilotMessage(query);
    setActiveTab('copilot');
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-xs">
        Loading secure workspace...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthGate />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigate={setActiveTab}
            onExecuteCommand={handleExecuteCommand}
          />
        );
      case 'actions':
        return <ActionCenter onNavigate={setActiveTab} />;
      case 'vault':
        return <LifeVault />;
      case 'problems':
        return <ProblemResolution />;
      case 'opportunities':
        return <Opportunities />;
      case 'deadlines':
        return <Deadlines />;
      case 'copilot':
        return <Copilot onNavigate={setActiveTab} />;
      case 'settings':
        return <Settings />;
      case 'admin':
        return <Admin onNavigate={setActiveTab} />;
      default:
        return (
          <Dashboard
            onNavigate={setActiveTab}
            onExecuteCommand={handleExecuteCommand}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors">
      {/* Desktop Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenCommandBar={() => setIsCommandBarModalOpen(true)}
          onNavigateTab={setActiveTab}
        />

        {/* Success Toast Banner: Strictly for Real Firebase authenticated users */}
        {session?.mode === 'firebase' && authSuccessToast && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs sm:text-sm flex items-center justify-between shadow-xl backdrop-blur-md z-30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">✓</div>
              <div>
                <p className="font-bold text-white">{authSuccessToast}</p>
                <p className="text-[11px] text-emerald-300/80">Your secure workspace is ready and partitioned.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearAuthSuccessToast}
              className="text-emerald-400 hover:text-white text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-900/40 hover:bg-emerald-900 cursor-pointer transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Page Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {renderActiveView()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenCopilot={() => setActiveTab('copilot')}
      />

      {/* Floating Quick Action Button on Desktop when not in Copilot */}
      {activeTab !== 'copilot' && (
        <button
          type="button"
          onClick={() => setActiveTab('copilot')}
          className="hidden lg:flex fixed bottom-6 right-6 z-30 items-center gap-2 px-4 py-3 rounded-2xl bg-linear-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Ask LIFEOS</span>
        </button>
      )}

      {/* Onboarding Walkthrough Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onNavigateTab={setActiveTab}
      />

      {/* Global Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <LifeOSProvider>
        <MainLayout />
      </LifeOSProvider>
    </AuthProvider>
  );
}

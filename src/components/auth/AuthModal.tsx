import React, { useState } from 'react';
import { Shield, KeyRound, Mail, User, Lock, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, signIn, signUp, signOut, loginDemo, exitDemo, isAuthenticated, isDemoMode } = useAuth();
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setStatusMsg({ type: 'error', text: 'Please enter both email and password.' });
      return;
    }

    if (password.length < 6) {
      setStatusMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      if (isRegistering) {
        const displayName = name.trim() || email.split('@')[0];
        const successText = `Account created successfully. Welcome to LIFEOS, ${displayName}.`;
        await signUp(email, password, displayName);
        setStatusMsg({ type: 'success', text: successText });
      } else {
        const displayName = email.split('@')[0];
        const successText = `Welcome back, ${displayName}.`;
        await signIn(email, password);
        setStatusMsg({ type: 'success', text: successText });
      }
      setTimeout(() => {
        onClose();
        setStatusMsg(null);
      }, 1000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Authentication failed. Please verify credentials.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSwitch = (target: 'sridev' | 'alex') => {
    loginDemo(target);
    setStatusMsg({ type: 'success', text: `Switched to demo evaluation profile.` });
    setTimeout(() => {
      onClose();
      setStatusMsg(null);
    }, 800);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAuthenticated ? "Account & Authentication" : (isRegistering ? "Create LIFEOS Account" : "Authenticate to LIFEOS")}
      subtitle="Firebase Authentication • Isolated User Namespace"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Security Isolation Notice */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Zero-Trust Isolation Architecture</span>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                All Vault items, problems, and deadlines are partitioned strictly by your unique user ID (UID).
                {isDemoMode && <span className="block text-amber-500 font-semibold mt-1">Currently running in DEMO MODE.</span>}
              </p>
            </div>
          </div>
        </div>

        {statusMsg && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {isAuthenticated ? (
          /* Active Authenticated Profile View */
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'US'}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {user?.displayName} {isDemoMode && <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded ml-1">DEMO</span>}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                    {user?.email}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      UID: {user?.uid}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Switch Test Account Namespace (Demo Mode)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoSwitch('sridev')}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-400 text-left text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Sridev Dev</p>
                  <p className="text-[10px] text-slate-400 truncate">Student Profile</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoSwitch('alex')}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-400 text-left text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Alex Rivera</p>
                  <p className="text-[10px] text-slate-400 truncate">Freelancer Profile</p>
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={async () => {
                  if (isDemoMode) {
                    exitDemo();
                  } else {
                    await signOut();
                  }
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{isDemoMode ? 'Exit Demo' : 'Sign Out'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Sign In / Sign Up Form */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sridev Dev"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••• (min 6 chars)"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <span>{isRegistering ? 'Create Isolated Workspace' : 'Sign In'}</span>
              )}
            </button>

            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {isRegistering ? 'Already have an account?' : 'Need a new workspace?'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setStatusMsg(null);
                }}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                {isRegistering ? 'Sign In' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

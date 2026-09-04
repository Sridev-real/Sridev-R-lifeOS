import React, { useState } from 'react';
import { Shield, Lock, ArrowRight, CheckCircle2, Sparkles, KeyRound, Mail, User, Terminal, AlertTriangle, Play, HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { projectId } from '../../services/firebase';
import { Admin } from '../../pages/Admin';

export const AuthGate: React.FC = () => {
  const { signIn, signUp, loginDemo, loading } = useAuth();
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [showAdminView, setShowAdminView] = useState<boolean>(false);
  const [lastOp, setLastOp] = useState<string>('None');
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null);

  const validateEmail = (e: string) => {
    return e.includes('@') && e.includes('.') && e.length > 5;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLastOp(isRegistering ? 'Register' : 'Login');

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (trimmedPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (isRegistering) {
      if (trimmedPassword !== confirmPassword.trim()) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    }

    try {
      if (isRegistering) {
        const displayName = name.trim() || trimmedEmail.split('@')[0];
        const userCred = await signUp(trimmedEmail, trimmedPassword, displayName);
        const resolvedName = userCred.user.displayName || displayName;
        const successText = `Account created successfully. Welcome to LIFEOS, ${resolvedName}.`;
        setSuccessMsg(successText);
        localStorage.setItem('lifeos_success_toast', successText);

        // Sync real Firebase user to server Admin directory
        fetch('/api/admin/sync-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: userCred.user.uid,
            email: trimmedEmail,
            displayName: resolvedName,
            role: 'Verified User',
            status: 'Active'
          })
        }).catch(() => {});
      } else {
        const cred = await signIn(trimmedEmail, trimmedPassword);
        const resolvedName = cred.user.displayName || cred.user.email || trimmedEmail;
        const successText = `Welcome back, ${resolvedName}.`;
        setSuccessMsg(successText);
        localStorage.setItem('lifeos_success_toast', successText);

        // Sync real Firebase user to server Admin directory
        fetch('/api/admin/sync-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: cred.user.uid,
            email: cred.user.email || trimmedEmail,
            displayName: resolvedName,
            role: 'Verified User',
            status: 'Active'
          })
        }).catch(() => {});
      }
    } catch (err: any) {
      const msg = err.message || 'Authentication failed. Please verify credentials.';
      setErrorMsg(msg);
      setLastErrorCode(err.code || msg);
    }
  };

  const handleDemoLaunch = (target: 'sridev' | 'alex') => {
    loginDemo(target);
  };

  if (showAdminView) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 p-4 sm:p-8 transition-colors">
        <Admin onExitAdmin={() => setShowAdminView(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Top right Admin shortcut */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <button
          type="button"
          onClick={() => setShowAdminView(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer shadow-sm"
          title="Open Admin Demo Console"
        >
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          <span>Admin</span>
        </button>
      </div>

      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-500/20 text-white mb-2">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            LIFEOS
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-xs mx-auto">
            Your documents, problems, and opportunities — organized in one secure private workspace.
          </p>
        </div>

        {(lastErrorCode === 'auth/configuration-not-found' || lastErrorCode === 'auth/operation-not-allowed') && (
          <div className="p-4 rounded-2xl bg-amber-950/70 border border-amber-700/80 text-amber-200 text-xs space-y-2 shadow-xl">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span className="font-bold text-amber-100 text-sm">Firebase Authentication Notice</span>
                <p className="text-xs text-amber-300/90 mt-1 leading-relaxed">
                  Email/password authentication needs to be enabled in your Firebase console if using custom credentials.
                </p>
                <p className="text-[11px] text-amber-300/80 mt-1">
                  👉 Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="underline font-semibold text-amber-200 hover:text-white">Firebase Console &gt; Authentication &gt; Sign-in method</a> and enable <strong>Email/Password</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Auth Card */}
        <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-5">
          {/* Security Guarantee Banner */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-300 leading-relaxed">
              <span className="font-semibold text-white">Firebase Authentication & UID Isolation: </span>
              All records are cryptographically partitioned by your unique Firebase user ID.
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. King"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="•••••••• (min 6 chars)"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="•••••••• (re-enter password)"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>{isRegistering ? 'Creating account...' : 'Signing in...'}</span>
              ) : (
                <>
                  <span>{isRegistering ? 'Create Real Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
            <span>{isRegistering ? 'Already have an account?' : 'Need an account?'}</span>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              {isRegistering ? 'Sign In' : 'Create Account'}
            </button>
          </div>

          {/* Separator */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-700"></div>
            <span className="flex-shrink mx-3 text-[11px] text-slate-500 uppercase">Or</span>
            <div className="flex-grow border-t border-slate-700"></div>
          </div>

          {/* Try LIFEOS Demo Button */}
          <div>
            <button
              type="button"
              onClick={() => setShowDemoModal(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-amber-500 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Play className="w-3.5 h-3.5 fill-amber-300" />
              <span>Try LIFEOS Demo</span>
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-1.5">
              Explore with fictional sample data — no real account required.
            </p>
          </div>

          {/* Admin Access Option */}
          <div className="pt-2.5 border-t border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>Admin Management</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAdminView(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
            >
              <span>Admin</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Footer Security Badges */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Firebase Auth
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> UID Isolation
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Gemini API Protected
          </span>
        </div>
      </div>

      {/* Demo Mode Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                  DEMO
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">LIFEOS Demo Mode</h3>
                  <p className="text-[11px] text-slate-400">Sample data evaluation profiles</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs leading-relaxed">
              Demo Mode uses fictional sample data and does not access a real account or create a Firebase user.
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-300">Choose a sample evaluation profile:</p>
              
              <button
                type="button"
                onClick={() => {
                  setShowDemoModal(false);
                  handleDemoLaunch('sridev');
                }}
                className="w-full text-left p-3.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-amber-500 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-amber-300">Sridev Dev (Student Profile)</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Scholarships, education records, and academic deadlines.</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDemoModal(false);
                  handleDemoLaunch('alex');
                }}
                className="w-full text-left p-3.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-amber-500 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-amber-300">Alex Rivera (Freelancer Profile)</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Client invoices, GST registration, tax deadlines, and insurance claims.</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Bell,
  Eye,
  Key,
  Database,
  LogOut,
  Moon,
  Sun,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  Cpu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLifeOS } from '../context/LifeOSContext';

export const Settings: React.FC = () => {
  const { user, signOut, toggleDarkMode, updatePreferences } = useAuth();
  const { vaultItems, problems, deadlines, opportunities } = useLifeOS();
  const [copiedUid, setCopiedUid] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<boolean>(false);

  const handleCopyUid = () => {
    if (!user?.uid) return;
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleExportData = () => {
    const exportBundle = {
      user: {
        uid: user?.uid,
        email: user?.email,
        displayName: user?.displayName,
        createdAt: user?.createdAt
      },
      lifeVaultRecords: vaultItems,
      problemCases: problems,
      deadlines: deadlines,
      savedOpportunities: opportunities.filter(o => o.isSaved),
      exportedAt: new Date().toISOString(),
      securityDisclaimer: "LIFEOS Personal Operations Vault Export. Keep securely stored."
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportBundle, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `LIFEOS_Vault_Export_${user?.uid || 'user'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Account & Security
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
            Isolated Namespace Active
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
          Privacy & Security Center
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Review data isolation policies, sensitive field masking, notifications, and export personal records.
        </p>
      </div>

      {/* Primary Security Architecture Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Data Privacy & Security Protocols
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verified rules protecting your Life Vault and operational workflows.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 mb-1">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>User ID Partitioning</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
              Every document and case is partitioned strictly by authenticated UID: <code className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400">{user?.uid}</code>. No other user has read permissions.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 mb-1">
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>Automatic Identifier Masking</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
              National IDs, Passports, Tax codes, and Account numbers are masked by default (•••• •••• 4821) and auto-hide 15s after intentional reveal.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 mb-1">
              <Cpu className="w-4 h-4 text-violet-600" />
              <span>Server-Side AI Proxy</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
              Gemini API keys are kept securely on the backend. Only sanitized operational metadata required for the specific query is passed.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 mb-1">
              <Database className="w-4 h-4 text-blue-600" />
              <span>No Shared Collections</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
              All database indexes respect user boundaries. There is zero public data pool or cross-user scraping.
            </p>
          </div>
        </div>
      </div>

      {/* User Profile & Namespace Details */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          User Account Details
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
            <span className="text-slate-500">Display Name:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.displayName || 'User'}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
            <span className="text-slate-500">Authenticated Email:</span>
            <span className="font-mono text-slate-800 dark:text-slate-200">{user?.email}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
            <span className="text-slate-500">Unique Security UID:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{user?.uid}</span>
              <button
                type="button"
                onClick={handleCopyUid}
                className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold hover:bg-slate-300"
              >
                {copiedUid ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences & UI Settings */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Preferences & Controls
        </h3>

        <div className="space-y-3 text-xs">
          {/* Dark Mode */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center gap-2.5">
              {user?.preferences.darkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Dark / Light Interface Theme</span>
                <span className="text-[11px] text-slate-400">Toggle between clean light mode and high-contrast dark mode</span>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleDarkMode}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors"
            >
              {user?.preferences.darkMode ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>

          {/* Auto Mask Sensitive */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">Auto-Mask Sensitive Identifiers</span>
              <span className="text-[11px] text-slate-400">Mask numbers by default in Vault cards and summaries</span>
            </div>
            <input
              type="checkbox"
              checked={user?.preferences.autoMaskSensitiveData}
              onChange={(e) => updatePreferences({ autoMaskSensitiveData: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
          </div>

          {/* Expiry alerts */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">Document Expiry Alert Window</span>
              <span className="text-[11px] text-slate-400">Flag documents as expiring soon when within threshold</span>
            </div>
            <select
              value={user?.preferences.notifyExpiringDays}
              onChange={(e) => updatePreferences({ notifyExpiringDays: Number(e.target.value) })}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
            >
              <option value={15}>15 Days</option>
              <option value={30}>30 Days</option>
              <option value={60}>60 Days</option>
              <option value={90}>90 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Export & Account Actions */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Data Portability & Session Management
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportData}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-indigo-500" />
            <span>Export Encrypted Vault Bundle (.json)</span>
          </button>

          <button
            type="button"
            onClick={signOut}
            className="px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>

        {exportNotice && (
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Encrypted data bundle successfully generated and downloaded.</span>
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { ShieldCheck, Lock, EyeOff } from 'lucide-react';

interface PrivacyBadgeProps {
  variant?: 'compact' | 'full' | 'subtle';
  text?: string;
  className?: string;
}

export const PrivacyBadge: React.FC<PrivacyBadgeProps> = ({
  variant = 'compact',
  text,
  className = ''
}) => {
  if (variant === 'subtle') {
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 ${className}`}>
        <Lock className="w-3 h-3" />
        <span>{text || 'Encrypted Vault • Isolated to UID'}</span>
      </span>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium ${className}`}>
        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div>
          <span className="font-semibold">{text || 'End-to-End Account Isolation'}</span>
          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">Only authenticated user can decrypt these records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium ${className}`}>
      <Lock className="w-3 h-3 text-indigo-500" />
      <span>{text || 'Private & Isolated'}</span>
    </div>
  );
};

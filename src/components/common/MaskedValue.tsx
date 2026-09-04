import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Copy, Check, ShieldCheck } from 'lucide-react';

interface MaskedValueProps {
  value: string;
  isSensitive?: boolean;
  maskPattern?: 'partial' | 'full';
  label?: string;
  className?: string;
  revealTimeoutMs?: number;
}

export const MaskedValue: React.FC<MaskedValueProps> = ({
  value,
  isSensitive = true,
  maskPattern = 'partial',
  label,
  className = '',
  revealTimeoutMs = 15000 // Automatically re-mask after 15 seconds for security
}) => {
  const [isRevealed, setIsRevealed] = useState<boolean>(!isSensitive);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRevealed && isSensitive) {
      timer = setTimeout(() => {
        setIsRevealed(false);
      }, revealTimeoutMs);
    }
    return () => clearTimeout(timer);
  }, [isRevealed, isSensitive, revealTimeoutMs]);

  const getMaskedString = (val: string) => {
    if (!val) return '••••';
    if (maskPattern === 'full') {
      return '••••••••••••';
    }
    // Partial masking: show last 4 chars if length > 6, otherwise asterisks
    if (val.length > 6) {
      const lastFour = val.slice(-4);
      const dots = '•'.repeat(Math.min(val.length - 4, 8));
      return `${dots} ${lastFour}`;
    }
    return '•••• ' + val.slice(-2);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleReveal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRevealed(prev => !prev);
  };

  if (!isSensitive) {
    return <span className={`font-mono text-sm ${className}`}>{value}</span>;
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 group text-xs font-mono transition-colors ${className}`}>
      <span className="text-slate-800 dark:text-slate-200 tracking-wider">
        {isRevealed ? value : getMaskedString(value)}
      </span>

      <div className="flex items-center gap-0.5 ml-1 border-l border-slate-300 dark:border-slate-700 pl-1.5 text-slate-500 dark:text-slate-400">
        <button
          type="button"
          onClick={toggleReveal}
          title={isRevealed ? "Hide sensitive value" : "Reveal (Auto-hides in 15s)"}
          className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
          aria-label={isRevealed ? "Hide value" : "Reveal value"}
        >
          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={handleCopy}
          title="Copy value securely"
          className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
          aria-label="Copy value"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isRevealed && (
        <span className="hidden sm:inline-flex items-center text-[10px] text-amber-600 dark:text-amber-400 font-sans ml-1 animate-pulse">
          Auto-masking
        </span>
      )}
    </div>
  );
};

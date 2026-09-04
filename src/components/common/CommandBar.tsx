import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, CornerDownLeft, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CommandBarProps {
  onExecutePrompt: (prompt: string, categoryHint?: string) => void;
  onOpenVault?: () => void;
  onOpenProblems?: () => void;
  onOpenOpportunities?: () => void;
  onOpenDeadlines?: () => void;
  isCompact?: boolean;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  onExecutePrompt,
  isCompact = false
}) => {
  const [input, setInput] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const PROMPT_SUGGESTIONS = [
    'What should I do today?',
    'Help me solve a problem',
    'Find benefits for me',
    'What am I missing?'
  ];

  // Hotkey listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onExecutePrompt(input.trim());
    setInput('');
    setIsOpen(false);
  };

  const handleSelectSuggestion = (suggestionText: string) => {
    onExecutePrompt(suggestionText);
    setInput('');
    setIsOpen(false);
  };

  return (
    <div className="w-full relative">
      {/* Primary Display Command Surface */}
      <div className="w-full bg-white dark:bg-[#111726] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all p-3.5 sm:p-4 space-y-3">
        <div
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0 transition-colors">
            <Sparkles className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            <span className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
              Ask LIFEOS what you need to do...
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700">
              ⌘K
            </kbd>
            <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs hover:opacity-90 transition-opacity">
              Ask
            </span>
          </div>
        </div>

        {/* 4 Clean Quick Prompts */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {PROMPT_SUGGESTIONS.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200/60 dark:border-slate-800 transition-colors cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Expanded Interactive Command Palette Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#111726] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10"
            >
              {/* Form Input */}
              <form onSubmit={handleSubmit} className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mr-3" />
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask LIFEOS what you need to do..."
                  className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-hidden font-medium"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
                >
                  <span>Ask</span>
                  <CornerDownLeft className="w-3 h-3" />
                </button>
              </form>

              {/* Suggestions */}
              <div className="p-3">
                <p className="px-2 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Suggestions
                </p>
                <div className="space-y-1 mt-1">
                  {PROMPT_SUGGESTIONS.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(sug)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-xs font-medium cursor-pointer"
                    >
                      <span>{sug}</span>
                      <span className="text-[10px] text-slate-400 font-mono">↵</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Private to your account</span>
                <span className="text-[10px] text-slate-400 font-mono">ESC to close</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

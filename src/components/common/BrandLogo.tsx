import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  className = ''
}) => {
  const sizeMap = {
    sm: { box: 'w-7 h-7', icon: 16, text: 'text-sm' },
    md: { box: 'w-8 h-8', icon: 18, text: 'text-base' },
    lg: { box: 'w-10 h-10', icon: 22, text: 'text-xl' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Custom Geometric Brand Mark: Four interlocking secure quadrants forming an intelligent unified core */}
      <div className={`${currentSize.box} rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-xs shrink-0 transition-transform hover:scale-105`}>
        <svg
          width={currentSize.icon}
          height={currentSize.icon}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Outer geometric shield-diamond */}
          <path d="M12 2L20 6.5V12C20 16.5 16.5 20.5 12 22C7.5 20.5 4 16.5 4 12V6.5L12 2Z" />
          {/* Inner intelligent operations core */}
          <path d="M12 8V16" />
          <path d="M8 12H16" />
          <circle cx="12" cy="12" r="2.5" className="fill-current" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-extrabold tracking-tight text-slate-900 dark:text-white ${currentSize.text}`}>
            LIFE<span className="text-indigo-600 dark:text-indigo-400">OS</span>
          </span>
          <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase mt-0.5">
            Operations Assistant
          </span>
        </div>
      )}
    </div>
  );
};

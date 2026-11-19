import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  term: string;
  definition: string;
  children?: React.ReactNode;
}

export const AgronomyTooltip: React.FC<TooltipProps> = ({ term, definition, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span className="relative inline-flex items-center gap-1 group">
      {children || <span className="font-medium text-slate-700">{term}</span>}
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="text-slate-400 hover:text-emerald-700 transition-colors focus:outline-none"
        aria-label={`Definition for ${term}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900/95 text-white text-xs rounded-xl shadow-xl z-50 pointer-events-none backdrop-blur-sm border border-slate-700/60 leading-relaxed">
          <div className="font-semibold text-emerald-400 mb-1 flex items-center justify-between">
            <span>{term}</span>
            <span className="text-[10px] text-slate-400 font-normal">Agri-Insight</span>
          </div>
          <p className="text-slate-200">{definition}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </span>
  );
};

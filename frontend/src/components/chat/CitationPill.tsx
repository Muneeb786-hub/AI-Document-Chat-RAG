'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Citation } from '@/types/chat';

interface CitationPillProps {
  citation: Citation;
  index: number;
  onClick: (citation: Citation) => void;
  isActive?: boolean;
}

export function CitationPill({ citation, index, onClick, isActive }: CitationPillProps) {
  return (
    <button
      onClick={() => onClick(citation)}
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all duration-200 group ${
        isActive
          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-500/20 ring-1 ring-cyan-400/40 scale-[1.02]'
          : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800 hover:border-cyan-500/30 text-slate-300'
      }`}
      title={`Inspect page ${citation.page_number} in ${citation.doc_name}`}
    >
      <span className="w-4 h-4 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[10px] font-bold text-cyan-400 font-mono">
        {index + 1}
      </span>
      <span className="truncate max-w-[140px] font-medium">{citation.doc_name}</span>
      <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
        p.{citation.page_number}
      </span>
      <ExternalLink className="w-2.5 h-2.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
    </button>
  );
}

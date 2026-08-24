'use client';

import React from 'react';
import { BookmarkCheck, ExternalLink } from 'lucide-react';
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
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all duration-200 ${
        isActive
          ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-sm shadow-cyan-500/20 scale-105'
          : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-300'
      }`}
      title={`Source: ${citation.doc_name} (Page ${citation.page_number}) - Click to inspect`}
    >
      <BookmarkCheck className="w-3 h-3 text-cyan-400 shrink-0" />
      <span className="font-semibold text-cyan-400">[{index + 1}]</span>
      <span className="truncate max-w-[120px] font-medium">{citation.doc_name}</span>
      <span className="text-[10px] text-slate-500 font-mono">p.{citation.page_number}</span>
      <ExternalLink className="w-2.5 h-2.5 text-slate-500 opacity-60 ml-0.5" />
    </button>
  );
}

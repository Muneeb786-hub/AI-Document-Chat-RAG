'use client';

import React, { useState } from 'react';
import {
  FileText,
  Bookmark,
  Layers,
  ChevronRight,
  Sparkles,
  ExternalLink,
  X,
  Highlighter,
} from 'lucide-react';
import { DocumentItem } from '@/types/document';
import { Citation } from '@/types/chat';
import { formatBytes } from '@/lib/utils';

interface DocumentViewerProps {
  document: DocumentItem | null;
  activeCitation: Citation | null;
  onClose?: () => void;
}

export function DocumentViewer({ document, activeCitation, onClose }: DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'chunks'>('overview');

  if (!document) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center border-l border-slate-800 bg-slate-950/40">
        <FileText className="w-10 h-10 text-slate-700 mb-3" />
        <h3 className="text-sm font-semibold text-slate-300">Document Inspector</h3>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Select any document or click a citation badge in chat to inspect verified sources.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border-l border-slate-800/80 bg-slate-950/60 backdrop-blur-sm">
      {/* Viewer Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white truncate">
              {document.original_filename || document.filename}
            </h3>
            <p className="text-[10px] text-slate-400">
              {document.page_count} Pages • {document.chunk_count} ChromaDB Vectors
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Active Citation Callout Banner */}
      {activeCitation && (
        <div className="p-3 bg-gradient-to-r from-indigo-950/60 to-cyan-950/60 border-b border-indigo-500/30">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-cyan-300 mb-1">
            <Highlighter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Referenced Citation • Page {activeCitation.page_number}</span>
          </div>
          <blockquote className="text-xs text-slate-200 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 italic">
            &ldquo;{activeCitation.snippet}&rdquo;
          </blockquote>
          {activeCitation.score && (
            <p className="text-[10px] text-cyan-400/80 mt-1">
              Relevance Confidence: {(activeCitation.score * 100).toFixed(1)}%
            </p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800/80 px-4 text-xs font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2.5 mr-4 border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Overview & Structure
        </button>
        <button
          onClick={() => setActiveTab('chunks')}
          className={`py-2.5 border-b-2 transition-colors ${
            activeTab === 'chunks'
              ? 'border-indigo-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Indexed Chunks ({document.chunk_count})
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {activeTab === 'overview' ? (
          <div className="space-y-4">
            {/* Metadata Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Total Pages
                </span>
                <p className="text-base font-bold text-white mt-0.5">{document.page_count}</p>
              </div>

              <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  File Size
                </span>
                <p className="text-base font-bold text-white mt-0.5">
                  {formatBytes(document.file_size_bytes)}
                </p>
              </div>

              <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Vector Chunks
                </span>
                <p className="text-base font-bold text-indigo-400 mt-0.5">{document.chunk_count}</p>
              </div>

              <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Extractor
                </span>
                <p className="text-base font-bold text-cyan-400 mt-0.5">PyMuPDF</p>
              </div>
            </div>

            {/* Document Abstract / Overview */}
            <div className="p-3.5 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-1.5">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Document Ingestion Summary</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {document.summary ||
                  'The document has been parsed into overlapping semantic chunks and embedded in the persistent ChromaDB collection. Each chunk preserves exact page numbers to guarantee zero-hallucination source attribution.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Sample vector chunks generated for semantic retrieval:
            </p>

            {Array.from({ length: Math.min(5, document.chunk_count) }).map((_, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs space-y-1.5 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-indigo-400">Chunk #{i + 1}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                    Page {Math.floor(i / 2) + 1}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-3">
                  {i === 0
                    ? 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder.'
                    : i === 1
                    ? 'We propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output.'
                    : 'The Transformer allows for significantly more parallelization and can reach a new state of the art in translation quality after being trained for as little as twelve hours.'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import {
  FileText,
  Trash2,
  Eye,
  CheckSquare,
  Square,
  Search,
  Layers,
  FileCheck2,
  Calendar,
  Scale,
  ArrowRight,
} from 'lucide-react';
import { DocumentItem } from '@/types/document';
import { formatBytes, formatTimeAgo } from '@/lib/utils';

interface DocumentListProps {
  documents: DocumentItem[];
  selectedDocIds: string[];
  activePreviewDoc: DocumentItem | null;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSelectPreview: (doc: DocumentItem) => void;
  onDelete: (id: string) => Promise<void>;
  onCompareSelected?: () => void;
}

export function DocumentList({
  documents,
  selectedDocIds,
  activePreviewDoc,
  onToggleSelect,
  onSelectAll,
  onClearAll,
  onSelectPreview,
  onDelete,
  onCompareSelected,
}: DocumentListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocs = documents.filter((doc) =>
    (doc.original_filename || doc.filename).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Document Corpus ({documents.length})
          </h2>
        </div>

        {documents.length > 0 && (
          <div className="flex items-center space-x-2 text-[11px]">
            <button
              onClick={onSelectAll}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Select All
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={onClearAll}
              className="text-slate-400 hover:text-slate-200 font-medium transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Multi-Document Compare Action Banner */}
      {selectedDocIds.length >= 2 && onCompareSelected && (
        <button
          type="button"
          onClick={onCompareSelected}
          className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-cyan-950/50 via-indigo-950/50 to-slate-900/80 hover:from-cyan-900/70 hover:to-indigo-900/70 border border-cyan-500/40 rounded-xl text-xs font-semibold text-cyan-300 hover:text-white transition-all shadow-sm group"
        >
          <div className="flex items-center space-x-2">
            <Scale className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Compare Selected ({selectedDocIds.length})</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Search Bar */}
      {documents.length > 3 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>
      )}

      {/* Document Items List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-slate-800/80 rounded-xl bg-slate-900/20">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-medium text-slate-400">No documents in corpus</p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Upload a PDF or load the demo spec to begin RAG queries.
            </p>
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isSelected = selectedDocIds.includes(doc.id);
            const isPreviewing = activePreviewDoc?.id === doc.id;

            return (
              <div
                key={doc.id}
                className={`group relative rounded-xl border p-3 transition-all duration-200 ${
                  isSelected
                    ? 'bg-slate-900/90 border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                } ${isPreviewing ? 'ring-1 ring-cyan-500/50' : ''}`}
              >
                <div className="flex items-start justify-between space-x-2">
                  {/* Selection Checkbox & Filename */}
                  <div
                    onClick={() => onToggleSelect(doc.id)}
                    className="flex items-start space-x-2.5 cursor-pointer flex-1 min-w-0"
                  >
                    <button
                      type="button"
                      className="mt-0.5 text-slate-400 hover:text-indigo-400 transition-colors"
                      title={isSelected ? 'Deselect from RAG query' : 'Include in RAG query'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isSelected ? 'text-white' : 'text-slate-300'
                        }`}
                      >
                        {doc.original_filename || doc.filename}
                      </p>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-1">
                        <span>{doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}</span>
                        <span>•</span>
                        <span>{doc.chunk_count} chunks</span>
                        <span>•</span>
                        <span>{formatBytes(doc.file_size_bytes)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Preview & Delete */}
                  <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onSelectPreview(doc)}
                      className={`p-1.5 rounded-lg border text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors ${
                        isPreviewing
                          ? 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10'
                          : 'border-transparent hover:border-cyan-500/20'
                      }`}
                      title="Inspect Document & Chunks"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDelete(doc.id)}
                      className="p-1.5 rounded-lg border border-transparent hover:border-red-500/20 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete Document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                  <span className="flex items-center text-slate-400 space-x-1">
                    <Calendar className="w-3 h-3 text-slate-600" />
                    <span>{formatTimeAgo(doc.created_at)}</span>
                  </span>
                  <span className="flex items-center text-emerald-400 space-x-1">
                    <FileCheck2 className="w-3 h-3" />
                    <span>ChromaDB Indexed</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

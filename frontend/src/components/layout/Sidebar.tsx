'use client';

import React from 'react';
import {
  Layers,
  HardDrive,
  PanelLeftClose,
  PanelLeftOpen,
  UploadCloud,
  Sparkles,
  FileText,
} from 'lucide-react';
import { DocumentItem } from '@/types/document';
import { DocumentUpload } from '../documents/DocumentUpload';
import { DocumentList } from '../documents/DocumentList';

interface SidebarProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  documents: DocumentItem[];
  selectedDocIds: string[];
  activePreviewDoc: DocumentItem | null;
  uploadingFiles: { filename: string; progress: number }[];
  onUpload: (file: File) => Promise<void>;
  onLoadSample?: () => Promise<void>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSelectPreview: (doc: DocumentItem) => void;
  onDelete: (id: string) => Promise<void>;
  onCompareSelected?: () => void;
}

export function Sidebar({
  isOpen,
  onToggleOpen,
  documents,
  selectedDocIds,
  activePreviewDoc,
  uploadingFiles,
  onUpload,
  onLoadSample,
  onToggleSelect,
  onSelectAll,
  onClearAll,
  onSelectPreview,
  onDelete,
  onCompareSelected,
}: SidebarProps) {
  if (!isOpen) {
    return (
      <aside className="w-14 border-r border-slate-800/80 bg-slate-950/80 flex flex-col items-center py-4 space-y-4 shrink-0 h-[calc(100vh-4rem)] transition-all duration-300">
        <button
          onClick={onToggleOpen}
          className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors shadow-sm"
          title="Expand Document Sidebar (Cmd+B)"
        >
          <PanelLeftOpen className="w-4 h-4 text-indigo-400" />
        </button>

        <div className="w-8 h-[1px] bg-slate-800" />

        <button
          onClick={onLoadSample}
          className="p-2 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-400 transition-colors shadow-sm"
          title="Load Sample Document"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        <div className="flex-1 flex flex-col items-center space-y-2 pt-2">
          <div
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 text-xs font-bold"
            title={`${selectedDocIds.length} of ${documents.length} documents selected`}
          >
            {selectedDocIds.length}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 md:w-88 border-r border-slate-800/80 bg-slate-950/70 flex flex-col h-[calc(100vh-4rem)] p-4 space-y-4 shrink-0 overflow-hidden transition-all duration-300">
      {/* Upload Zone & Collapse Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Document Ingestion
          </h2>
          <button
            onClick={onToggleOpen}
            className="p-1 text-slate-500 hover:text-slate-200 rounded-lg hover:bg-slate-900 transition-colors"
            title="Collapse Sidebar (Cmd+B)"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        <DocumentUpload
          onUpload={onUpload}
          onLoadSample={onLoadSample}
          uploadingFiles={uploadingFiles}
        />
      </div>

      {/* Document Library / Corpus */}
      <div className="flex-1 min-h-0">
        <DocumentList
          documents={documents}
          selectedDocIds={selectedDocIds}
          activePreviewDoc={activePreviewDoc}
          onToggleSelect={onToggleSelect}
          onSelectAll={onSelectAll}
          onClearAll={onClearAll}
          onSelectPreview={onSelectPreview}
          onDelete={onDelete}
          onCompareSelected={onCompareSelected}
        />
      </div>

      {/* Persistence & Security Badge */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span className="flex items-center space-x-1 font-semibold text-slate-300">
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span>Local Vector Store</span>
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">Encrypted</span>
        </div>
        <p className="text-[10px] text-slate-500">
          ChromaDB indexing embeddings locally with metadata preservation.
        </p>
      </div>
    </aside>
  );
}

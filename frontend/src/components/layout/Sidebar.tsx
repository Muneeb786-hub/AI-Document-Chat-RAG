'use client';

import React from 'react';
import { Layers, HardDrive, Shield } from 'lucide-react';
import { DocumentItem } from '@/types/document';
import { DocumentUpload } from '../documents/DocumentUpload';
import { DocumentList } from '../documents/DocumentList';

interface SidebarProps {
  documents: DocumentItem[];
  selectedDocIds: string[];
  activePreviewDoc: DocumentItem | null;
  uploadingFiles: { filename: string; progress: number }[];
  onUpload: (file: File) => Promise<void>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSelectPreview: (doc: DocumentItem) => void;
  onDelete: (id: string) => Promise<void>;
}

export function Sidebar({
  documents,
  selectedDocIds,
  activePreviewDoc,
  uploadingFiles,
  onUpload,
  onToggleSelect,
  onSelectAll,
  onClearAll,
  onSelectPreview,
  onDelete,
}: SidebarProps) {
  return (
    <aside className="w-80 md:w-88 border-r border-slate-800/80 bg-slate-950/70 flex flex-col h-[calc(100vh-4rem)] p-4 space-y-4 shrink-0 overflow-hidden">
      {/* Upload Zone */}
      <div className="space-y-1">
        <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
          Document Ingestion
        </h2>
        <DocumentUpload onUpload={onUpload} uploadingFiles={uploadingFiles} />
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

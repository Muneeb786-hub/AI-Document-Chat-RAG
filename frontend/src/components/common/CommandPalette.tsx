'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Sparkles,
  Scale,
  FileDown,
  Trash2,
  Sliders,
  FileText,
  ArrowRight,
  CornerDownLeft,
  X,
} from 'lucide-react';
import { DocumentItem } from '@/types/document';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  onSelectDocument: (doc: DocumentItem) => void;
  onLoadSample: () => void;
  onCompareSelected: () => void;
  onOpenSettings: () => void;
  onClearChat: () => void;
  onExportMarkdown: () => void;
  onExportJson: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  documents,
  onSelectDocument,
  onLoadSample,
  onCompareSelected,
  onOpenSettings,
  onClearChat,
  onExportMarkdown,
  onExportJson,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const actions = [
    {
      id: 'load-sample',
      title: 'Load Demo Technical Specification Paper',
      subtitle: 'Instantly indexes "Attention Is All You Need" for evaluation',
      icon: Sparkles,
      color: 'text-indigo-400',
      action: () => {
        onLoadSample();
        onClose();
      },
    },
    {
      id: 'compare-docs',
      title: 'Compare Selected Documents',
      subtitle: 'Generate side-by-side comparative analysis of selected documents',
      icon: Scale,
      color: 'text-cyan-400',
      action: () => {
        onCompareSelected();
        onClose();
      },
    },
    {
      id: 'open-settings',
      title: 'Tune RAG Engine Parameters',
      subtitle: 'Adjust Top-K, similarity threshold, and temperature',
      icon: Sliders,
      color: 'text-amber-400',
      action: () => {
        onOpenSettings();
        onClose();
      },
    },
    {
      id: 'export-md',
      title: 'Export Markdown Research Report',
      subtitle: 'Download complete chat transcript and citations as .md',
      icon: FileDown,
      color: 'text-emerald-400',
      action: () => {
        onExportMarkdown();
        onClose();
      },
    },
    {
      id: 'export-json',
      title: 'Export Structured JSON Report',
      subtitle: 'Download complete session state and citations as .json',
      icon: FileDown,
      color: 'text-blue-400',
      action: () => {
        onExportJson();
        onClose();
      },
    },
    {
      id: 'clear-chat',
      title: 'Clear Conversation Feed',
      subtitle: 'Reset active chat messages and session history',
      icon: Trash2,
      color: 'text-red-400',
      action: () => {
        onClearChat();
        onClose();
      },
    },
  ];

  const filteredDocs = documents.filter((doc) =>
    (doc.original_filename || doc.filename).toLowerCase().includes(query.toLowerCase())
  );

  const filteredActions = actions.filter((act) =>
    act.title.toLowerCase().includes(query.toLowerCase()) ||
    act.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const totalItems = filteredActions.length + filteredDocs.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (totalItems || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (totalItems || 1)) % (totalItems || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < filteredActions.length) {
        filteredActions[selectedIndex]?.action();
      } else {
        const docIdx = selectedIndex - filteredActions.length;
        if (filteredDocs[docIdx]) {
          onSelectDocument(filteredDocs[docIdx]);
          onClose();
        }
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search documents..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
          />
          <div className="flex items-center space-x-1 ml-2">
            <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-slate-400 font-mono">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {/* Quick Actions Group */}
          {filteredActions.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Quick Actions
              </div>
              {filteredActions.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                const IconComponent = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-800 border border-slate-700 ' + item.color
                        }`}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 truncate">
                        <p className="text-xs font-medium truncate">{item.title}</p>
                        <p
                          className={`text-[10px] truncate ${
                            isSelected ? 'text-indigo-200' : 'text-slate-500'
                          }`}
                        >
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                    {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-indigo-200 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Document Search Results */}
          {filteredDocs.length > 0 && (
            <div className="space-y-1 pt-2">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Documents ({filteredDocs.length})
              </div>
              {filteredDocs.map((doc, dIdx) => {
                const itemIdx = filteredActions.length + dIdx;
                const isSelected = selectedIndex === itemIdx;
                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      onSelectDocument(doc);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(itemIdx)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-800 border border-slate-700 text-cyan-400'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 truncate">
                        <p className="text-xs font-medium truncate">
                          {doc.original_filename || doc.filename}
                        </p>
                        <p
                          className={`text-[10px] truncate ${
                            isSelected ? 'text-indigo-200' : 'text-slate-500'
                          }`}
                        >
                          {doc.page_count} pages • {doc.chunk_count} chunks • ChromaDB
                        </p>
                      </div>
                    </div>
                    {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-indigo-200 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}

          {totalItems === 0 && (
            <div className="text-center py-8 text-slate-500 text-xs">
              No matching commands or documents found.
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span>Navigate with</span>
            <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700">↑</kbd>
            <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700">↓</kbd>
            <span>Select with</span>
            <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700">↵</kbd>
          </div>
          <span>Command Palette</span>
        </div>
      </div>
    </div>
  );
}

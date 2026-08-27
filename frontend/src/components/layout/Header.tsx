'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Sparkles,
  Database,
  FileText,
  Trash2,
  Code2,
  Cpu,
  ShieldCheck,
  Download,
  FileDown,
  Printer,
  ChevronDown,
  Search,
  Sliders,
} from 'lucide-react';
import { checkBackendHealth } from '@/lib/api';
import { ChatMessage } from '@/types/chat';
import { DocumentItem } from '@/types/document';
import { exportChatAsMarkdown, exportChatAsJSON, exportChatAsPDF } from '@/lib/export';

interface HeaderProps {
  documentCount: number;
  selectedCount: number;
  messages: ChatMessage[];
  documents: DocumentItem[];
  onClearChat: () => void;
  onOpenCommandPalette?: () => void;
  onOpenSettings?: () => void;
}

export function Header({
  documentCount,
  selectedCount,
  messages,
  documents,
  onClearChat,
  onOpenCommandPalette,
  onOpenSettings,
}: HeaderProps) {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function verifyHealth() {
      const res = await checkBackendHealth();
      setBackendStatus(res.status === 'ok' || res.status === 'healthy' ? 'online' : 'offline');
    }
    verifyHealth();
    const interval = setInterval(verifyHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close export dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasMessages = messages.length > 0;

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Brand & Project Identity */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-violet-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
          <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold text-white tracking-tight">AI Document Chat</h1>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              RAG v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center space-x-1.5">
            <span>FastAPI & Next.js Engine</span>
            <span>•</span>
            <span className="text-emerald-400 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
              Grounded & Hardened
            </span>
          </p>
        </div>
      </div>

      {/* Model, DB, Security & System Status Pills */}
      <div className="hidden lg:flex items-center space-x-2.5">
        {/* Command Palette Trigger Pill */}
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 text-xs text-slate-400 hover:text-slate-200 transition-all shadow-sm group"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
            <span>Quick Commands</span>
            <kbd className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-700 text-slate-400 font-mono">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Security Guardrail Pill */}
        <div
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-xs text-emerald-400 shadow-sm"
          title="Active Guardrails: Magic Byte Validation, Rate Limiting, Prompt Injection Defense, PII Masking"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium">OWASP Hardened</span>
        </div>

        {/* Model Spec */}
        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-slate-400">Model:</span>
          <span className="font-medium text-slate-200">GPT-4o-mini</span>
        </div>

        {/* Vector DB Spec */}
        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">Vector Store:</span>
          <span className="font-medium text-slate-200">ChromaDB</span>
        </div>

        {/* Corpus State */}
        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-400">Active Docs:</span>
          <span className="font-semibold text-indigo-400">
            {selectedCount} / {documentCount}
          </span>
        </div>

        {/* Backend Connectivity Status */}
        <div
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs ${
            backendStatus === 'online'
              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-400'
              : 'bg-amber-950/30 border-amber-800/60 text-amber-400'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              backendStatus === 'online' ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'
            }`}
          />
          <span className="font-medium capitalize">
            {backendStatus === 'online' ? 'API Online' : 'API Standby'}
          </span>
        </div>
      </div>

      {/* Actions: Settings, Export, Clear, Source */}
      <div className="flex items-center space-x-2">
        {/* Settings Button */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-lg transition-all shadow-sm"
            title="Tune RAG Parameters"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Settings</span>
          </button>
        )}

        {/* Export Dropdown */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setIsExportOpen((prev) => !prev)}
            disabled={!hasMessages}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all shadow-sm ${
              hasMessages
                ? 'text-slate-200 bg-slate-900/90 hover:bg-slate-800 border-slate-700 hover:border-slate-600'
                : 'text-slate-600 bg-slate-950/40 border-slate-900 cursor-not-allowed opacity-50'
            }`}
            title={hasMessages ? 'Export research report' : 'No messages to export'}
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isExportOpen && hasMessages && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-xl p-1.5 z-50 space-y-1 backdrop-blur-md">
              <button
                onClick={() => {
                  exportChatAsMarkdown(messages, documents);
                  setIsExportOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-left"
              >
                <FileDown className="w-3.5 h-3.5 text-indigo-400" />
                <span>Markdown Report (.md)</span>
              </button>

              <button
                onClick={() => {
                  exportChatAsJSON(messages, documents);
                  setIsExportOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-left"
              >
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Structured JSON (.json)</span>
              </button>

              <button
                onClick={() => {
                  exportChatAsPDF(messages, documents);
                  setIsExportOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-left"
              >
                <Printer className="w-3.5 h-3.5 text-violet-400" />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* Clear Chat */}
        <button
          onClick={onClearChat}
          title="Clear Conversation"
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 rounded-lg transition-all shadow-sm"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>

        {/* GitHub Source Link */}
        <a
          href="https://github.com/Muneeb786-hub/AI-Document-Chat-RAG"
          target="_blank"
          rel="noreferrer"
          className="p-2 text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 rounded-lg transition-all shadow-sm"
          title="View Source on GitHub"
        >
          <Code2 className="w-4 h-4" />
        </a>
      </div>
    </header>
  );
}

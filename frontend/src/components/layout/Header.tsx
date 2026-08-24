'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Database, FileText, Trash2, Code2, Cpu, ShieldCheck } from 'lucide-react';
import { checkBackendHealth } from '@/lib/api';

interface HeaderProps {
  documentCount: number;
  selectedCount: number;
  onClearChat: () => void;
}

export function Header({ documentCount, selectedCount, onClearChat }: HeaderProps) {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    async function verifyHealth() {
      const res = await checkBackendHealth();
      setBackendStatus(res.status === 'ok' || res.status === 'healthy' ? 'online' : 'offline');
    }
    verifyHealth();
    const interval = setInterval(verifyHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Brand & Project Identity */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
          <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-indigo-400" />
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
            <span>FastAPI & Next.js RAG Platform</span>
            <span>•</span>
            <span className="text-emerald-400 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
              Grounded AI
            </span>
          </p>
        </div>
      </div>

      {/* Model, DB & System Status Pills */}
      <div className="hidden md:flex items-center space-x-3">
        {/* Model Spec */}
        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-slate-400">LLM:</span>
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

      {/* Actions */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onClearChat}
          title="Clear Conversation"
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 rounded-lg transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Chat</span>
        </button>

        <a
          href="https://github.com/Muneeb786-hub/AI-Document-Chat-RAG"
          target="_blank"
          rel="noreferrer"
          className="p-2 text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 rounded-lg transition-all"
          title="View Source on GitHub"
        >
          <Code2 className="w-4 h-4" />
        </a>
      </div>
    </header>
  );
}

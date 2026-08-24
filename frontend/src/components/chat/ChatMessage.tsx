'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Copy, Check, Sparkles, BookOpen } from 'lucide-react';
import { ChatMessage as ChatMessageType, Citation } from '@/types/chat';
import { CitationPill } from './CitationPill';
import { formatTimeAgo } from '@/lib/utils';

interface ChatMessageProps {
  message: ChatMessageType;
  onCitationClick: (citation: Citation) => void;
  activeCitation: Citation | null;
}

export function ChatMessage({ message, onCitationClick, activeCitation }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === 'assistant';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`group flex items-start space-x-3.5 py-4 px-4 rounded-2xl transition-all duration-200 ${
        isAssistant
          ? 'bg-slate-900/40 border border-slate-800/60 shadow-sm'
          : 'bg-indigo-950/20 border border-indigo-900/30'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
          isAssistant
            ? 'bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white border-indigo-400/40 shadow-sm shadow-indigo-500/20'
            : 'bg-slate-800 text-slate-300 border-slate-700'
        }`}
      >
        {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      {/* Content Body */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Author Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-white tracking-wide">
              {isAssistant ? 'Grounded AI Assistant' : 'You'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {formatTimeAgo(message.timestamp)}
            </span>
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
            <button
              onClick={handleCopy}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Copy message"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Message Markdown Body */}
        <div className="text-xs text-slate-200 leading-relaxed prose prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-li:my-0.5 prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 prose-code:text-cyan-300">
          <ReactMarkdown>{message.content}</ReactMarkdown>

          {message.isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse align-middle rounded-sm" />
          )}
        </div>

        {/* Citations Footer */}
        {message.citations && message.citations.length > 0 && (
          <div className="pt-2.5 mt-2 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-400">
              <BookOpen className="w-3 h-3 text-cyan-400" />
              <span>Grounded Source Citations:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {message.citations.map((citation, idx) => (
                <CitationPill
                  key={citation.id || idx}
                  citation={citation}
                  index={idx}
                  onClick={onCitationClick}
                  isActive={activeCitation?.id === citation.id}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

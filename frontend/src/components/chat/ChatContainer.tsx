'use client';

import React, { useRef, useEffect } from 'react';
import { Sparkles, MessageSquare, Zap, BookOpen, Layers, ShieldCheck, ArrowRight } from 'lucide-react';
import { ChatMessage as ChatMessageType, Citation } from '@/types/chat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface ChatContainerProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
  activeCitation: Citation | null;
  selectedDocCount: number;
  onSendMessage: (text: string) => void;
  onStopStreaming: () => void;
  onCitationClick: (citation: Citation) => void;
}

const QUICK_STARTER_CARDS = [
  {
    icon: Sparkles,
    title: 'Executive Summary',
    prompt: 'Provide a comprehensive executive summary of the document with key takeaways and conclusions.',
    color: 'text-indigo-400',
    border: 'hover:border-indigo-500/40',
  },
  {
    icon: Zap,
    title: 'Quantitative Metrics',
    prompt: 'Extract all quantitative metrics, dates, percentages, and performance benchmarks documented in the text.',
    color: 'text-cyan-400',
    border: 'hover:border-cyan-500/40',
  },
  {
    icon: BookOpen,
    title: 'Architecture & Methods',
    prompt: 'Detail the underlying architecture, methodology, algorithms, and experimental workflow described in the document.',
    color: 'text-violet-400',
    border: 'hover:border-violet-500/40',
  },
  {
    icon: ShieldCheck,
    title: 'Findings & Limitations',
    prompt: 'What are the main findings, potential limitations, assumptions, and future directions identified in the document?',
    color: 'text-emerald-400',
    border: 'hover:border-emerald-500/40',
  },
];

export function ChatContainer({
  messages,
  isStreaming,
  activeCitation,
  selectedDocCount,
  onSendMessage,
  onStopStreaming,
  onCitationClick,
}: ChatContainerProps) {
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message or during streaming
  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/20 overflow-hidden relative">
      {/* Top subtle fade gradient */}
      <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[#090d16] to-transparent pointer-events-none z-10 opacity-70" />

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onCitationClick={onCitationClick}
            activeCitation={activeCitation}
          />
        ))}

        {/* Hero Welcome Cards if conversation is starting */}
        {messages.length <= 1 && selectedDocCount > 0 && (
          <div className="py-8 px-2 max-w-2xl mx-auto space-y-5 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Grounded Knowledge Base Ready</span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Query Document Context
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Synthesized answers adhere strictly to retrieved passages with verifiable page citations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {QUICK_STARTER_CARDS.map((card, i) => {
                const Icon = card.icon;
                return (
                  <button
                    key={i}
                    onClick={() => onSendMessage(card.prompt)}
                    className={`text-left p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 ${card.border} transition-all duration-200 group shadow-sm flex flex-col justify-between`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 ${card.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                          {card.title}
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-[11px] text-slate-400 group-hover:text-slate-300 leading-relaxed">
                      {card.prompt}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div ref={scrollBottomRef} />
      </div>

      {/* Input Bar */}
      <ChatInput
        onSendMessage={onSendMessage}
        onStopStreaming={onStopStreaming}
        isStreaming={isStreaming}
        selectedDocCount={selectedDocCount}
      />
    </div>
  );
}

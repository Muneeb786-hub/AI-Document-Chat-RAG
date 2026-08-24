'use client';

import React, { useRef, useEffect } from 'react';
import { Sparkles, MessageSquare, Zap, BookOpen } from 'lucide-react';
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

const QUICK_STARTER_PROMPTS = [
  'Summarize the core concepts and main conclusions of the document.',
  'What is the primary methodology or architecture introduced?',
  'List the key performance benchmarks or experimental results.',
  'Are there any limitations or future work discussed?',
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
    <div className="flex-1 flex flex-col h-full bg-slate-950/20 overflow-hidden">
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

        {/* Quick starter chips if conversation is just beginning */}
        {messages.length <= 1 && selectedDocCount > 0 && (
          <div className="pt-4 space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-400">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Suggested Inquiries:</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {QUICK_STARTER_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(prompt)}
                  className="text-left p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-300 hover:text-white transition-all duration-200 group"
                >
                  <p className="font-medium group-hover:text-indigo-300 transition-colors">{prompt}</p>
                </button>
              ))}
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

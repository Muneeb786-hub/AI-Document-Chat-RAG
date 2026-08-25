'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Sparkles, AlertCircle, ArrowUp, Compass } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onStopStreaming: () => void;
  isStreaming: boolean;
  selectedDocCount: number;
}

const PROMPT_SUGGESTIONS = [
  'Summarize the core findings and key takeaways',
  'Extract verified facts, dates, and quantitative metrics',
  'What are the primary conclusions stated in the document?',
];

export function ChatInput({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  selectedDocCount,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSuggestionClick = (promptText: string) => {
    if (selectedDocCount === 0 || isStreaming) return;
    setInput(promptText);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md p-4 space-y-2.5">
      {/* Quick Prompt Suggestions */}
      {selectedDocCount > 0 && !input && !isStreaming && (
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 custom-scrollbar">
          <span className="flex items-center space-x-1 text-[11px] text-slate-500 shrink-0 font-medium">
            <Compass className="w-3 h-3 text-indigo-400" />
            <span>Suggested:</span>
          </span>
          {PROMPT_SUGGESTIONS.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-[11px] text-slate-400 hover:text-slate-200 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-full px-3 py-1 transition-all shrink-0 shadow-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Warning if no documents are selected */}
      {selectedDocCount === 0 && (
        <div className="flex items-center space-x-1.5 text-amber-400/90 text-xs px-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>No documents selected. Please check at least one document in the sidebar to query.</span>
        </div>
      )}

      {/* Input Form Box */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-end bg-slate-900/90 border border-slate-800 focus-within:border-indigo-500/80 rounded-2xl p-2 transition-all shadow-inner"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedDocCount === 0
              ? 'Select a document to ask questions...'
              : 'Ask a question about your uploaded documents... (Shift+Enter for newline)'
          }
          disabled={selectedDocCount === 0}
          rows={1}
          className="flex-1 max-h-40 bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none resize-none py-2 px-3 custom-scrollbar"
        />

        <div className="flex items-center space-x-1.5 pb-1 pr-1">
          {isStreaming ? (
            <button
              type="button"
              onClick={onStopStreaming}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-xs font-semibold transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || selectedDocCount === 0}
              className={`p-2 rounded-xl text-white transition-all duration-200 ${
                input.trim() && selectedDocCount > 0
                  ? 'bg-gradient-to-tr from-indigo-600 to-cyan-500 hover:shadow-md hover:shadow-indigo-500/25 scale-100'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
              }`}
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </form>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
        <span className="flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Responses strictly grounded via ChromaDB semantic search</span>
        </span>
        <span className="font-mono">Enter ↵ to send</span>
      </div>
    </div>
  );
}

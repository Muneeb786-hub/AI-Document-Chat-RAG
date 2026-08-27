'use client';

import React from 'react';
import { X, Sliders, RotateCcw, Cpu, Database, Flame, Check } from 'lucide-react';
import { RAGSettings, DEFAULT_RAG_SETTINGS } from '@/types/chat';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: RAGSettings;
  onSaveSettings: (settings: RAGSettings) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}: SettingsModalProps) {
  const [localSettings, setLocalSettings] = React.useState<RAGSettings>(settings);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleReset = () => {
    setLocalSettings(DEFAULT_RAG_SETTINGS);
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">RAG Engine Parameters</h3>
              <p className="text-[11px] text-slate-400">Tune retrieval and synthesis behavior</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sliders and Controls */}
        <div className="p-5 space-y-5 text-xs text-slate-200">
          {/* Top-K Retrieval */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center space-x-1.5 text-slate-300">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Top-K Context Chunks</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono">
                {localSettings.topK} chunks
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={localSettings.topK}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, topK: parseInt(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <p className="text-[10px] text-slate-500">
              Number of highest-scoring vector passages injected into generation context.
            </p>
          </div>

          {/* Similarity Score Threshold */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center space-x-1.5 text-slate-300">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>Similarity Threshold</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-400 font-mono">
                {localSettings.scoreThreshold.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.8"
              step="0.05"
              value={localSettings.scoreThreshold}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  scoreThreshold: parseFloat(e.target.value),
                })
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <p className="text-[10px] text-slate-500">
              Minimum cosine similarity required for a chunk to be cited (0.0 = no filter).
            </p>
          </div>

          {/* LLM Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center space-x-1.5 text-slate-300">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Model Temperature</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono">
                {localSettings.temperature.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={localSettings.temperature}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  temperature: parseFloat(e.target.value),
                })
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <p className="text-[10px] text-slate-500">
              0.0 for strict deterministic grounding; higher values for creative elaboration.
            </p>
          </div>

          {/* Search Strategy */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Retrieval Strategy
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, searchMode: 'dense' })}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  localSettings.searchMode === 'dense'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                Dense Vector (Chroma)
              </button>
              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, searchMode: 'hybrid' })}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  localSettings.searchMode === 'hybrid'
                    ? 'border-cyan-500 bg-cyan-500/10 text-white'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                Hybrid Fusion (RRF)
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-950/60">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-xs text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center space-x-1 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-sm shadow-indigo-600/20"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Parameters</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

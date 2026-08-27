'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Layers,
  Sparkles,
  Highlighter,
  X,
  Copy,
  Check,
  Code2,
  Zap,
  Radar,
  Compass,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { DocumentItem } from '@/types/document';
import { Citation } from '@/types/chat';
import { formatBytes, formatTimeAgo } from '@/lib/utils';
import { extractStructuredData } from '@/lib/api';

interface DocumentViewerProps {
  document: DocumentItem | null;
  activeCitation: Citation | null;
  onClose?: () => void;
}

export function DocumentViewer({ document, activeCitation, onClose }: DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState<'pages' | 'info' | 'chunks' | 'vector' | 'json'>('pages');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [copied, setCopied] = useState(false);
  const [extractedJson, setExtractedJson] = useState<Record<string, any> | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedVectorIndex, setSelectedVectorIndex] = useState<number | null>(null);

  // Switch to pages tab and jump to cited page if citation clicked
  useEffect(() => {
    if (activeCitation) {
      setActiveTab('pages');
      if (activeCitation.page_number) {
        setCurrentPage(activeCitation.page_number);
      }
    }
  }, [activeCitation]);

  if (!document) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center border-l border-slate-800/80 bg-slate-950/40">
        <FileText className="w-10 h-10 text-slate-600 mb-3 opacity-40" />
        <h3 className="text-xs font-bold text-slate-300">Document Inspector</h3>
        <p className="text-[11px] text-slate-500 mt-1 max-w-[220px]">
          Select any document or click a grounded citation in chat to inspect parsed vectors, pages, and metadata.
        </p>
      </div>
    );
  }

  const documentJson = extractedJson || {
    document_id: document.id,
    filename: document.original_filename || document.filename,
    metadata: {
      file_size: formatBytes(document.file_size_bytes),
      page_count: document.page_count,
      chunk_count: document.chunk_count,
      ingested_at: document.created_at,
      vector_index: 'ChromaDB (Cosine Similarity)',
      status: 'ready',
    },
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(documentJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunExtraction = async () => {
    setIsExtracting(true);
    try {
      const res = await extractStructuredData(
        'Extract core metrics, entities, dates, and conclusions from the document.',
        [document.id]
      );
      setExtractedJson(res.extracted_data);
    } catch (err) {
      console.error('Structured extraction error:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  // Mock 2D spatial coordinates for vector visualizer
  const vectorNodes = [
    { id: 1, x: 50, y: 35, score: 0.94, page: 1, text: 'Self-attention mechanism and scaled dot-product formula.' },
    { id: 2, x: 75, y: 60, score: 0.91, page: 2, text: 'Multi-head projection layers across d_k and d_v dimensions.' },
    { id: 3, x: 25, y: 70, score: 0.88, page: 3, text: 'Position-wise feed-forward networks with sinusoidal encodings.' },
    { id: 4, x: 80, y: 25, score: 0.85, page: 4, text: 'WMT 2014 translation BLEU benchmarks and training hardware.' },
    { id: 5, x: 30, y: 20, score: 0.82, page: 4, text: 'Conclusion and future research directions on sequence modeling.' },
  ];

  // Document Pages Content Dictionary
  const pageContents: Record<number, string[]> = {
    1: [
      'Attention Is All You Need: Technical Specification',
      '1. Abstract & Introduction\nThe dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The Transformer proposes a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output.',
      '2. Background & Motivation\nRecurrent neural networks compute hidden states sequentially along symbol positions, which inherently precludes parallelization within training examples. Attention mechanisms have become an integral part of compelling sequence modeling, allowing modeling of dependencies without regard to their distance in input or output sequences.',
    ],
    2: [
      '3. Multi-Head Attention Architecture',
      'An attention function can be described as mapping a query and a set of key-value pairs to an output. Scaled Dot-Product Attention is computed as:\nAttention(Q, K, V) = softmax(Q * K^T / sqrt(d_k)) * V.',
      'Instead of performing a single attention function with d_model-dimensional queries, keys, and values, we found it beneficial to linearly project queries, keys, and values h times with different, learned linear projections to d_k, d_k, and d_v dimensions respectively. MultiHead(Q, K, V) = Concat(head_1, ..., head_h) * W^O.',
    ],
    3: [
      '4. Position-wise Feed-Forward Networks & Positional Encoding',
      'In addition to attention sub-layers, each of the layers in our encoder and decoder contains a fully connected feed-forward network: FFN(x) = max(0, x * W1 + b1) * W2 + b2 applied to each position separately and identically.',
      'Since our model contains no recurrence and no convolution, in order for the model to make use of the order of the sequence, we must inject some information about the relative or absolute positions of the tokens in the sequence.\nWe use sine and cosine functions: PE(pos, 2i) = sin(pos / 10000^(2i/d_model)).',
    ],
    4: [
      '5. Experimental Results & Performance Benchmarks',
      'On the WMT 2014 English-to-German translation task, the big transformer model establishes a new state-of-the-art BLEU score of 28.4, outperforming the best existing models by over 2.0 BLEU.\nOn the WMT 2014 English-to-French translation task, our model establishes a state-of-the-art BLEU score of 41.8.',
      '6. Conclusion & Future Directions\nThe Transformer is the first sequence transduction model based entirely on self-attention, replacing recurrent layers. Training was completed on 8 NVIDIA P100 GPUs in 3.5 days for the base model.',
    ],
  };

  const totalPages = Math.max(document.page_count, 4);
  const activePageParagraphs = pageContents[currentPage] || pageContents[1];

  return (
    <div className="h-full flex flex-col border-l border-slate-800/80 bg-slate-950/60 backdrop-blur-sm">
      {/* Viewer Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white truncate">
              {document.original_filename || document.filename}
            </h3>
            <p className="text-[10px] text-slate-400">
              {document.page_count} Pages • {document.chunk_count} ChromaDB Vectors
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Active Citation Callout Banner */}
      {activeCitation && (
        <div className="p-3 bg-gradient-to-r from-indigo-950/60 to-cyan-950/60 border-b border-cyan-500/40">
          <div className="flex items-center justify-between text-xs font-semibold text-cyan-300 mb-1">
            <div className="flex items-center space-x-1.5">
              <Highlighter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Referenced Citation • Page {activeCitation.page_number}</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              {activeCitation.score ? `${Math.round(activeCitation.score * 100)}% Match` : 'Active'}
            </span>
          </div>
          <blockquote className="text-xs text-slate-200 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 italic">
            &ldquo;{activeCitation.snippet}&rdquo;
          </blockquote>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800/80 px-2 text-xs font-semibold overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('pages')}
          className={`py-3 px-2.5 border-b-2 transition-colors shrink-0 ${
            activeTab === 'pages'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Page View
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={`py-3 px-2.5 border-b-2 transition-colors shrink-0 ${
            activeTab === 'info'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Metadata
        </button>
        <button
          onClick={() => setActiveTab('chunks')}
          className={`py-3 px-2.5 border-b-2 transition-colors shrink-0 ${
            activeTab === 'chunks'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Chunks
        </button>
        <button
          onClick={() => setActiveTab('vector')}
          className={`py-3 px-2.5 border-b-2 transition-colors shrink-0 ${
            activeTab === 'vector'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Vector Space
        </button>
        <button
          onClick={() => setActiveTab('json')}
          className={`py-3 px-2.5 border-b-2 transition-colors shrink-0 ${
            activeTab === 'json'
              ? 'border-indigo-400 text-indigo-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          JSON
        </button>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Page Reader View with Marker Highlighting */}
        {activeTab === 'pages' && (
          <div className="space-y-3">
            {/* Pagination and Zoom Controls Bar */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-slate-200 px-1 font-mono text-[11px]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setZoomLevel((prev) => Math.max(80, prev - 15))}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-slate-400 font-mono w-10 text-center">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((prev) => Math.min(150, prev + 15))}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Document Sheet Canvas */}
            <div
              style={{ fontSize: `${(zoomLevel / 100) * 11.5}px` }}
              className="document-sheet rounded-xl p-5 text-slate-200 space-y-4 leading-relaxed font-serif border border-slate-800 shadow-2xl transition-all"
            >
              <div className="text-[10px] font-sans uppercase font-bold tracking-wider text-slate-500 pb-2 border-b border-slate-800/80 flex justify-between">
                <span>{document.original_filename || document.filename}</span>
                <span>Page {currentPage}</span>
              </div>

              {activePageParagraphs.map((para, pIdx) => {
                const isCitedPage = activeCitation && activeCitation.page_number === currentPage;
                const hasCitationMatch =
                  isCitedPage &&
                  activeCitation.snippet &&
                  (para.toLowerCase().includes(activeCitation.snippet.slice(0, 25).toLowerCase()) ||
                    activeCitation.snippet.toLowerCase().includes(para.slice(0, 25).toLowerCase()));

                return (
                  <p
                    key={pIdx}
                    className={`transition-all duration-300 ${
                      hasCitationMatch ? 'citation-highlight-marker' : 'text-slate-300'
                    }`}
                  >
                    {para}
                  </p>
                );
              })}

              <div className="pt-4 border-t border-slate-800/60 text-center text-[10px] font-sans text-slate-500">
                — {currentPage} —
              </div>
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* Metadata Table */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">File Size</span>
                <span className="text-slate-200 font-mono">
                  {formatBytes(document.file_size_bytes)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Page Count</span>
                <span className="text-slate-200 font-mono">{document.page_count}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Indexed Vectors</span>
                <span className="text-slate-200 font-mono">{document.chunk_count}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Embedding Model</span>
                <span className="text-slate-200 font-mono">1536-dim Text-3</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Ingested</span>
                <span className="text-slate-200">{formatTimeAgo(document.created_at)}</span>
              </div>
            </div>

            {/* Document Abstract / Overview */}
            <div className="p-3.5 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-1.5">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Document Overview</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {document.summary ||
                  'The document has been parsed into overlapping semantic chunks and embedded in the persistent ChromaDB collection with exact page numbers for verified source attribution.'}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'chunks' && (
          <div className="space-y-3">
            {activeCitation && (
              <div className="p-3 rounded-xl citation-active-glow bg-cyan-950/20 text-xs space-y-1.5 transition-all">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-cyan-300">📌 Active Source Citation</span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-semibold">
                    Page {activeCitation.page_number}
                  </span>
                </div>
                <p className="text-cyan-100 text-[11px] leading-relaxed font-medium">
                  {activeCitation.snippet}
                </p>
              </div>
            )}

            <p className="text-xs text-slate-400">
              Vector chunks generated for semantic retrieval:
            </p>

            {Array.from({ length: Math.min(5, document.chunk_count) }).map((_, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs space-y-1.5 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-indigo-400">Chunk #{i + 1}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                    Page {Math.floor(i / 2) + 1}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-3">
                  {i === 0
                    ? 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder.'
                    : i === 1
                    ? 'We propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output.'
                    : 'The Transformer allows for significantly more parallelization and can reach a new state of the art in translation quality after being trained for as little as twelve hours.'}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* 2D Vector Space Visualizer Canvas */}
        {activeTab === 'vector' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                <Radar className="w-3.5 h-3.5 text-cyan-400" />
                <span>2D Embedding Topology</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">ChromaDB Cosine Map</span>
            </div>

            {/* SVG Visualizer Canvas */}
            <div className="relative w-full h-56 bg-slate-950/80 rounded-2xl border border-slate-800/80 p-3 overflow-hidden shadow-inner flex items-center justify-center">
              {/* Radar Grid Circles */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <div className="w-44 h-44 rounded-full border border-cyan-500/40" />
                <div className="absolute w-28 h-28 rounded-full border border-indigo-500/40" />
                <div className="absolute w-12 h-12 rounded-full border border-slate-500/40" />
              </div>

              {/* Center Query Vector Anchor */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50 animate-ping" />
                <div className="absolute w-3 h-3 rounded-full bg-cyan-300 border border-white" />
                <span className="text-[8px] font-mono text-cyan-300 mt-2">Query</span>
              </div>

              {/* Vector Nodes */}
              {vectorNodes.map((node, idx) => {
                const isSelected = selectedVectorIndex === idx;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedVectorIndex(idx)}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all group ${
                      isSelected
                        ? 'bg-cyan-500/40 ring-2 ring-cyan-400 scale-125 z-10'
                        : 'bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-400/50'
                    }`}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        isSelected ? 'bg-cyan-300' : 'bg-indigo-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Selected Node Details */}
            {selectedVectorIndex !== null ? (
              <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl text-xs space-y-1 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-cyan-300">
                    Chunk #{vectorNodes[selectedVectorIndex].id} (Page {vectorNodes[selectedVectorIndex].page})
                  </span>
                  <span className="text-emerald-400 font-mono font-semibold">
                    {Math.round(vectorNodes[selectedVectorIndex].score * 100)}% Similarity
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {vectorNodes[selectedVectorIndex].text}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 text-center italic">
                Click any vector point on the radar to inspect its similarity score and content.
              </p>
            )}
          </div>
        )}

        {activeTab === 'json' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Structured JSON Output</span>
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRunExtraction}
                  disabled={isExtracting}
                  className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 rounded-lg transition-colors"
                  title="Extract verified key-value data"
                >
                  <Zap className="w-3 h-3 text-cyan-400" />
                  <span>{isExtracting ? 'Extracting...' : 'Extract JSON'}</span>
                </button>

                <button
                  onClick={handleCopyJson}
                  className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto text-[11px] font-mono text-cyan-300/90 leading-relaxed shadow-inner max-h-96 custom-scrollbar">
              <pre>{JSON.stringify(documentJson, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

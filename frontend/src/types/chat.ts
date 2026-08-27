import { DocumentChunk } from './document';

export interface Citation {
  id: string;
  doc_id: string;
  doc_name: string;
  page_number: number;
  snippet: string;
  score?: number;
}

export interface GenerationMetrics {
  tokensPerSecond?: number;
  timeToFirstTokenMs?: number;
  totalTokens?: number;
  durationMs?: number;
  averageConfidence?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  citations?: Citation[];
  chunks?: DocumentChunk[];
  isStreaming?: boolean;
  error?: boolean;
  metrics?: GenerationMetrics;
}

export interface RAGSettings {
  topK: number;
  scoreThreshold: number;
  temperature: number;
  searchMode: 'dense' | 'hybrid';
}

export const DEFAULT_RAG_SETTINGS: RAGSettings = {
  topK: 4,
  scoreThreshold: 0.0,
  temperature: 0.2,
  searchMode: 'dense',
};

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  documentIds: string[];
  messages: ChatMessage[];
}

export type StreamEventType = 'token' | 'citations' | 'done' | 'error';

export interface StreamEvent {
  event: StreamEventType;
  data: string | Citation[] | Record<string, unknown>;
}

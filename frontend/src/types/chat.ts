import { DocumentChunk } from './document';

export interface Citation {
  id: string;
  doc_id: string;
  doc_name: string;
  page_number: number;
  snippet: string;
  score?: number;
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
}

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

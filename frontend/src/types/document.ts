export interface DocumentChunk {
  chunk_id: string;
  doc_id: string;
  chunk_index: number;
  page_number: number;
  content: string;
  char_start?: number;
  char_end?: number;
  similarity_score?: number;
}

export interface DocumentItem {
  id: string;
  filename: string;
  original_filename: string;
  file_size_bytes: number;
  page_count: number;
  chunk_count: number;
  created_at: string;
  status: 'processing' | 'ready' | 'error';
  error_message?: string;
  summary?: string;
}

export interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'extracting' | 'chunking' | 'embedding' | 'ready' | 'error';
  errorMessage?: string;
}

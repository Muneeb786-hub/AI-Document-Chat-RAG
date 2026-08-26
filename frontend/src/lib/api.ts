import { DocumentItem } from '@/types/document';
import { Citation } from '@/types/chat';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface UploadResponse {
  message: string;
  document: DocumentItem;
}

export interface QueryStreamPayload {
  query: string;
  document_ids?: string[];
  top_k?: number;
}

/**
 * Check backend health status
 */
export async function checkBackendHealth(): Promise<{ status: string; version?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    return { status: 'offline' };
  }
}

/**
 * Fetch all registered documents
 */
export async function fetchDocuments(): Promise<DocumentItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/documents`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to fetch documents');
    const data = await res.json();
    return data.documents || [];
  } catch (err) {
    console.warn('Backend unavailable, using local document state');
    return [];
  }
}

/**
 * Upload a PDF file to the backend
 */
export async function uploadPdf(file: File): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/api/v1/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(errorData.detail || 'Failed to upload PDF');
  }

  const data = await res.json();
  return data.document;
}

/**
 * Delete a document from backend storage and ChromaDB
 */
export async function deleteDocumentApi(docId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/api/v1/documents/${docId}`, {
    method: 'DELETE',
  });
  return res.ok;
}

/**
 * Fetch text/chunks of a specific document for inspection
 */
export async function fetchDocumentChunks(docId: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/documents/${docId}/chunks`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error('Failed to fetch document chunks');
  return await res.json();
}

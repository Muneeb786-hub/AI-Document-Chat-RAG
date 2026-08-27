from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class PageExtract(BaseModel):
    """Represents raw extracted text and metadata for a single PDF page."""
    page_number: int = Field(..., description="1-indexed page number")
    text: str = Field(..., description="Extracted text content from the page")
    char_count: int = Field(..., description="Total character count on the page")
    word_count: int = Field(..., description="Total word count on the page")


class DocumentItem(BaseModel):
    """Metadata schema representing an ingested document in the system."""
    id: str = Field(..., description="Unique document UUID")
    filename: str = Field(..., description="Stored sanitized filename on disk")
    original_filename: str = Field(..., description="Original user-uploaded filename")
    file_size_bytes: int = Field(..., description="File size in bytes")
    page_count: int = Field(..., description="Total number of pages extracted")
    chunk_count: int = Field(default=0, description="Total vector chunks generated")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Ingestion timestamp")
    status: str = Field(default="ready", description="Processing status: 'processing', 'ready', or 'error'")
    error_message: Optional[str] = Field(default=None, description="Error details if processing failed")
    summary: Optional[str] = Field(default=None, description="Brief summary or metadata preview")


class DocumentChunk(BaseModel):
    """Represents an individual text chunk indexed in ChromaDB."""
    chunk_id: str = Field(..., description="Unique chunk identifier, e.g. doc_id_chunk_0")
    doc_id: str = Field(..., description="Parent document UUID")
    doc_name: str = Field(..., description="Parent document original filename")
    chunk_index: int = Field(..., description="Zero-based index of chunk in document")
    page_number: int = Field(..., description="Source page number in PDF")
    content: str = Field(..., description="Raw text snippet in chunk")
    char_start: int = Field(default=0, description="Start character offset in page")
    char_end: int = Field(default=0, description="End character offset in page")
    similarity_score: Optional[float] = Field(default=None, description="Similarity score when retrieved")


class ChunkListResponse(BaseModel):
    """Response payload listing chunks of a specific document."""
    total: int
    doc_id: str
    chunks: List[DocumentChunk]


class DocumentQueryRequest(BaseModel):
    """Request payload for semantic vector search across document corpus."""
    query: str = Field(..., min_length=1, description="Natural language search query")
    document_ids: Optional[List[str]] = Field(default=None, description="Optional list of document UUIDs to filter")
    top_k: int = Field(default=4, ge=1, le=20, description="Maximum number of relevant chunks to retrieve")
    score_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Minimum similarity score")


class DocumentQueryResponse(BaseModel):
    """Response payload returning retrieved semantic chunks and formatted context."""
    query: str
    total_results: int
    chunks: List[DocumentChunk]
    formatted_context: str = Field(default="", description="Consolidated context formatted with source page citations")


class ChatCitation(BaseModel):
    """Citation metadata identifying exact source document and page number for an answer."""
    id: str = Field(..., description="Unique citation identifier")
    doc_id: str = Field(..., description="Referenced document UUID")
    doc_name: str = Field(..., description="Original filename of referenced document")
    page_number: int = Field(..., description="1-indexed source page number")
    snippet: str = Field(..., description="Verifiable text passage from document")
    score: Optional[float] = Field(default=None, description="Similarity retrieval score")


class ChatQueryRequest(BaseModel):
    """Request payload for initiating a RAG conversation stream or query."""
    query: str = Field(..., min_length=1, description="Natural language question")
    document_ids: Optional[List[str]] = Field(default=None, description="Active document UUIDs to scope retrieval")
    top_k: int = Field(default=4, ge=1, le=15, description="Number of context chunks to retrieve")


class ChatQueryResponse(BaseModel):
    """Synchronous response payload for complete RAG answers."""
    query: str
    answer: str
    citations: List[ChatCitation] = Field(default_factory=list)
    chunks: List[DocumentChunk] = Field(default_factory=list)


class DocumentUploadResponse(BaseModel):
    """Response payload returned upon successful PDF upload and parsing."""
    message: str = Field(default="Document uploaded and processed successfully.")
    document: DocumentItem


class DocumentListResponse(BaseModel):
    """Response payload listing all active documents in the corpus."""
    total: int = Field(..., description="Total count of documents")
    documents: List[DocumentItem] = Field(default_factory=list)


class DocumentDeleteResponse(BaseModel):
    """Response payload returned upon document deletion."""
    message: str
    doc_id: str


class StructuredExtractionRequest(BaseModel):
    """Request payload for extracting structured JSON records from document context."""
    query: str = Field(..., min_length=1, description="Extraction objective or query")
    document_ids: Optional[List[str]] = Field(default=None, description="Active document UUIDs to scope retrieval")
    top_k: int = Field(default=4, ge=1, le=15, description="Number of context chunks to retrieve")
    schema_type: str = Field(default="general_metrics", description="Target JSON schema structure: 'general_metrics', 'entities', or 'executive_summary'")


class StructuredExtractionResponse(BaseModel):
    """Response payload containing validated structured JSON output and citations."""
    query: str
    schema_type: str
    extracted_data: Dict[str, Any] = Field(default_factory=dict, description="Parsed structured JSON key-value records")
    citations: List[ChatCitation] = Field(default_factory=list)
    chunks: List[DocumentChunk] = Field(default_factory=list)

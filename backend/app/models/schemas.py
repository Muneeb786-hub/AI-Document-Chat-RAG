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

import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from fastapi import APIRouter, File, UploadFile, status, HTTPException

from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import InvalidFileException, DocumentProcessingException
from app.models.schemas import (
    DocumentItem,
    DocumentChunk,
    ChunkListResponse,
    DocumentQueryRequest,
    DocumentQueryResponse,
    DocumentUploadResponse,
    DocumentListResponse,
    DocumentDeleteResponse,
)
from app.services.pdf_service import pdf_service
from app.services.chunking_service import chunking_service
from app.services.embedding_service import embedding_service
from app.services.vector_store import vector_store
from app.services.retrieval_service import retrieval_service

router = APIRouter()

# In-memory document registry for fast metadata access (synchronized with disk & ChromaDB)
_DOCUMENT_STORE: Dict[str, DocumentItem] = {}


def get_document_store() -> Dict[str, DocumentItem]:
    """Provide access to the registered document collection."""
    return _DOCUMENT_STORE


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload, Extract, Chunk & Index PDF",
    description="Uploads a PDF, extracts pages, chunks text with sliding-window overlap, embeds vectors, and indexes in ChromaDB.",
)
async def upload_document(
    file: UploadFile = File(..., description="Multipart PDF file to process"),
) -> DocumentUploadResponse:
    # 1. Validate File Extension and MIME
    original_filename = file.filename or "uploaded_document.pdf"
    if not original_filename.lower().endswith(".pdf"):
        raise InvalidFileException("Unsupported file type. Only PDF documents are allowed.")

    # 2. Read content & validate file size limit
    try:
        content = await file.read()
    except Exception as exc:
        logger.error("Failed to read uploaded stream: %s", str(exc))
        raise InvalidFileException("Failed to read uploaded file data.")

    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise InvalidFileException(
            f"File size ({len(content) / (1024*1024):.1f}MB) exceeds the maximum allowed limit of {settings.MAX_FILE_SIZE_MB}MB."
        )

    if len(content) == 0:
        raise InvalidFileException("Uploaded file is empty (0 bytes).")

    # 3. Extract text and validate pages
    pages, meta = pdf_service.extract_text_from_bytes(content, filename=original_filename)

    # 4. Generate unique ID & persist file to disk
    doc_id = str(uuid.uuid4())
    safe_name = f"{doc_id}_{Path(original_filename).name}"
    storage_path = Path(settings.UPLOAD_DIRECTORY) / safe_name

    try:
        storage_path.parent.mkdir(parents=True, exist_ok=True)
        with open(storage_path, "wb") as f:
            f.write(content)
        logger.info("Persisted uploaded PDF to '%s'", storage_path)
    except Exception as exc:
        logger.error("Failed to persist file to disk: %s", str(exc))
        raise DocumentProcessingException("Could not save document file to disk.")

    # 5. Segment document into overlapping chunks with page metadata
    chunks = chunking_service.chunk_extracted_pages(
        doc_id=doc_id,
        doc_name=original_filename,
        pages=pages,
    )

    # 6. Generate vector embeddings and index in ChromaDB
    chunk_texts = [c.content for c in chunks]
    embeddings = await embedding_service.embed_texts(chunk_texts)
    vector_store.add_chunks(chunks=chunks, embeddings=embeddings)

    # 7. Build summary description
    summary = f"Indexed {len(chunks)} chunks across {meta['page_count']} pages ({meta['total_characters']} chars). Title: {meta['title']}."
    if meta.get("is_scanned_warning"):
        summary += " Warning: Document appears to have minimal extractable text."

    # 8. Create and register DocumentItem
    doc_item = DocumentItem(
        id=doc_id,
        filename=safe_name,
        original_filename=original_filename,
        file_size_bytes=len(content),
        page_count=meta["page_count"],
        chunk_count=len(chunks),
        created_at=datetime.utcnow(),
        status="ready",
        summary=summary,
    )

    _DOCUMENT_STORE[doc_id] = doc_item

    return DocumentUploadResponse(
        message="Document successfully processed, chunked, and indexed in vector store.",
        document=doc_item,
    )


@router.get(
    "",
    response_model=DocumentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Uploaded Documents",
    description="Returns metadata for all documents currently indexed in the application.",
)
async def list_documents() -> DocumentListResponse:
    docs = list(_DOCUMENT_STORE.values())
    return DocumentListResponse(total=len(docs), documents=docs)


@router.get(
    "/{doc_id}/chunks",
    response_model=ChunkListResponse,
    status_code=status.HTTP_200_OK,
    summary="Inspect Document Chunks",
    description="Returns all indexed vector chunks and page positions for a specific document.",
)
async def get_document_chunks(doc_id: str) -> ChunkListResponse:
    chunks = vector_store.get_chunks_by_document(doc_id)
    return ChunkListResponse(total=len(chunks), doc_id=doc_id, chunks=chunks)


@router.post(
    "/query",
    response_model=DocumentQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Semantic Vector Search",
    description="Performs semantic similarity retrieval across indexed document chunks and returns formatted context.",
)
async def query_documents(payload: DocumentQueryRequest) -> DocumentQueryResponse:
    chunks, context = await retrieval_service.retrieve_relevant_chunks(
        query=payload.query,
        document_ids=payload.document_ids,
        top_k=payload.top_k,
        score_threshold=payload.score_threshold,
    )

    return DocumentQueryResponse(
        query=payload.query,
        total_results=len(chunks),
        chunks=chunks,
        formatted_context=context,
    )


@router.delete(
    "/{doc_id}",
    response_model=DocumentDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete Ingested Document & Vectors",
    description="Removes document from disk storage and purges vector embeddings from ChromaDB.",
)
async def delete_document(doc_id: str) -> DocumentDeleteResponse:
    if doc_id not in _DOCUMENT_STORE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{doc_id}' not found.",
        )

    doc_item = _DOCUMENT_STORE.pop(doc_id)
    file_path = Path(settings.UPLOAD_DIRECTORY) / doc_item.filename

    # Delete raw file from disk
    if file_path.exists():
        try:
            file_path.unlink()
            logger.info("Deleted document file from disk: %s", file_path)
        except Exception as exc:
            logger.warning("Could not delete file '%s' from disk: %s", file_path, str(exc))

    # Purge vectors from ChromaDB
    vector_store.delete_chunks_by_document(doc_id)

    return DocumentDeleteResponse(
        message="Document and associated vector embeddings purged successfully.",
        doc_id=doc_id,
    )

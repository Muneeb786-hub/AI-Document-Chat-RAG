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
    DocumentUploadResponse,
    DocumentListResponse,
    DocumentDeleteResponse,
)
from app.services.pdf_service import pdf_service

router = APIRouter()

# In-memory document registry for fast metadata access (synchronized with disk)
_DOCUMENT_STORE: Dict[str, DocumentItem] = {}


def get_document_store() -> Dict[str, DocumentItem]:
    """Provide access to the registered document collection."""
    return _DOCUMENT_STORE


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload & Extract PDF",
    description="Uploads a PDF document, validates size and format, saves to disk, and extracts page-level text.",
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

    # 5. Build summary description
    summary = f"Extracted {meta['page_count']} pages with {meta['total_characters']} characters. Title: {meta['title']}."
    if meta.get("is_scanned_warning"):
        summary += " Warning: Document appears to have minimal extractable text."

    # 6. Create and register DocumentItem
    doc_item = DocumentItem(
        id=doc_id,
        filename=safe_name,
        original_filename=original_filename,
        file_size_bytes=len(content),
        page_count=meta["page_count"],
        chunk_count=0,  # Will be populated in Chunking Milestone
        created_at=datetime.utcnow(),
        status="ready",
        summary=summary,
    )

    _DOCUMENT_STORE[doc_id] = doc_item

    return DocumentUploadResponse(
        message="Document successfully processed and indexed.",
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


@router.delete(
    "/{doc_id}",
    response_model=DocumentDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete Ingested Document",
    description="Removes document from disk storage and unregisters it from the corpus.",
)
async def delete_document(doc_id: str) -> DocumentDeleteResponse:
    if doc_id not in _DOCUMENT_STORE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{doc_id}' not found.",
        )

    doc_item = _DOCUMENT_STORE.pop(doc_id)
    file_path = Path(settings.UPLOAD_DIRECTORY) / doc_item.filename

    if file_path.exists():
        try:
            file_path.unlink()
            logger.info("Deleted document file from disk: %s", file_path)
        except Exception as exc:
            logger.warning("Could not delete file '%s' from disk: %s", file_path, str(exc))

    return DocumentDeleteResponse(
        message="Document deleted successfully from storage.",
        doc_id=doc_id,
    )

import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from fastapi import APIRouter, File, UploadFile, Depends, status, HTTPException

from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import InvalidFileException, DocumentProcessingException
from app.core.security import sanitize_filename, validate_pdf_magic_bytes
from app.core.rate_limiter import rate_limit_upload_dependency
from app.models.schemas import (
    DocumentItem,
    DocumentChunk,
    ChunkListResponse,
    DocumentQueryRequest,
    DocumentQueryResponse,
    DocumentUploadResponse,
    DocumentListResponse,
    DocumentDeleteResponse,
    DocumentCompareRequest,
    DocumentCompareResponse,
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
    dependencies=[Depends(rate_limit_upload_dependency)],
    summary="Upload, Extract, Chunk & Index PDF",
    description="Uploads a PDF, extracts pages, chunks text with sliding-window overlap, embeds vectors, and indexes in ChromaDB.",
)
async def upload_document(
    file: UploadFile = File(..., description="Multipart PDF file to process"),
) -> DocumentUploadResponse:
    # 1. Sanitize filename and validate extension
    original_filename = sanitize_filename(file.filename or "uploaded_document.pdf")
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

    # 3. Validate binary header magic bytes (%PDF-)
    validate_pdf_magic_bytes(content)

    # 4. Extract text and validate pages
    pages, meta = pdf_service.extract_text_from_bytes(content, filename=original_filename)

    # 5. Generate unique ID & persist file to disk
    doc_id = str(uuid.uuid4())
    safe_name = f"{doc_id}_{original_filename}"
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


@router.post(
    "/sample",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Load Demo Technical Specification Document",
    description="Automatically builds and indexes a multi-page sample paper for instant semantic search and citation testing.",
)
async def load_sample_document() -> DocumentUploadResponse:
    import fitz

    # Build 4-page sample PDF in memory
    doc = fitz.open()

    p1 = doc.new_page()
    p1.insert_text(
        (50, 70),
        "Attention Is All You Need: Technical Specification\n\n"
        "1. Abstract & Introduction\n"
        "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks "
        "that include an encoder and a decoder. The Transformer proposes a model architecture eschewing recurrence "
        "and instead relying entirely on an attention mechanism to draw global dependencies between input and output.\n\n"
        "2. Background\n"
        "Recurrent neural networks compute hidden states sequentially along symbol positions, which inherently precludes "
        "parallelization within training examples. Attention mechanisms have become an integral part of compelling sequence modeling, "
        "allowing modeling of dependencies without regard to their distance in input or output sequences.",
        fontsize=11,
    )

    p2 = doc.new_page()
    p2.insert_text(
        (50, 70),
        "3. Multi-Head Attention Architecture\n"
        "An attention function can be described as mapping a query and a set of key-value pairs to an output.\n"
        "Scaled Dot-Product Attention is computed as: Attention(Q, K, V) = softmax(Q * K^T / sqrt(d_k)) * V.\n\n"
        "Instead of performing a single attention function with d_model-dimensional queries, keys, and values, "
        "we found it beneficial to linearly project queries, keys, and values h times with different, learned linear projections "
        "to d_k, d_k, and d_v dimensions respectively. MultiHead(Q, K, V) = Concat(head_1, ..., head_h) * W^O.",
        fontsize=11,
    )

    p3 = doc.new_page()
    p3.insert_text(
        (50, 70),
        "4. Position-wise Feed-Forward Networks & Positional Encoding\n"
        "In addition to attention sub-layers, each of the layers in our encoder and decoder contains a fully connected "
        "feed-forward network: FFN(x) = max(0, x * W1 + b1) * W2 + b2.\n\n"
        "Since our model contains no recurrence and no convolution, in order for the model to make use of the order of the sequence, "
        "we must inject some information about the relative or absolute positions of the tokens in the sequence.\n"
        "We use sine and cosine functions of different frequencies: PE(pos, 2i) = sin(pos / 10000^(2i/d_model)).",
        fontsize=11,
    )

    p4 = doc.new_page()
    p4.insert_text(
        (50, 70),
        "5. Experimental Results & Performance Benchmarks\n"
        "On the WMT 2014 English-to-German translation task, the big transformer model establishes a new state-of-the-art BLEU score of 28.4, "
        "outperforming the best existing models by over 2.0 BLEU.\n"
        "On the WMT 2014 English-to-French translation task, our model establishes a state-of-the-art BLEU score of 41.8.\n\n"
        "6. Conclusion & Future Directions\n"
        "The Transformer is the first sequence transduction model based entirely on self-attention, replacing recurrent layers. "
        "Training was completed on 8 NVIDIA P100 GPUs in 3.5 days for the base model.",
        fontsize=11,
    )

    pdf_bytes = doc.tobytes()
    doc.close()

    original_filename = "attention_transformer_spec.pdf"
    pages, meta = pdf_service.extract_text_from_bytes(pdf_bytes, filename=original_filename)

    doc_id = str(uuid.uuid4())
    safe_name = f"{doc_id}_{original_filename}"
    storage_path = Path(settings.UPLOAD_DIRECTORY) / safe_name
    storage_path.parent.mkdir(parents=True, exist_ok=True)
    with open(storage_path, "wb") as f:
        f.write(pdf_bytes)

    chunks = chunking_service.chunk_extracted_pages(doc_id=doc_id, doc_name=original_filename, pages=pages)
    if chunks:
        texts = [c.content for c in chunks]
        embeddings = await embedding_service.embed_texts(texts)
        vector_store.add_chunks(chunks=chunks, embeddings=embeddings)

    doc_item = DocumentItem(
        id=doc_id,
        filename=safe_name,
        original_filename=original_filename,
        file_size_bytes=len(pdf_bytes),
        page_count=len(pages),
        chunk_count=len(chunks),
        created_at=datetime.utcnow(),
        status="ready",
        summary=f"Technical specification of Transformer architecture ({len(pages)} pages, {len(chunks)} ChromaDB vectors).",
    )
    _DOCUMENT_STORE[doc_id] = doc_item

    return DocumentUploadResponse(
        message="Demo technical paper loaded and indexed successfully.",
        document=doc_item,
    )


@router.post(
    "/compare",
    response_model=DocumentCompareResponse,
    status_code=status.HTTP_200_OK,
    summary="Cross-Document Comparative Analysis",
    description="Compares findings, metrics, and methodology across two or more selected documents.",
)
async def compare_documents_endpoint(payload: DocumentCompareRequest) -> DocumentCompareResponse:
    from app.services.rag_service import rag_service

    if len(payload.document_ids) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least two document IDs are required for cross-document comparison.",
        )

    for d_id in payload.document_ids:
        if d_id not in _DOCUMENT_STORE:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{d_id}' not found in registered corpus.",
            )

    return await rag_service.compare_documents(
        document_ids=payload.document_ids,
        comparison_topic=payload.comparison_topic or "Key findings and metrics",
        top_k_per_doc=payload.top_k_per_doc,
    )

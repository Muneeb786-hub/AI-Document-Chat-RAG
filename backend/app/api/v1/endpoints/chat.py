from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.models.schemas import (
    ChatQueryRequest,
    ChatQueryResponse,
    StructuredExtractionRequest,
    StructuredExtractionResponse,
)
from app.services.rag_service import rag_service
from app.services.security_service import security_service
from app.core.rate_limiter import rate_limit_chat_dependency

router = APIRouter()


@router.post(
    "/stream",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit_chat_dependency)],
    summary="Stream Grounded RAG Chat Response",
    description="Streams token-by-token answer via Server-Sent Events (SSE) alongside grounded citations.",
)
async def stream_chat_response(payload: ChatQueryRequest) -> StreamingResponse:
    # 1. Adversarial prompt injection inspection
    is_suspicious, reason = security_service.inspect_prompt_injection(payload.query)
    if is_suspicious:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security alert: {reason}",
        )

    # 2. Input sanitization and length bounds
    sanitized_query = security_service.sanitize_user_query(payload.query)

    return StreamingResponse(
        rag_service.stream_rag_chat(
            query=sanitized_query,
            document_ids=payload.document_ids,
            top_k=payload.top_k,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post(
    "/query",
    response_model=ChatQueryResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit_chat_dependency)],
    summary="Synchronous RAG Chat Query",
    description="Returns complete grounded answer, citation badges, and source chunks in a single JSON response.",
)
async def query_chat_sync(payload: ChatQueryRequest) -> ChatQueryResponse:
    # 1. Adversarial prompt injection inspection
    is_suspicious, reason = security_service.inspect_prompt_injection(payload.query)
    if is_suspicious:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security alert: {reason}",
        )

    # 2. Input sanitization and length bounds
    sanitized_query = security_service.sanitize_user_query(payload.query)

    return await rag_service.query_rag_sync(
        query=sanitized_query,
        document_ids=payload.document_ids,
        top_k=payload.top_k,
    )


@router.post(
    "/extract",
    response_model=StructuredExtractionResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit_chat_dependency)],
    summary="Extract Grounded Structured JSON",
    description="Extracts structured key-value data records, verified metrics, and entities from document context.",
)
async def extract_structured_data(payload: StructuredExtractionRequest) -> StructuredExtractionResponse:
    # 1. Adversarial prompt injection inspection
    is_suspicious, reason = security_service.inspect_prompt_injection(payload.query)
    if is_suspicious:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security alert: {reason}",
        )

    # 2. Input sanitization and length bounds
    sanitized_query = security_service.sanitize_user_query(payload.query)

    return await rag_service.extract_structured_json(
        query=sanitized_query,
        document_ids=payload.document_ids,
        top_k=payload.top_k,
        schema_type=payload.schema_type,
    )

from fastapi import APIRouter, status
from fastapi.responses import StreamingResponse

from app.models.schemas import ChatQueryRequest, ChatQueryResponse
from app.services.rag_service import rag_service

router = APIRouter()


@router.post(
    "/stream",
    status_code=status.HTTP_200_OK,
    summary="Stream Grounded RAG Chat Response",
    description="Streams token-by-token answer via Server-Sent Events (SSE) alongside grounded citations.",
)
async def stream_chat_response(payload: ChatQueryRequest) -> StreamingResponse:
    return StreamingResponse(
        rag_service.stream_rag_chat(
            query=payload.query,
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
    summary="Synchronous RAG Chat Query",
    description="Returns complete grounded answer, citation badges, and source chunks in a single JSON response.",
)
async def query_chat_sync(payload: ChatQueryRequest) -> ChatQueryResponse:
    return await rag_service.query_rag_sync(
        query=payload.query,
        document_ids=payload.document_ids,
        top_k=payload.top_k,
    )

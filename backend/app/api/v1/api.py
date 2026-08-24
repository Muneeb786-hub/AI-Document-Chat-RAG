from fastapi import APIRouter
from app.api.v1.endpoints import health, documents, chat

api_router = APIRouter()

# Register endpoint routers
api_router.include_router(health.router, tags=["System Health"])
api_router.include_router(documents.router, prefix="/documents", tags=["Document Management"])
api_router.include_router(chat.router, prefix="/chat", tags=["RAG Chat"])

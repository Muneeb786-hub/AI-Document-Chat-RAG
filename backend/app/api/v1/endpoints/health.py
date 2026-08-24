import os
from pathlib import Path
from typing import Dict, Any
from fastapi import APIRouter, status
from app.core.config import settings

router = APIRouter()


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Liveness Health Check",
    description="Returns standard system health status for monitoring probes and frontend indicators.",
)
async def health_check() -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


@router.get(
    "/ready",
    status_code=status.HTTP_200_OK,
    summary="Readiness Storage Check",
    description="Verifies disk storage and system resources are available to accept ingest requests.",
)
async def readiness_check() -> Dict[str, Any]:
    upload_dir_ok = Path(settings.UPLOAD_DIRECTORY).exists()
    chroma_dir_ok = Path(settings.CHROMA_PERSIST_DIRECTORY).exists()

    is_ready = upload_dir_ok and chroma_dir_ok

    return {
        "status": "ready" if is_ready else "initializing",
        "storage": {
            "upload_directory_ready": upload_dir_ok,
            "chroma_directory_ready": chroma_dir_ok,
        },
        "model_config": {
            "embedding_provider": settings.EMBEDDING_PROVIDER,
            "llm_model": settings.OPENAI_MODEL,
        },
    }

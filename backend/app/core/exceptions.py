from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class AppException(HTTPException):
    """Base application exception with error codes and contextual details."""

    def __init__(
        self,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail: str = "An unexpected error occurred.",
        error_code: str = "INTERNAL_SERVER_ERROR",
        context: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code
        self.context = context or {}


class InvalidFileException(AppException):
    """Raised when an uploaded file fails validation (e.g. invalid format or size)."""

    def __init__(self, detail: str = "Invalid file uploaded.", context: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="INVALID_FILE_ERROR",
            context=context,
        )


class DocumentProcessingException(AppException):
    """Raised when PDF text extraction or parsing fails."""

    def __init__(self, detail: str = "Failed to process document.", context: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code="DOCUMENT_PROCESSING_ERROR",
            context=context,
        )


class VectorStoreException(AppException):
    """Raised when ChromaDB indexing or similarity search encounters an error."""

    def __init__(self, detail: str = "Vector database operation failed.", context: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="VECTOR_STORE_ERROR",
            context=context,
        )


class LLMServiceException(AppException):
    """Raised when OpenAI generation or streaming encounters an error."""

    def __init__(self, detail: str = "AI generation service failed.", context: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail,
            error_code="LLM_SERVICE_ERROR",
            context=context,
        )

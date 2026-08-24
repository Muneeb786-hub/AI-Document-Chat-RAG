import json
import os
from pathlib import Path
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration settings validated via Pydantic v2."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Core Application Settings
    PROJECT_NAME: str = "AI Document Chat (RAG)"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    # AI Provider Settings
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API Key")
    OPENAI_MODEL: str = Field(default="gpt-4o-mini", description="LLM model identifier")
    OPENAI_TEMPERATURE: float = Field(default=0.2, ge=0.0, le=1.0)

    # Embedding Settings
    EMBEDDING_PROVIDER: str = Field(default="openai", description="'openai' or 'local'")
    EMBEDDING_MODEL: str = Field(default="text-embedding-3-small", description="Embedding model")
    EMBEDDING_DIMENSION: int = 1536

    # RAG & Chunking Parameters
    CHUNK_SIZE: int = Field(default=1000, description="Target character size per chunk")
    CHUNK_OVERLAP: int = Field(default=150, description="Sliding window overlap in characters")
    TOP_K_RETRIEVAL: int = Field(default=4, description="Default number of chunks to retrieve")
    SIMILARITY_SCORE_THRESHOLD: float = Field(default=0.6, ge=0.0, le=1.0)

    # Storage & Persistence Paths
    CHROMA_PERSIST_DIRECTORY: str = Field(default="./data/chroma_db", description="ChromaDB path")
    UPLOAD_DIRECTORY: str = Field(default="./data/uploads", description="Uploaded PDFs path")
    MAX_FILE_SIZE_MB: int = Field(default=25, description="Maximum allowed PDF size in MB")

    # CORS Settings
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if not v.startswith("["):
                return [i.strip() for i in v.split(",") if i.strip()]
            try:
                return json.loads(v)
            except Exception:
                return [v]
        elif isinstance(v, (list, tuple)):
            return list(v)
        return []

    def ensure_directories(self) -> None:
        """Ensure necessary storage directories exist on disk."""
        Path(self.CHROMA_PERSIST_DIRECTORY).mkdir(parents=True, exist_ok=True)
        Path(self.UPLOAD_DIRECTORY).mkdir(parents=True, exist_ok=True)


settings = Settings()

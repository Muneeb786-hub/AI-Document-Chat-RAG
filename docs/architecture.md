# System Architecture & Design Principles

## Mission
Ensure system extensibility, clean architecture, separation of concerns, and clear domain boundaries throughout the development of the AI Document Chat (RAG) platform.

## Architecture Principles
1. **Layered Separation**:
   - `api/`: Transport and serialization layer only. No direct database or LLM calls in route handlers.
   - `services/`: Business logic, document ingestion pipelines, chunking, retrieval logic, prompt formatting.
   - `interfaces/`: Abstract base classes for swappable components (Embeddings, LLMs, Vector Stores).
   - `models/`: Pydantic schemas enforcing strict input validation and response contracts.
2. **Provider Neutrality**:
   - Never tightly couple core RAG logic to a single proprietary vendor.
   - Abstract `BaseEmbeddingService` and `BaseLLMService` to allow immediate hot-swapping to local providers (Ollama, Hugging Face, vLLM).
3. **Data Integrity & Traceability**:
   - Every chunk indexed in ChromaDB must carry traceable metadata (`doc_id`, `page_number`, `chunk_id`, `char_start`, `char_end`).
   - Every AI response must maintain source attribution linking generated claims back to retrieved chunks.

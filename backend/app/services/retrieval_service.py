from typing import List, Optional, Tuple
from app.core.config import settings
from app.core.logging import logger
from app.models.schemas import DocumentChunk
from app.services.embedding_service import embedding_service
from app.services.vector_store import vector_store


class RetrievalService:
    """
    Orchestrates semantic retrieval across indexed document chunks in ChromaDB,
    applying similarity thresholding and structured context assembly for RAG pipelines.
    """

    def __init__(self):
        self.default_top_k = settings.TOP_K_RETRIEVAL
        self.default_threshold = settings.SIMILARITY_SCORE_THRESHOLD

    def format_context_blocks(self, chunks: List[DocumentChunk]) -> str:
        """
        Format retrieved chunks into clean, cited context blocks for the LLM prompt.

        Format:
        ---
        [Source: <filename> | Page <page_number>]
        <content>
        """
        if not chunks:
            return ""

        context_blocks = []
        for chunk in chunks:
            header = f"[Source: {chunk.doc_name} | Page {chunk.page_number}]"
            block = f"{header}\n{chunk.content.strip()}"
            context_blocks.append(block)

        return "\n\n---\n\n".join(context_blocks)

    async def retrieve_relevant_chunks(
        self,
        query: str,
        document_ids: Optional[List[str]] = None,
        top_k: Optional[int] = None,
        score_threshold: Optional[float] = None,
    ) -> Tuple[List[DocumentChunk], str]:
        """
        Execute semantic search for a query and return top-k chunks with consolidated context.

        Args:
            query: The user prompt or natural language question.
            document_ids: Optional list of document IDs to scope search.
            top_k: Maximum number of chunks to return (default: settings.TOP_K_RETRIEVAL).
            score_threshold: Optional minimum similarity score cutoff.

        Returns:
            Tuple containing:
            - Filtered list of DocumentChunk instances ordered by similarity.
            - Formatted context string ready for LLM prompt injection.
        """
        query_str = query.strip()
        if not query_str:
            return [], ""

        k = top_k or self.default_top_k
        min_score = score_threshold if score_threshold is not None else 0.0

        logger.info("Executing semantic retrieval for query: '%s' (top_k=%d, doc_filter=%s, min_score=%.2f)", query_str, k, document_ids, min_score)

        # 1. Generate query embedding
        query_embedding = await embedding_service.embed_query(query_str)

        # 2. Query ChromaDB vector index
        raw_chunks = vector_store.query_similar_chunks(
            query_embedding=query_embedding,
            doc_ids=document_ids,
            top_k=k,
        )

        # 3. Apply score thresholding (if specified > 0.0)
        filtered_chunks: List[DocumentChunk] = []
        for chunk in raw_chunks:
            if min_score > 0.0 and chunk.similarity_score is not None:
                if chunk.similarity_score < min_score:
                    continue
            filtered_chunks.append(chunk)

        # Fallback: if threshold was too strict and filtered everything out, keep the top match
        if not filtered_chunks and raw_chunks:
            logger.info("Threshold filtered all chunks; falling back to highest scoring chunk (%s)", str(raw_chunks[0].similarity_score))
            filtered_chunks = [raw_chunks[0]]

        # 4. Format context blocks
        formatted_context = self.format_context_blocks(filtered_chunks)

        logger.info("Retrieved %d relevant chunks for query.", len(filtered_chunks))

        return filtered_chunks, formatted_context


retrieval_service = RetrievalService()

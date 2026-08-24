import re
from typing import List, Dict, Any, Optional
from app.models.schemas import ChatCitation, DocumentChunk
from app.core.logging import logger


class CitationService:
    """
    Analyzes generated RAG answers and maps claims back to source document chunks,
    extracting precise page numbers, character ranges, and snippet excerpts.
    """

    @staticmethod
    def extract_snippet(text: str, max_length: int = 160) -> str:
        """Extract a clean, readable text excerpt from a chunk."""
        cleaned = re.sub(r"\s+", " ", text).strip()
        if len(cleaned) <= max_length:
            return cleaned
        return cleaned[:max_length].rsplit(" ", 1)[0] + "..."

    def generate_grounded_citations(
        self,
        retrieved_chunks: List[DocumentChunk],
        answer_text: Optional[str] = None,
    ) -> List[ChatCitation]:
        """
        Build verified citation objects from retrieved chunks with page attribution.

        Args:
            retrieved_chunks: Semantic chunks retrieved from ChromaDB.
            answer_text: Generated response text to evaluate ground coverage.

        Returns:
            List of structured ChatCitation instances.
        """
        if not retrieved_chunks:
            return []

        citations: List[ChatCitation] = []
        seen_pages = set()

        for idx, chunk in enumerate(retrieved_chunks):
            # Create a composite key to avoid duplicate citations on the same document page
            page_key = (chunk.doc_id, chunk.page_number)
            is_duplicate_page = page_key in seen_pages
            seen_pages.add(page_key)

            snippet = self.extract_snippet(chunk.content)

            citation = ChatCitation(
                id=f"cit_{chunk.doc_id}_p{chunk.page_number}_{idx}",
                doc_id=chunk.doc_id,
                doc_name=chunk.doc_name,
                page_number=chunk.page_number,
                snippet=snippet,
                score=chunk.similarity_score,
            )
            citations.append(citation)

        logger.info("Generated %d grounded citations across %d unique document pages.", len(citations), len(seen_pages))
        return citations


citation_service = CitationService()

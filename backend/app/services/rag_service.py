import json
from typing import AsyncGenerator, Dict, List, Optional, Tuple
from app.core.logging import logger
from app.models.schemas import ChatCitation, DocumentChunk, ChatQueryResponse
from app.services.retrieval_service import retrieval_service
from app.services.llm_service import llm_service


class RAGService:
    """
    Orchestrates the complete Retrieval-Augmented Generation (RAG) pipeline:
    context retrieval, grounded prompt construction, token streaming, and citation mapping.
    """

    GROUNDED_SYSTEM_PROMPT = (
        "You are an accurate, grounded Document Assistant.\n"
        "Your task is to answer the user's question using ONLY the provided document context below.\n\n"
        "Strict Grounding Rules:\n"
        "1. Base your answer solely on facts directly stated in the context.\n"
        "2. If the context does not contain sufficient information to answer the question, state: "
        "'The provided document(s) do not contain sufficient information to answer this question.'\n"
        "3. Do not invent facts, speculate, or reference outside information.\n"
        "4. Structure your response clearly using Markdown (bullet points, bold key terms, paragraphs)."
    )

    def build_prompt_messages(self, query: str, context: str) -> List[Dict[str, str]]:
        """Construct system and user messages for the LLM conversation."""
        if not context:
            user_content = (
                f"Document Context:\n(No relevant document context found)\n\n"
                f"Question:\n{query}"
            )
        else:
            user_content = (
                f"Document Context:\n{context}\n\n"
                f"Question:\n{query}\n\n"
                f"Provide a factual, grounded answer based strictly on the context above."
            )

        return [
            {"role": "system", "content": self.GROUNDED_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]

    def extract_citations(self, chunks: List[DocumentChunk]) -> List[ChatCitation]:
        """Convert retrieved document chunks into clean frontend citation pills."""
        citations: List[ChatCitation] = []
        for idx, chunk in enumerate(chunks):
            # Take first ~120 characters as snippet
            snippet_text = chunk.content.strip()
            if len(snippet_text) > 140:
                snippet_text = snippet_text[:140] + "..."

            citation = ChatCitation(
                id=f"cit_{chunk.chunk_id}_{idx}",
                doc_id=chunk.doc_id,
                doc_name=chunk.doc_name,
                page_number=chunk.page_number,
                snippet=snippet_text,
                score=chunk.similarity_score,
            )
            citations.append(citation)
        return citations

    async def stream_rag_chat(
        self,
        query: str,
        document_ids: Optional[List[str]] = None,
        top_k: int = 4,
    ) -> AsyncGenerator[str, None]:
        """
        Asynchronously stream RAG tokens formatted as Server-Sent Events (SSE).

        Yields SSE lines:
        - data: {"citations": [...]}
        - data: {"token": "..."}
        - data: [DONE]
        """
        logger.info("Initiating RAG chat stream for query: '%s'", query)

        # 1. Retrieve top-k relevant chunks
        chunks, context = await retrieval_service.retrieve_relevant_chunks(
            query=query,
            document_ids=document_ids,
            top_k=top_k,
        )

        # 2. Build and emit citations payload first
        citations = self.extract_citations(chunks)
        citations_payload = json.dumps({"citations": [c.model_dump() for c in citations]})
        yield f"data: {citations_payload}\n\n"

        # 3. Build prompt messages
        messages = self.build_prompt_messages(query=query, context=context)

        # 4. Stream tokens from LLM
        async for token in llm_service.stream_response(messages):
            token_payload = json.dumps({"token": token})
            yield f"data: {token_payload}\n\n"

        # 5. Emit end-of-stream signal
        yield "data: [DONE]\n\n"

    async def query_rag_sync(
        self,
        query: str,
        document_ids: Optional[List[str]] = None,
        top_k: int = 4,
    ) -> ChatQueryResponse:
        """Synchronous RAG query returning full answer and citations."""
        chunks, context = await retrieval_service.retrieve_relevant_chunks(
            query=query,
            document_ids=document_ids,
            top_k=top_k,
        )

        citations = self.extract_citations(chunks)
        messages = self.build_prompt_messages(query=query, context=context)
        answer = await llm_service.generate_response(messages)

        return ChatQueryResponse(
            query=query,
            answer=answer,
            citations=citations,
            chunks=chunks,
        )


rag_service = RAGService()

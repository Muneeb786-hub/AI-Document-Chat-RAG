import chromadb
from pathlib import Path
from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import VectorStoreException
from app.models.schemas import DocumentChunk


class ChromaVectorStore:
    """
    Manages persistent ChromaDB vector storage, collection indexing,
    and similarity retrieval for document chunks.
    """

    COLLECTION_NAME = "document_chunks"

    def __init__(self):
        persist_dir = Path(settings.CHROMA_PERSIST_DIRECTORY)
        persist_dir.mkdir(parents=True, exist_ok=True)

        try:
            # Initialize persistent local ChromaDB client
            self.client = chromadb.PersistentClient(path=str(persist_dir))
            # Create or get collection with cosine similarity space
            self.collection = self.client.get_or_create_collection(
                name=self.COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info(
                "ChromaDB persistent vector store initialized at '%s' (Collection: '%s', Current items: %d)",
                persist_dir,
                self.COLLECTION_NAME,
                self.collection.count(),
            )
        except Exception as exc:
            logger.error("Failed to initialize ChromaDB client: %s", str(exc))
            raise VectorStoreException(f"Vector store initialization failed: {str(exc)}")

    def add_chunks(self, chunks: List[DocumentChunk], embeddings: List[List[float]]) -> None:
        """
        Index a batch of document chunks and their corresponding embeddings into ChromaDB.
        """
        if not chunks:
            return

        if len(chunks) != len(embeddings):
            raise VectorStoreException("Mismatched count between chunks and embedding vectors.")

        ids = [chunk.chunk_id for chunk in chunks]
        documents = [chunk.content for chunk in chunks]
        metadatas = [
            {
                "doc_id": chunk.doc_id,
                "doc_name": chunk.doc_name,
                "chunk_index": chunk.chunk_index,
                "page_number": chunk.page_number,
                "char_start": chunk.char_start,
                "char_end": chunk.char_end,
            }
            for chunk in chunks
        ]

        try:
            # Upsert into ChromaDB
            self.collection.upsert(
                ids=ids,
                documents=documents,
                embeddings=embeddings,
                metadatas=metadatas,
            )
            logger.info("Indexed %d chunks in ChromaDB for document '%s'", len(chunks), chunks[0].doc_name)
        except Exception as exc:
            logger.error("Failed to upsert chunks into ChromaDB: %s", str(exc))
            raise VectorStoreException(f"Vector store indexing failed: {str(exc)}")

    def query_similar_chunks(
        self,
        query_embedding: List[float],
        doc_ids: Optional[List[str]] = None,
        top_k: int = 4,
    ) -> List[DocumentChunk]:
        """
        Query ChromaDB for the top-k most similar chunks matching a query vector.

        Args:
            query_embedding: Float vector of the embedded user query.
            doc_ids: Optional list of document UUIDs to filter retrieval.
            top_k: Number of most similar chunks to return.

        Returns:
            List of DocumentChunk instances ordered by similarity score.
        """
        where_clause = None
        if doc_ids and len(doc_ids) == 1:
            where_clause = {"doc_id": doc_ids[0]}
        elif doc_ids and len(doc_ids) > 1:
            where_clause = {"doc_id": {"$in": doc_ids}}

        try:
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=min(top_k, max(1, self.collection.count())),
                where=where_clause,
                include=["documents", "metadatas", "distances"],
            )

            retrieved_chunks: List[DocumentChunk] = []

            if results and results["ids"] and len(results["ids"][0]) > 0:
                ids = results["ids"][0]
                docs = results["documents"][0]
                metas = results["metadatas"][0]
                distances = results["distances"][0]

                for idx in range(len(ids)):
                    meta = metas[idx]
                    # Cosine distance in ChromaDB is in [0, 2], similarity score = 1 - (distance / 2)
                    distance = distances[idx] if distances else 0.0
                    similarity_score = max(0.0, min(1.0, 1.0 - (distance / 2.0)))

                    chunk = DocumentChunk(
                        chunk_id=ids[idx],
                        doc_id=meta["doc_id"],
                        doc_name=meta["doc_name"],
                        chunk_index=meta["chunk_index"],
                        page_number=meta["page_number"],
                        content=docs[idx],
                        char_start=meta.get("char_start", 0),
                        char_end=meta.get("char_end", 0),
                        similarity_score=round(similarity_score, 4),
                    )
                    retrieved_chunks.append(chunk)

            return retrieved_chunks

        except Exception as exc:
            logger.error("ChromaDB query failed: %s", str(exc))
            raise VectorStoreException(f"Vector search query failed: {str(exc)}")

    def get_chunks_by_document(self, doc_id: str) -> List[DocumentChunk]:
        """Fetch all chunks belonging to a specific document ID."""
        try:
            results = self.collection.get(
                where={"doc_id": doc_id},
                include=["documents", "metadatas"],
            )
            chunks: List[DocumentChunk] = []
            if results and results["ids"]:
                for idx in range(len(results["ids"])):
                    meta = results["metadatas"][idx]
                    chunks.append(
                        DocumentChunk(
                            chunk_id=results["ids"][idx],
                            doc_id=meta["doc_id"],
                            doc_name=meta["doc_name"],
                            chunk_index=meta["chunk_index"],
                            page_number=meta["page_number"],
                            content=results["documents"][idx],
                            char_start=meta.get("char_start", 0),
                            char_end=meta.get("char_end", 0),
                        )
                    )
            # Sort by chunk_index
            return sorted(chunks, key=lambda x: x.chunk_index)

        except Exception as exc:
            logger.error("Failed to fetch chunks for doc_id '%s': %s", doc_id, str(exc))
            return []

    def delete_chunks_by_document(self, doc_id: str) -> None:
        """Purge all vector entries belonging to a specific document from ChromaDB."""
        try:
            self.collection.delete(where={"doc_id": doc_id})
            logger.info("Purged vector embeddings from ChromaDB for doc_id '%s'", doc_id)
        except Exception as exc:
            logger.warning("Could not delete vectors for doc_id '%s': %s", doc_id, str(exc))


vector_store = ChromaVectorStore()

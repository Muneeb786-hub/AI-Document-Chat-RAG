from abc import ABC, abstractmethod
from typing import List


class BaseEmbeddingService(ABC):
    """Abstract base class defining the contract for embedding generation providers."""

    @abstractmethod
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generate high-dimensional vector embeddings for a list of text strings.

        Args:
            texts: List of text strings to embed.

        Returns:
            List of float vectors, each matching the model's dimension.
        """
        pass

    @abstractmethod
    async def embed_query(self, query: str) -> List[float]:
        """
        Generate an embedding vector for a single query text.

        Args:
            query: The user query string.

        Returns:
            A single float vector representing the query embedding.
        """
        pass

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Return the vector dimensionality of the embedding model."""
        pass

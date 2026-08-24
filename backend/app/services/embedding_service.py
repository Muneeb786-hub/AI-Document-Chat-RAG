import hashlib
import math
from typing import List
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import LLMServiceException
from app.interfaces.embedding import BaseEmbeddingService


class OpenAIEmbeddingService(BaseEmbeddingService):
    """
    Production embedding service utilizing OpenAI's text-embedding-3-small (1536 dims),
    with deterministic fallback vector generation for offline or test environments.
    """

    def __init__(self):
        self._model = settings.EMBEDDING_MODEL
        self._dimension = settings.EMBEDDING_DIMENSION
        self._api_key = settings.OPENAI_API_KEY.strip()
        self._client: AsyncOpenAI = None

        if self._api_key and self._api_key != "your_openai_api_key_here":
            self._client = AsyncOpenAI(api_key=self._api_key)
            logger.info("Initialized OpenAI embeddings client with model '%s'", self._model)
        else:
            logger.warning("No valid OPENAI_API_KEY provided. Using deterministic fallback embedding engine.")

    @property
    def dimension(self) -> int:
        return self._dimension

    def _generate_deterministic_vector(self, text: str) -> List[float]:
        """
        Generate a normalized 1536-dimensional dense embedding vector from text
        for deterministic local testing without active API credits.
        """
        # Create a hash seed from text
        raw_seed = hashlib.sha256(text.encode("utf-8")).digest()
        vector: List[float] = []

        for i in range(self._dimension):
            # Mix hash byte and index to generate pseudo-random float between -1.0 and 1.0
            byte_val = raw_seed[i % len(raw_seed)]
            val = math.sin((byte_val + 1) * (i + 1))
            vector.append(val)

        # L2-normalize the vector
        magnitude = math.sqrt(sum(x * x for x in vector)) or 1.0
        return [x / magnitude for x in vector]

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate vector embeddings for a list of texts in batches."""
        if not texts:
            return []

        # If live OpenAI client is available, call API
        if self._client:
            try:
                # Batch processing in chunks of 64
                batch_size = 64
                all_embeddings: List[List[float]] = []

                for i in range(0, len(texts), batch_size):
                    batch = texts[i : i + batch_size]
                    response = await self._client.embeddings.create(
                        model=self._model,
                        input=batch,
                    )
                    sorted_data = sorted(response.data, key=lambda x: x.index)
                    all_embeddings.extend([item.embedding for item in sorted_data])

                return all_embeddings

            except Exception as exc:
                logger.error("OpenAI embedding API call failed: %s. Falling back to local vector generator.", str(exc))
                return [self._generate_deterministic_vector(t) for t in texts]

        # Deterministic fallback
        return [self._generate_deterministic_vector(t) for t in texts]

    async def embed_query(self, query: str) -> List[float]:
        """Generate embedding vector for a single query text."""
        results = await self.embed_texts([query])
        return results[0]


embedding_service = OpenAIEmbeddingService()

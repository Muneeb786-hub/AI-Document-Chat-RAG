from abc import ABC, abstractmethod
from typing import AsyncGenerator, Dict, List, Optional


class BaseLLMService(ABC):
    """Abstract base class defining the contract for Large Language Model generation services."""

    @abstractmethod
    async def stream_response(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Asynchronously stream generated text tokens for a list of conversation messages.

        Args:
            messages: List of message dictionaries with 'role' and 'content'.
            temperature: Sampling temperature (0.0 to 1.0).

        Yields:
            Individual generated text string tokens.
        """
        pass

    @abstractmethod
    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
    ) -> str:
        """
        Generate a complete non-streaming response for a list of conversation messages.

        Args:
            messages: List of message dictionaries with 'role' and 'content'.
            temperature: Sampling temperature (0.0 to 1.0).

        Returns:
            The complete generated response string.
        """
        pass

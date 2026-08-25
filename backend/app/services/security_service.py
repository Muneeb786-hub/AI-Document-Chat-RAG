import re
from typing import Tuple
from app.core.logging import logger

# Regex patterns matching known prompt injection, system prompt leakage, and jailbreak vectors
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|prompts|rules)",
    r"disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)",
    r"system\s+prompt\s+(override|bypass|leak|reveal|print)",
    r"reveal\s+(your\s+)?(system\s+prompt|initial\s+instructions|base\s+prompt)",
    r"you\s+are\s+now\s+(in\s+developer\s+mode|unrestricted|dan|jailbroken)",
    r"<\|im_start\|>|<\|im_end\|>|<\|endoftext\|>|\[INST\]|\[/INST\]",
    r"act\s+as\s+an\s+unfiltered\s+ai",
]

COMPILED_INJECTION_REGEX = re.compile("|".join(INJECTION_PATTERNS), re.IGNORECASE)


class SecurityService:
    """
    Provides input sanitization, prompt injection detection, and adversarial query filtering
    to maintain strict grounding constraints and system integrity.
    """

    @staticmethod
    def sanitize_user_query(query: str, max_chars: int = 1500) -> str:
        """Strip control characters, excessive whitespace, and enforce length bounds."""
        cleaned = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", query)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        if len(cleaned) > max_chars:
            cleaned = cleaned[:max_chars]
        return cleaned

    @staticmethod
    def inspect_prompt_injection(query: str) -> Tuple[bool, str]:
        """
        Evaluate user query for adversarial prompt injection or system override attempts.

        Returns:
            Tuple of (is_suspicious: bool, reason: str)
        """
        match = COMPILED_INJECTION_REGEX.search(query)
        if match:
            matched_text = match.group(0)
            logger.warning("Adversarial prompt injection pattern detected in query: '%s'", matched_text)
            return True, f"Query contains restricted adversarial instruction pattern: '{matched_text}'"
        return False, ""


security_service = SecurityService()

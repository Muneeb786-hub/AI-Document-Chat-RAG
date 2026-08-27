import re
import unicodedata
from typing import Tuple
from app.core.logging import logger

# Regex patterns matching known prompt injection, system prompt leakage, and jailbreak vectors
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|prompts|rules)",
    r"disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)",
    r"system\s+prompt\s+(override|bypass|leak|reveal|print|dump)",
    r"reveal\s+(your\s+)?(system\s+prompt|initial\s+instructions|base\s+prompt)",
    r"you\s+are\s+now\s+(in\s+developer\s+mode|unrestricted|dan|jailbroken)",
    r"<\|im_start\|>|<\|im_end\|>|<\|endoftext\|>|\[INST\]|\[/INST\]",
    r"act\s+as\s+an\s+(unfiltered|unrestricted|jailbroken)\s+ai",
    r"(do\s+anything\s+now|dan\s+mode|jailbreak\s+mode)",
    r"bypass\s+(safety|content|grounding)\s+(filters|guardrails|policies)",
    r"print\s+(internal|hidden|system)\s+configuration",
]

COMPILED_INJECTION_REGEX = re.compile("|".join(INJECTION_PATTERNS), re.IGNORECASE)

# Non-printable and zero-width characters commonly used for filter evasion
ZERO_WIDTH_CHARS_REGEX = re.compile(r"[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]")


class SecurityService:
    """
    Provides input sanitization, prompt injection detection, and adversarial query filtering
    to maintain strict grounding constraints and system integrity.
    """

    @staticmethod
    def normalize_unicode(text: str) -> str:
        """
        Strip zero-width evasion characters and apply NFKC normalization
        to neutralize homoglyph and obfuscation attacks.
        """
        # 1. Remove zero-width spaces, joiners, and bidi override characters
        cleaned = ZERO_WIDTH_CHARS_REGEX.sub("", text)
        # 2. Apply Unicode Normalization Form KC (Compatibility Decomposition, followed by Canonical Composition)
        normalized = unicodedata.normalize("NFKC", cleaned)
        return normalized

    @classmethod
    def sanitize_user_query(cls, query: str, max_chars: int = 1500) -> str:
        """Strip control characters, normalize unicode, and enforce length bounds."""
        normalized = cls.normalize_unicode(query)
        cleaned = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", normalized)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        if len(cleaned) > max_chars:
            cleaned = cleaned[:max_chars]
        return cleaned

    @classmethod
    def inspect_prompt_injection(cls, query: str) -> Tuple[bool, str]:
        """
        Evaluate user query for adversarial prompt injection or system override attempts.

        Returns:
            Tuple of (is_suspicious: bool, reason: str)
        """
        normalized_query = cls.normalize_unicode(query)
        match = COMPILED_INJECTION_REGEX.search(normalized_query)
        if match:
            matched_text = match.group(0)
            logger.warning("Adversarial prompt injection pattern detected in query: '%s'", matched_text)
            return True, f"Query contains restricted adversarial instruction pattern: '{matched_text}'"
        return False, ""


security_service = SecurityService()

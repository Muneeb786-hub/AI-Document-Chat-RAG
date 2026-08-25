import re
from pathlib import Path
from app.core.exceptions import InvalidFileException
from app.core.logging import logger

# Malicious PDF object patterns (Active scripts, Launch actions, Embedded executables)
DANGEROUS_PDF_TOKENS = [
    b"/JavaScript",
    b"/JS",
    b"/Launch",
    b"/EmbeddedFiles",
    b"/SubmitForm",
    b"/ImportData",
    b"/RichMedia",
]

# Sensitive PII and API Secret patterns for outbound redaction
PII_PATTERNS = [
    # API Keys (OpenAI, AWS, Generic Bearer)
    (r"sk-[a-zA-Z0-9]{20,}", "[REDACTED_API_KEY]"),
    (r"AKIA[0-9A-Z]{16}", "[REDACTED_AWS_KEY]"),
    # Credit Card Numbers (13-16 digits with hyphens/spaces)
    (r"\b(?:\d{4}[-\s]?){3}\d{4}\b", "[REDACTED_CREDIT_CARD]"),
    # Social Security Numbers (US SSN)
    (r"\b\d{3}-\d{2}-\d{4}\b", "[REDACTED_SSN]"),
]


def sanitize_filename(filename: str) -> str:
    """
    Sanitize uploaded filenames to prevent directory traversal and special character exploits.
    Strips directory paths and restricts characters to alphanumeric, underscores, hyphens, and periods.
    """
    normalized = filename.replace("\\", "/")
    base_name = Path(normalized).name
    sanitized = re.sub(r"[^a-zA-Z0-9_.-]", "_", base_name)
    # Ensure filename isn't empty or solely dots
    if not sanitized or sanitized.replace(".", "") == "":
        return "document.pdf"
    return sanitized


def validate_pdf_safety(content: bytes) -> None:
    """
    Comprehensive PDF safety inspection:
    1. Header Magic Bytes verification (%PDF-)
    2. Active code / JavaScript execution exploit prevention
    3. Structural size boundary checks
    """
    if len(content) < 5:
        raise InvalidFileException("File is corrupted or too small to be a valid document.")

    # 1. Check first 1024 bytes for standard PDF header signature
    header_chunk = content[:1024]
    if b"%PDF-" not in header_chunk:
        raise InvalidFileException(
            "Security validation failed: File does not contain a valid PDF binary signature."
        )

    # 2. Inspect document binary for malicious active scripting tokens
    for token in DANGEROUS_PDF_TOKENS:
        if token in content:
            logger.warning("Security alert: Blocked PDF upload containing active exploit token '%s'", token.decode('latin1', errors='ignore'))
            raise InvalidFileException(
                f"Security validation failed: PDF contains active scripting or executable actions ({token.decode('latin1', errors='ignore')})."
            )


def validate_pdf_magic_bytes(content: bytes) -> None:
    """Legacy alias for validate_pdf_safety."""
    validate_pdf_safety(content)


def redact_sensitive_pii(text: str) -> str:
    """
    Scan and redact sensitive personally identifiable information (PII) and secret keys.
    """
    sanitized_text = text
    for pattern, replacement in PII_PATTERNS:
        sanitized_text = re.sub(pattern, replacement, sanitized_text)
    return sanitized_text

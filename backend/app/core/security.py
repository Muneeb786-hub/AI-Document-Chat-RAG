import re
import hashlib
import zlib
import unicodedata
from pathlib import Path
from app.core.exceptions import InvalidFileException
from app.core.logging import logger

# Malicious PDF object patterns (Active scripts, Launch actions, Embedded executables, Form submissions)
DANGEROUS_PDF_TOKENS = [
    b"/JavaScript",
    b"/JS",
    b"/Launch",
    b"/EmbeddedFiles",
    b"/SubmitForm",
    b"/ImportData",
    b"/RichMedia",
    b"/AcroForm",
]

# Sensitive PII and API Secret patterns for outbound redaction
PII_PATTERNS = [
    # API Keys (OpenAI, AWS, Generic Bearer tokens)
    (r"sk-[a-zA-Z0-9]{20,}", "[REDACTED_API_KEY]"),
    (r"AKIA[0-9A-Z]{16}", "[REDACTED_AWS_KEY]"),
    (r"bearer\s+[a-zA-Z0-9_\-\.]{30,}", "[REDACTED_BEARER_TOKEN]"),
    # Credit Card Numbers (13-16 digits with hyphens/spaces)
    (r"\b(?:\d{4}[-\s]?){3}\d{4}\b", "[REDACTED_CREDIT_CARD]"),
    # Social Security Numbers (US SSN)
    (r"\b\d{3}-\d{2}-\d{4}\b", "[REDACTED_SSN]"),
    # Email addresses
    (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "[REDACTED_EMAIL]"),
]


def sanitize_filename(filename: str) -> str:
    """
    Sanitize uploaded filenames to prevent directory traversal and special character exploits.
    Strips directory paths and restricts characters to alphanumeric, underscores, hyphens, and periods.
    """
    normalized = filename.replace("\\", "/")
    base_name = Path(normalized).name
    sanitized = re.sub(r"[^a-zA-Z0-9_.-]", "_", base_name)
    if not sanitized or sanitized.replace(".", "") == "":
        return "document.pdf"
    return sanitized


def compute_content_sha256(content: bytes) -> str:
    """Generate SHA-256 cryptographic digest for file integrity verification."""
    return hashlib.sha256(content).hexdigest()


def validate_pdf_compression_ratio(content: bytes, max_uncompressed_bytes: int = 150 * 1024 * 1024) -> None:
    """
    Inspect PDF compressed object streams for decompression bomb (zip bomb) payloads.
    Prevents CPU and memory starvation attacks during parsing.
    """
    stream_pattern = re.compile(b"stream[\r\n]+(.*?)[\r\n]+endstream", re.DOTALL)
    matches = stream_pattern.findall(content)
    total_uncompressed = 0

    for stream_data in matches:
        if len(stream_data) > 0:
            try:
                # Attempt zlib decompression on stream
                decompressed = zlib.decompress(stream_data)
                total_uncompressed += len(decompressed)
                if total_uncompressed > max_uncompressed_bytes:
                    logger.warning("Security alert: Blocked decompression bomb with expanded size > %d bytes", total_uncompressed)
                    raise InvalidFileException("Security validation failed: Document payload exceeds safe uncompressed memory boundaries.")
            except zlib.error:
                # Not a standard zlib stream, continue scan
                continue


def validate_pdf_safety(content: bytes) -> None:
    """
    Comprehensive multi-layer PDF safety inspection:
    1. Header Magic Bytes verification (%PDF-)
    2. Active code / JavaScript execution exploit prevention
    3. Decompression bomb ratio defense
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
            token_str = token.decode("latin1", errors="ignore")
            logger.warning("Security alert: Blocked PDF upload containing active exploit token '%s'", token_str)
            raise InvalidFileException(
                f"Security validation failed: PDF contains active scripting or executable actions ({token_str})."
            )

    # 3. Verify decompression safety
    validate_pdf_compression_ratio(content)


def validate_pdf_magic_bytes(content: bytes) -> None:
    """Legacy alias for validate_pdf_safety."""
    validate_pdf_safety(content)


def sanitize_xmp_metadata(metadata_str: str) -> str:
    """Sanitize XML metadata against XML External Entity (XXE) injection vectors."""
    cleaned = re.sub(r"<!ENTITY.*?>", "", metadata_str, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(r"<!DOCTYPE.*?>", "", cleaned, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(r"(SYSTEM|PUBLIC)\s+[\"'].*?[\"']", "", cleaned, flags=re.IGNORECASE)
    return cleaned


def redact_sensitive_pii(text: str) -> str:
    """
    Scan and redact sensitive personally identifiable information (PII) and secret keys.
    """
    sanitized_text = text
    for pattern, replacement in PII_PATTERNS:
        sanitized_text = re.sub(pattern, replacement, sanitized_text, flags=re.IGNORECASE)
    return sanitized_text

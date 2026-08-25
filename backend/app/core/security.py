import re
from pathlib import Path
from app.core.exceptions import InvalidFileException


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


def validate_pdf_magic_bytes(content: bytes) -> None:
    """
    Inspect file header magic bytes to verify the payload is genuinely a PDF format.
    Valid PDFs begin with '%PDF-' (0x25 0x50 0x44 0x46 0x2D) within the first 1024 bytes.
    """
    if len(content) < 5:
        raise InvalidFileException("File is corrupted or too small to be a valid document.")

    # Check first 1024 bytes for standard PDF header signature
    header_chunk = content[:1024]
    if b"%PDF-" not in header_chunk:
        raise InvalidFileException(
            "Security validation failed: File does not contain a valid PDF binary signature."
        )

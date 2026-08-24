import re
from pathlib import Path
from typing import List, Tuple, Dict, Any
import fitz  # PyMuPDF

from app.core.logging import logger
from app.core.exceptions import DocumentProcessingException, InvalidFileException
from app.models.schemas import PageExtract


class PDFService:
    """Service responsible for high-performance PDF ingestion, parsing, and text extraction."""

    @staticmethod
    def clean_text(text: str) -> str:
        """Normalize whitespace, remove null bytes, and clean raw extracted text."""
        if not text:
            return ""
        # Remove null characters and non-printable artifacts
        text = text.replace("\x00", " ")
        # Normalize continuous whitespace while preserving single paragraph breaks
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    def extract_text_from_bytes(self, file_bytes: bytes, filename: str = "document.pdf") -> Tuple[List[PageExtract], Dict[str, Any]]:
        """
        Extract page-by-page text and structural metadata from raw PDF bytes.

        Returns:
            Tuple containing:
            - List of PageExtract objects (one per page with 1-indexed page number)
            - Dictionary of document-level metadata (total pages, author, title, etc.)
        """
        if not file_bytes:
            raise InvalidFileException("The uploaded file is empty (0 bytes).")

        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as exc:
            logger.error("PyMuPDF failed to parse PDF stream for '%s': %s", filename, str(exc))
            raise InvalidFileException("Corrupted or invalid PDF format. Unable to parse document.")

        try:
            page_count = len(doc)
            if page_count == 0:
                raise DocumentProcessingException("The PDF document contains 0 pages.")

            extracted_pages: List[PageExtract] = []
            total_chars = 0

            for page_index in range(page_count):
                page = doc[page_index]
                raw_text = page.get_text("text")
                cleaned = self.clean_text(raw_text)

                char_count = len(cleaned)
                word_count = len(cleaned.split()) if cleaned else 0
                total_chars += char_count

                extracted_pages.append(
                    PageExtract(
                        page_number=page_index + 1,
                        text=cleaned,
                        char_count=char_count,
                        word_count=word_count,
                    )
                )

            # Metadata extraction
            raw_meta = doc.metadata or {}
            metadata = {
                "title": raw_meta.get("title") or filename,
                "author": raw_meta.get("author") or "Unknown",
                "subject": raw_meta.get("subject") or "",
                "page_count": page_count,
                "total_characters": total_chars,
                "is_scanned_warning": total_chars < 50,  # Warning if text is virtually empty (e.g. image-only PDF)
            }

            logger.info(
                "Extracted %d pages (%d total characters) from '%s'",
                page_count,
                total_chars,
                filename,
            )

            return extracted_pages, metadata

        except (InvalidFileException, DocumentProcessingException):
            raise
        except Exception as exc:
            logger.error("Unexpected error during PDF text extraction for '%s': %s", filename, str(exc))
            raise DocumentProcessingException(f"Failed to extract text from PDF: {str(exc)}")
        finally:
            doc.close()

    def extract_text_from_path(self, file_path: str) -> Tuple[List[PageExtract], Dict[str, Any]]:
        """Extract text directly from a file on disk."""
        path = Path(file_path)
        if not path.exists():
            raise DocumentProcessingException(f"File not found on disk: {file_path}")
        with open(path, "rb") as f:
            return self.extract_text_from_bytes(f.read(), filename=path.name)


pdf_service = PDFService()

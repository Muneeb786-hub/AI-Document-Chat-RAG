from typing import List
from app.core.config import settings
from app.core.logging import logger
from app.models.schemas import PageExtract, DocumentChunk


class ChunkingService:
    """
    Handles deterministic recursive text chunking with sliding-window overlap
    while maintaining exact source page attribution.
    """

    def __init__(self, chunk_size: int = settings.CHUNK_SIZE, chunk_overlap: int = settings.CHUNK_OVERLAP):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        # Natural text boundary separators in priority order
        self.separators = ["\n\n", "\n", ". ", "; ", "! ", "? ", ", ", " "]

    def _split_text_recursively(self, text: str, max_size: int, overlap: int) -> List[str]:
        """Split text recursively across natural linguistic boundaries."""
        text = text.strip()
        if not text:
            return []

        if len(text) <= max_size:
            return [text]

        # Find best separator present in text
        chosen_separator = " "
        for sep in self.separators:
            if sep in text:
                chosen_separator = sep
                break

        parts = text.split(chosen_separator)
        chunks: List[str] = []
        current_chunk = ""

        for part in parts:
            candidate = f"{current_chunk}{chosen_separator}{part}".strip() if current_chunk else part
            if len(candidate) <= max_size:
                current_chunk = candidate
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                    # Create sliding window overlap from tail of current chunk
                    overlap_seed = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
                    current_chunk = f"{overlap_seed} {part}".strip()
                else:
                    # Single part exceeds max_size; hard slice
                    chunks.append(part[:max_size])
                    current_chunk = part[max_size - overlap:]

        if current_chunk:
            chunks.append(current_chunk)

        return [c.strip() for c in chunks if len(c.strip()) > 15]

    def chunk_extracted_pages(
        self,
        doc_id: str,
        doc_name: str,
        pages: List[PageExtract],
    ) -> List[DocumentChunk]:
        """
        Segment extracted document pages into coherent chunks tagged with page metadata.

        Args:
            doc_id: Unique document UUID.
            doc_name: Original file name.
            pages: List of PageExtract instances.

        Returns:
            List of structured DocumentChunk objects.
        """
        all_chunks: List[DocumentChunk] = []
        global_chunk_index = 0

        for page in pages:
            page_text = page.text.strip()
            if not page_text:
                continue

            page_splits = self._split_text_recursively(
                text=page_text,
                max_size=self.chunk_size,
                overlap=self.chunk_overlap,
            )

            for local_idx, split_content in enumerate(page_splits):
                # Calculate character start and end relative to page text
                char_start = page_text.find(split_content[:40]) if len(split_content) >= 40 else 0
                if char_start < 0:
                    char_start = 0
                char_end = char_start + len(split_content)

                chunk = DocumentChunk(
                    chunk_id=f"{doc_id}_p{page.page_number}_c{local_idx}",
                    doc_id=doc_id,
                    doc_name=doc_name,
                    chunk_index=global_chunk_index,
                    page_number=page.page_number,
                    content=split_content,
                    char_start=char_start,
                    char_end=char_end,
                )
                all_chunks.append(chunk)
                global_chunk_index += 1

        logger.info(
            "Chunked document '%s' (%s) into %d total chunks across %d pages.",
            doc_name,
            doc_id,
            len(all_chunks),
            len(pages),
        )

        return all_chunks


chunking_service = ChunkingService()

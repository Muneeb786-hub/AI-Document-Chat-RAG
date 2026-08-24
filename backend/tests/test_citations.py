import pytest
from app.models.schemas import DocumentChunk
from app.services.citation_service import citation_service


def test_citation_snippet_extraction():
    """Verify snippet truncation cleanly clips on word boundaries."""
    long_text = "The Transformer architecture relies entirely on self-attention mechanisms to compute representations without using sequence-aligned RNNs or convolutions."
    snippet = citation_service.extract_snippet(long_text, max_length=50)

    assert len(snippet) <= 53  # 50 + "..."
    assert snippet.endswith("...")
    assert "Transformer" in snippet


def test_generate_grounded_citations():
    """Verify citation generator builds accurate page mappings."""
    chunks = [
        DocumentChunk(
            chunk_id="chunk-1",
            doc_id="doc-abc",
            doc_name="research_paper.pdf",
            chunk_index=0,
            page_number=3,
            content="Table 1 demonstrates significant translation speedups and higher BLEU scores.",
            char_start=0,
            char_end=75,
            similarity_score=0.92,
        ),
        DocumentChunk(
            chunk_id="chunk-2",
            doc_id="doc-abc",
            doc_name="research_paper.pdf",
            chunk_index=1,
            page_number=4,
            content="Multi-head attention yields improvements over single-head attention with identical computational cost.",
            char_start=76,
            char_end=170,
            similarity_score=0.88,
        ),
    ]

    citations = citation_service.generate_grounded_citations(chunks)

    assert len(citations) == 2
    assert citations[0].doc_name == "research_paper.pdf"
    assert citations[0].page_number == 3
    assert citations[0].score == 0.92
    assert citations[1].page_number == 4
    assert "Multi-head attention" in citations[1].snippet

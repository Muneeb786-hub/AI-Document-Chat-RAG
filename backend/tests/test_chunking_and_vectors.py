import io
import pytest
import fitz
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.config import settings
from app.models.schemas import PageExtract
from app.services.chunking_service import chunking_service
from app.services.embedding_service import embedding_service
from app.services.vector_store import vector_store


def create_sample_pdf_bytes(text_per_page: str, num_pages: int = 2) -> bytes:
    """Helper to generate multi-page PDF byte streams for testing."""
    doc = fitz.open()
    for _ in range(num_pages):
        page = doc.new_page()
        page.insert_text((50, 72), text_per_page, fontsize=11)
    data = doc.tobytes()
    doc.close()
    return data


def test_chunking_service_logic():
    """Verify recursive chunking splits paragraphs with overlap and tags correct page numbers."""
    pages = [
        PageExtract(
            page_number=1,
            text="The Transformer is the first transduction model relying entirely on self-attention. " * 15,
            char_count=1200,
            word_count=180,
        ),
        PageExtract(
            page_number=2,
            text="Recurrent models typically factor computation along the symbol positions. " * 15,
            char_count=1100,
            word_count=165,
        ),
    ]

    chunks = chunking_service.chunk_extracted_pages(
        doc_id="test-doc-123",
        doc_name="paper.pdf",
        pages=pages,
    )

    assert len(chunks) >= 2
    # Ensure page numbers are preserved accurately
    assert any(c.page_number == 1 for c in chunks)
    assert any(c.page_number == 2 for c in chunks)
    assert chunks[0].doc_id == "test-doc-123"
    assert chunks[0].doc_name == "paper.pdf"
    assert len(chunks[0].content) > 20


@pytest.mark.asyncio
async def test_embedding_service_dimension_and_batching():
    """Verify embedding service produces normalized vectors with 1536 dimensions."""
    texts = [
        "Attention mechanisms have become an integral part of sequence modeling.",
        "Self-attention connects all positions in constant sequential operations.",
    ]
    embeddings = await embedding_service.embed_texts(texts)

    assert len(embeddings) == 2
    assert len(embeddings[0]) == settings.EMBEDDING_DIMENSION
    assert len(embeddings[1]) == settings.EMBEDDING_DIMENSION

    # Query embedding test
    query_vec = await embedding_service.embed_query("What is self-attention?")
    assert len(query_vec) == settings.EMBEDDING_DIMENSION


@pytest.mark.asyncio
async def test_vector_store_indexing_and_querying():
    """Verify ChromaDB upsert, similarity querying, chunk inspection, and deletion."""
    doc_id = "unit-test-doc-456"
    doc_name = "test_document.pdf"
    pages = [
        PageExtract(
            page_number=1,
            text="Deep learning architectures rely on multi-head attention mechanisms for natural language tasks.",
            char_count=100,
            word_count=14,
        )
    ]

    chunks = chunking_service.chunk_extracted_pages(doc_id, doc_name, pages)
    embeddings = await embedding_service.embed_texts([c.content for c in chunks])

    # Index into ChromaDB
    vector_store.add_chunks(chunks, embeddings)

    # Verify retrieval by document
    stored_chunks = vector_store.get_chunks_by_document(doc_id)
    assert len(stored_chunks) == len(chunks)
    assert stored_chunks[0].doc_id == doc_id
    assert stored_chunks[0].page_number == 1

    # Verify similarity query
    query_vec = await embedding_service.embed_query("attention mechanisms in deep learning")
    similar_chunks = vector_store.query_similar_chunks(
        query_embedding=query_vec,
        doc_ids=[doc_id],
        top_k=2,
    )
    assert len(similar_chunks) > 0
    assert similar_chunks[0].doc_id == doc_id
    assert similar_chunks[0].similarity_score is not None

    # Clean up vectors
    vector_store.delete_chunks_by_document(doc_id)
    assert len(vector_store.get_chunks_by_document(doc_id)) == 0


@pytest.mark.asyncio
async def test_full_upload_and_chunk_inspection_endpoint():
    """End-to-end test verifying upload -> chunking -> vector store -> chunk inspection."""
    pdf_text = "Vector databases enable high-speed similarity search across high-dimensional embeddings. " * 10
    pdf_bytes = create_sample_pdf_bytes(pdf_text, num_pages=2)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Upload PDF
        files = {"file": ("vector_guide.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        upload_res = await client.post(f"{settings.API_V1_STR}/documents/upload", files=files)
        assert upload_res.status_code == 201
        data = upload_res.json()
        doc = data["document"]
        doc_id = doc["id"]
        assert doc["chunk_count"] > 0

        # 2. Inspect chunks via GET /documents/{doc_id}/chunks
        chunks_res = await client.get(f"{settings.API_V1_STR}/documents/{doc_id}/chunks")
        assert chunks_res.status_code == 200
        chunks_data = chunks_res.json()
        assert chunks_data["total"] == doc["chunk_count"]
        assert len(chunks_data["chunks"]) == doc["chunk_count"]

        # 3. Clean up
        del_res = await client.delete(f"{settings.API_V1_STR}/documents/{doc_id}")
        assert del_res.status_code == 200

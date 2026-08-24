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
from app.services.retrieval_service import retrieval_service


def create_pdf_bytes(text: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), text, fontsize=12)
    pdf_data = doc.tobytes()
    doc.close()
    return pdf_data


@pytest.mark.asyncio
async def test_retrieval_service_direct():
    """Verify semantic retrieval retrieves and formats context properly."""
    doc_id = "retrieval-test-doc-1"
    doc_name = "transformers_survey.pdf"

    pages = [
        PageExtract(
            page_number=1,
            text="The multi-head attention mechanism calculates scaled dot-product attention in parallel representation subspaces.",
            char_count=115,
            word_count=14,
        ),
        PageExtract(
            page_number=2,
            text="Positional encodings inject sinusoidal position signals into the input embeddings.",
            char_count=85,
            word_count=10,
        ),
    ]

    chunks = chunking_service.chunk_extracted_pages(doc_id, doc_name, pages)
    embeddings = await embedding_service.embed_texts([c.content for c in chunks])
    vector_store.add_chunks(chunks, embeddings)

    # Query for attention
    results, context = await retrieval_service.retrieve_relevant_chunks(
        query="Explain multi-head attention mechanism",
        document_ids=[doc_id],
        top_k=2,
    )

    assert len(results) > 0
    assert "[Source: transformers_survey.pdf | Page" in context
    assert "scaled dot-product" in context

    # Clean up
    vector_store.delete_chunks_by_document(doc_id)


@pytest.mark.asyncio
async def test_query_documents_api_endpoint():
    """Verify POST /api/v1/documents/query API endpoint returns formatted context and chunks."""
    pdf_text = "Dense vector indexing with cosine distance enables rapid semantic search across millions of chunks."
    pdf_bytes = create_pdf_bytes(pdf_text)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Upload
        files = {"file": ("vector_guide.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        upload_res = await client.post(f"{settings.API_V1_STR}/documents/upload", files=files)
        assert upload_res.status_code == 201
        doc_id = upload_res.json()["document"]["id"]

        # 2. Query
        query_payload = {
            "query": "How does vector indexing work?",
            "document_ids": [doc_id],
            "top_k": 2,
        }
        query_res = await client.post(f"{settings.API_V1_STR}/documents/query", json=query_payload)
        assert query_res.status_code == 200
        query_data = query_res.json()
        assert query_data["total_results"] > 0
        assert len(query_data["chunks"]) > 0
        assert "Vector" in query_data["formatted_context"] or "vector" in query_data["formatted_context"].lower()

        # 3. Clean up
        del_res = await client.delete(f"{settings.API_V1_STR}/documents/{doc_id}")
        assert del_res.status_code == 200

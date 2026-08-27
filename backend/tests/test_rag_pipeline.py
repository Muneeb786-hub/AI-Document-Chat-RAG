import io
import json
import pytest
import fitz
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.config import settings
from app.services.rag_service import rag_service


def create_mock_pdf() -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text(
        (50, 72),
        "The Transformer replaces recurrent layers with multi-head self-attention, achieving 28.4 BLEU on English-to-German translation.",
        fontsize=12,
    )
    data = doc.tobytes()
    doc.close()
    return data


@pytest.mark.asyncio
async def test_rag_service_direct_stream():
    """Verify RAGService stream yields citations followed by tokens and [DONE]."""
    stream_chunks: list[str] = []
    async for event in rag_service.stream_rag_chat(query="What is the BLEU score achieved?"):
        stream_chunks.append(event)

    assert len(stream_chunks) >= 3
    # First chunk should contain citations
    assert "citations" in stream_chunks[0]
    # Middle chunks should contain tokens
    assert any("token" in c for c in stream_chunks)
    # Last chunk should be [DONE]
    assert stream_chunks[-1] == "data: [DONE]\n\n"


@pytest.mark.asyncio
async def test_chat_query_and_stream_endpoints():
    """End-to-end test verifying document ingestion followed by RAG chat query and stream."""
    pdf_bytes = create_mock_pdf()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Ingest Document
        files = {"file": ("transformer_paper.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        upload_res = await client.post(f"{settings.API_V1_STR}/documents/upload", files=files)
        assert upload_res.status_code == 201
        doc_id = upload_res.json()["document"]["id"]

        # 2. Test Synchronous Chat Endpoint
        sync_payload = {
            "query": "What is the translation quality score?",
            "document_ids": [doc_id],
            "top_k": 2,
        }
        sync_res = await client.post(f"{settings.API_V1_STR}/chat/query", json=sync_payload)
        assert sync_res.status_code == 200
        sync_data = sync_res.json()
        assert "answer" in sync_data
        assert len(sync_data["citations"]) > 0
        assert sync_data["citations"][0]["doc_id"] == doc_id
        assert sync_data["citations"][0]["page_number"] == 1

        # 3. Test SSE Stream Endpoint
        stream_res = await client.post(f"{settings.API_V1_STR}/chat/stream", json=sync_payload)
        assert stream_res.status_code == 200
        assert "text/event-stream" in stream_res.headers["content-type"]
        body_text = stream_res.text
        assert "data: {" in body_text
        assert "data: [DONE]" in body_text

        # 4. Test Structured JSON Extraction Endpoint
        extract_payload = {
            "query": "Extract key findings and translation metrics.",
            "document_ids": [doc_id],
            "top_k": 2,
            "schema_type": "general_metrics",
        }
        extract_res = await client.post(f"{settings.API_V1_STR}/chat/extract", json=extract_payload)
        assert extract_res.status_code == 200
        extract_data = extract_res.json()
        assert "extracted_data" in extract_data
        assert isinstance(extract_data["extracted_data"], dict)
        assert len(extract_data["citations"]) > 0

        # 5. Clean up
        await client.delete(f"{settings.API_V1_STR}/documents/{doc_id}")

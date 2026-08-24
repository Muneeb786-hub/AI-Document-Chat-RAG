import io
import pytest
import fitz
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings
from app.services.pdf_service import pdf_service


def create_test_pdf_bytes(num_pages: int = 2) -> bytes:
    """Helper fixture to create a valid in-memory multi-page PDF with sample text."""
    doc = fitz.open()
    for i in range(num_pages):
        page = doc.new_page()
        page.insert_text(
            (50, 72),
            f"Page {i + 1} Content: Architectural foundations of Retrieval-Augmented Generation systems. Section {i + 1}.",
            fontsize=12,
        )
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_pdf_service_direct_extraction():
    """Verify PyMuPDF extraction returns correct page count and character metrics."""
    pdf_data = create_test_pdf_bytes(num_pages=3)
    pages, meta = pdf_service.extract_text_from_bytes(pdf_data, filename="sample.pdf")

    assert len(pages) == 3
    assert meta["page_count"] == 3
    assert pages[0].page_number == 1
    assert "Page 1 Content" in pages[0].text
    assert pages[1].page_number == 2
    assert "Page 2 Content" in pages[1].text
    assert meta["total_characters"] > 50


@pytest.mark.asyncio
async def test_upload_pdf_endpoint():
    """Verify POST /api/v1/documents/upload processes multipart PDF and registers metadata."""
    pdf_data = create_test_pdf_bytes(num_pages=2)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("test_research.pdf", io.BytesIO(pdf_data), "application/pdf")}
        response = await client.post(f"{settings.API_V1_STR}/documents/upload", files=files)

        assert response.status_code == 201
        data = response.json()
        assert "document" in data
        doc = data["document"]
        assert doc["original_filename"] == "test_research.pdf"
        assert doc["page_count"] == 2
        assert doc["status"] == "ready"
        doc_id = doc["id"]

        # Verify listing
        list_res = await client.get(f"{settings.API_V1_STR}/documents")
        assert list_res.status_code == 200
        list_data = list_res.json()
        assert any(d["id"] == doc_id for d in list_data["documents"])

        # Clean up via DELETE
        del_res = await client.delete(f"{settings.API_V1_STR}/documents/{doc_id}")
        assert del_res.status_code == 200

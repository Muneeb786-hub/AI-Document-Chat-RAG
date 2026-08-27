import io
import pytest
import fitz
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.config import settings
from app.services.vector_store import vector_store


def create_custom_pdf(filename: str, page_texts: list[str]) -> bytes:
    doc = fitz.open()
    for text in page_texts:
        page = doc.new_page()
        page.insert_text((50, 72), text, fontsize=12)
    data = doc.tobytes()
    doc.close()
    return data


@pytest.mark.asyncio
async def test_multi_document_corpus_and_lifecycle():
    """
    End-to-end multi-document test:
    1. Ingest Document A (Quantum Mechanics) and Document B (Neural Networks).
    2. Query across both documents simultaneously.
    3. Query scoped to Document A only.
    4. Query scoped to Document B only.
    5. Delete Document A and verify Document B remains intact.
    """
    doc_a_bytes = create_custom_pdf(
        "quantum_physics.pdf",
        [
            "Quantum entanglement occurs when pairs or groups of particles interact such that the quantum state of each particle cannot be described independently of the state of the others."
        ],
    )

    doc_b_bytes = create_custom_pdf(
        "neural_networks.pdf",
        [
            "Deep convolutional neural networks employ spatial invariance and local receptive fields for computer vision tasks."
        ],
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Ingest Document A
        files_a = {"file": ("quantum_physics.pdf", io.BytesIO(doc_a_bytes), "application/pdf")}
        res_a = await client.post(f"{settings.API_V1_STR}/documents/upload", files=files_a)
        assert res_a.status_code == 201
        doc_a_id = res_a.json()["document"]["id"]

        # Ingest Document B
        files_b = {"file": ("neural_networks.pdf", io.BytesIO(doc_b_bytes), "application/pdf")}
        res_b = await client.post(f"{settings.API_V1_STR}/documents/upload", files=files_b)
        assert res_b.status_code == 201
        doc_b_id = res_b.json()["document"]["id"]

        # 2. Query across BOTH documents
        multi_payload = {
            "query": "Compare quantum physics and neural networks",
            "document_ids": [doc_a_id, doc_b_id],
            "top_k": 4,
        }
        multi_res = await client.post(f"{settings.API_V1_STR}/chat/query", json=multi_payload)
        assert multi_res.status_code == 200
        multi_data = multi_res.json()
        assert len(multi_data["citations"]) >= 1

        # 3. Query scoped ONLY to Document A
        scoped_a_payload = {
            "query": "What is quantum entanglement?",
            "document_ids": [doc_a_id],
            "top_k": 2,
        }
        scoped_a_res = await client.post(f"{settings.API_V1_STR}/chat/query", json=scoped_a_payload)
        assert scoped_a_res.status_code == 200
        scoped_a_data = scoped_a_res.json()
        assert all(c["doc_id"] == doc_a_id for c in scoped_a_data["citations"])

        # 4. Query scoped ONLY to Document B
        scoped_b_payload = {
            "query": "What do convolutional neural networks employ?",
            "document_ids": [doc_b_id],
            "top_k": 2,
        }
        scoped_b_res = await client.post(f"{settings.API_V1_STR}/chat/query", json=scoped_b_payload)
        assert scoped_b_res.status_code == 200
        scoped_b_data = scoped_b_res.json()
        assert all(c["doc_id"] == doc_b_id for c in scoped_b_data["citations"])

        # 5. Delete Document A
        del_res = await client.delete(f"{settings.API_V1_STR}/documents/{doc_a_id}")
        assert del_res.status_code == 200

        # Verify Document A vectors are purged
        assert len(vector_store.get_chunks_by_document(doc_a_id)) == 0

        # Verify Document B vectors remain intact and queryable
        chunks_b = vector_store.get_chunks_by_document(doc_b_id)
        assert len(chunks_b) > 0

        # 6. Clean up Document B
        await client.delete(f"{settings.API_V1_STR}/documents/{doc_b_id}")


@pytest.mark.asyncio
async def test_sample_document_and_comparison_endpoints():
    """Verify loading demo technical document and running cross-document comparison."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Load Sample Document
        sample_res = await client.post(f"{settings.API_V1_STR}/documents/sample")
        assert sample_res.status_code == 201
        sample_doc = sample_res.json()["document"]
        doc_1_id = sample_doc["id"]
        assert sample_doc["page_count"] == 4
        assert sample_doc["chunk_count"] > 0

        # 2. Ingest a Second Document for Comparison
        doc_2_bytes = create_custom_pdf(
            "recurrent_models.pdf",
            [
                "Recurrent neural networks such as LSTMs and GRUs process sequential data step-by-step with gating mechanisms."
            ],
        )
        files_2 = {"file": ("recurrent_models.pdf", io.BytesIO(doc_2_bytes), "application/pdf")}
        res_2 = await client.post(f"{settings.API_V1_STR}/documents/upload", files=files_2)
        assert res_2.status_code == 201
        doc_2_id = res_2.json()["document"]["id"]

        # 3. Test Cross-Document Comparison Endpoint
        compare_payload = {
            "document_ids": [doc_1_id, doc_2_id],
            "comparison_topic": "Attention mechanisms vs recurrent models",
            "top_k_per_doc": 2,
        }
        comp_res = await client.post(f"{settings.API_V1_STR}/documents/compare", json=compare_payload)
        assert comp_res.status_code == 200
        comp_data = comp_res.json()
        assert "summary" in comp_data
        assert len(comp_data["comparison_matrix"]) > 0
        assert len(comp_data["documents_analyzed"]) == 2

        # 4. Clean up
        await client.delete(f"{settings.API_V1_STR}/documents/{doc_1_id}")
        await client.delete(f"{settings.API_V1_STR}/documents/{doc_2_id}")

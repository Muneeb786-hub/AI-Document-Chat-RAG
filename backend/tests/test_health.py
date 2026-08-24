import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_health_check_endpoint():
    """Verify that the health check endpoint returns 200 OK and expected metadata."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(f"{settings.API_V1_STR}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == settings.PROJECT_NAME
        assert data["version"] == settings.VERSION


@pytest.mark.asyncio
async def test_readiness_check_endpoint():
    """Verify that the readiness check endpoint returns storage status."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(f"{settings.API_V1_STR}/ready")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "storage" in data
        assert "model_config" in data

"""Integration tests for all API routes."""
import pytest
from httpx import AsyncClient

from tests.conftest import make_test_image


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_upload_success(client: AsyncClient):
    data = make_test_image()
    r = await client.post(
        "/api/upload",
        files={"file": ("photo.jpg", data, "image/jpeg")},
    )
    assert r.status_code == 200
    body = r.json()
    assert "token" in body
    assert len(body["token"]) == 32  # UUID hex


@pytest.mark.asyncio
async def test_upload_wrong_type(client: AsyncClient):
    r = await client.post(
        "/api/upload",
        files={"file": ("doc.pdf", b"dummy", "application/pdf")},
    )
    assert r.status_code == 415


@pytest.mark.asyncio
async def test_contour_not_found(client: AsyncClient):
    r = await client.get("/api/contour/nonexistenttoken")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_contour_success(client: AsyncClient):
    data = make_test_image()
    upload_r = await client.post(
        "/api/upload",
        files={"file": ("photo.jpg", data, "image/jpeg")},
    )
    token = upload_r.json()["token"]
    r = await client.get(f"/api/contour/{token}")
    assert r.status_code == 200
    body = r.json()
    assert body["token"] == token
    assert isinstance(body["points"], list)
    assert body["scale"] > 0


@pytest.mark.asyncio
async def test_status_after_upload(client: AsyncClient):
    data = make_test_image()
    upload_r = await client.post(
        "/api/upload",
        files={"file": ("photo.jpg", data, "image/jpeg")},
    )
    token = upload_r.json()["token"]
    r = await client.get(f"/api/status/{token}")
    assert r.status_code == 200
    assert r.json()["token"] == token


@pytest.mark.asyncio
async def test_status_not_found(client: AsyncClient):
    r = await client.get("/api/status/deadbeef")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_model_not_found(client: AsyncClient):
    r = await client.post(
        "/api/model",
        json={
            "token": "deadbeef",
            "points": [[0, 0], [10, 0], [10, 10], [0, 10]],
            "height": 5.0,
            "format": "stl",
        },
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_openapi_schema(client: AsyncClient):
    r = await client.get("/openapi.json")
    assert r.status_code == 200
    spec = r.json()
    paths = spec.get("paths", {})
    assert "/api/upload" in paths
    assert "/api/contour/{token}" in paths
    assert "/api/model" in paths
    assert "/api/status/{token}" in paths
    schemas = spec.get("components", {}).get("schemas", {})
    for name in ("UploadResponse", "ContourResponse", "ModelRequest", "ModelResponse"):
        assert name in schemas, f"Missing schema: {name}"

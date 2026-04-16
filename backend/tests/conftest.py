"""Shared fixtures for backend tests."""
import io
import numpy as np
import cv2
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


def make_test_image(width: int = 640, height: int = 480) -> bytes:
    """Create a synthetic image: white background, large dark rectangle as calibration sheet,
    small bright ellipse as object."""
    img = np.ones((height, width, 3), dtype=np.uint8) * 200

    # Calibration sheet (large rectangle)
    cv2.rectangle(img, (50, 50), (590, 430), (30, 30, 30), -1)

    # Object (bright ellipse on top of the dark sheet)
    cv2.ellipse(img, (320, 240), (80, 120), 0, 0, 360, (220, 220, 220), -1)

    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


@pytest.fixture
def test_image_bytes() -> bytes:
    return make_test_image()


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

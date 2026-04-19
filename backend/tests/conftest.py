"""Shared fixtures for backend tests."""
import io
import numpy as np
import cv2
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


def make_test_image(width: int = 640, height: int = 480) -> bytes:
    """Synthetic image that mirrors real-world usage:
    dark background → white A4 paper rectangle → dark object on paper."""
    img = np.ones((height, width, 3), dtype=np.uint8) * 60   # dark background

    # White calibration sheet (A4 paper)
    cv2.rectangle(img, (50, 30), (590, 450), (240, 240, 240), -1)

    # Dark object (tool) placed on the white paper
    cv2.ellipse(img, (320, 240), (80, 120), 0, 0, 360, (30, 30, 30), -1)

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

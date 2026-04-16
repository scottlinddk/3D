"""Unit tests for image processing functions."""
import numpy as np
import cv2
import pytest

from app.processing.image import (
    load_and_binarise,
    detect_calibration_sheet,
    extract_object_contour,
    fit_bspline,
    process_image,
)
from tests.conftest import make_test_image


def _write_tmp(tmp_path, data: bytes) -> str:
    p = tmp_path / "test.jpg"
    p.write_bytes(data)
    return str(p)


def test_load_and_binarise(tmp_path):
    path = _write_tmp(tmp_path, make_test_image())
    bgr, binary = load_and_binarise(path)
    assert bgr.ndim == 3
    assert binary.ndim == 2
    unique = set(binary.flatten().tolist())
    assert unique <= {0, 255}


def test_load_and_binarise_missing_file():
    with pytest.raises(ValueError, match="Cannot read"):
        load_and_binarise("/nonexistent/path.jpg")


def test_detect_calibration_sheet_returns_scale(tmp_path):
    path = _write_tmp(tmp_path, make_test_image())
    _, binary = load_and_binarise(path)
    scale, _ = detect_calibration_sheet(binary)
    assert scale > 0


def test_extract_object_contour_returns_points(tmp_path):
    path = _write_tmp(tmp_path, make_test_image())
    _, binary = load_and_binarise(path)
    scale, _ = detect_calibration_sheet(binary)
    points = extract_object_contour(binary, scale)
    assert len(points) >= 3
    for pt in points:
        assert len(pt) == 2


def test_fit_bspline_returns_resampled():
    pts = [[float(i), float(i ** 2 / 10)] for i in range(20)]
    result = fit_bspline(pts, num_points=50)
    assert len(result) == 50


def test_fit_bspline_too_few_points():
    pts = [[0.0, 0.0], [1.0, 1.0]]
    result = fit_bspline(pts)
    assert result == pts


def test_process_image_full_pipeline(tmp_path):
    path = _write_tmp(tmp_path, make_test_image())
    result = process_image(path)
    assert "points" in result
    assert "scale" in result
    assert result["scale"] > 0
    assert len(result["points"]) >= 3
    assert result["image_width"] > 0
    assert result["image_height"] > 0

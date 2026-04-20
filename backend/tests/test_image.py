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
    PAPER_SIZES_MM,
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


def test_detect_calibration_sheet_returns_scale_and_warped(tmp_path):
    path = _write_tmp(tmp_path, make_test_image())
    _, binary = load_and_binarise(path)
    scale, warped = detect_calibration_sheet(binary)
    assert scale > 0
    # The test image has a clearly visible white rectangle → warped should be found
    assert warped is not None, "Expected calibration sheet to be detected"


def test_detect_calibration_sheet_paper_sizes(tmp_path):
    """Different paper sizes produce different px/mm scales from the same image."""
    path = _write_tmp(tmp_path, make_test_image())
    _, binary = load_and_binarise(path)
    scale_a4, _ = detect_calibration_sheet(binary, 210.0, 297.0)
    scale_a3, _ = detect_calibration_sheet(binary, 297.0, 420.0)
    # A3 is larger → same pixel span → fewer px/mm
    assert scale_a3 < scale_a4


def test_paper_sizes_dict_has_expected_keys():
    for key in ("A3", "A4", "A5", "Letter", "Legal"):
        assert key in PAPER_SIZES_MM
        w, h = PAPER_SIZES_MM[key]
        assert w > 0 and h > 0 and h > w  # portrait: height > width


def test_extract_object_contour_from_warped(tmp_path):
    """After fixing the pipeline, contour extraction uses the warped+inverted binary."""
    path = _write_tmp(tmp_path, make_test_image())
    _, binary = load_and_binarise(path)
    scale, warped = detect_calibration_sheet(binary)
    assert warped is not None
    import cv2 as _cv2, numpy as _np
    inv = _cv2.bitwise_not(warped)
    kernel = _np.ones((5, 5), _np.uint8)
    working = _cv2.morphologyEx(inv, _cv2.MORPH_OPEN, kernel)
    points = extract_object_contour(working, scale)
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


def test_process_image_paper_sizes(tmp_path):
    """Different paper sizes produce different scales and potentially different contours."""
    path = _write_tmp(tmp_path, make_test_image())
    r_a4 = process_image(path, paper_size="A4")
    r_a3 = process_image(path, paper_size="A3")
    # A3 is larger → fewer px/mm
    assert r_a3["scale"] < r_a4["scale"]


def test_process_image_object_not_paper(tmp_path):
    """The extracted contour should be the object, not the paper rectangle."""
    path = _write_tmp(tmp_path, make_test_image())
    result = process_image(path)
    points = result["points"]
    # The dark ellipse in the test image has radii ~80x120 px.
    # At the detected scale the bounding box should be much smaller than the
    # full paper (540x420 px in the test image).
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    span_x = max(xs) - min(xs)
    span_y = max(ys) - min(ys)
    paper_w_mm = 210.0
    paper_h_mm = 297.0
    # The object must be smaller than the paper in both dimensions
    assert span_x < paper_w_mm, f"Object too wide ({span_x:.1f} mm ≥ paper {paper_w_mm} mm)"
    assert span_y < paper_h_mm, f"Object too tall ({span_y:.1f} mm ≥ paper {paper_h_mm} mm)"

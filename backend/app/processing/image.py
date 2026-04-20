"""Image processing pipeline: calibration + contour extraction."""
from __future__ import annotations

import cv2
import numpy as np
from numpy.typing import NDArray
from scipy.interpolate import splprep, splev

# Supported paper sizes (width_mm, height_mm) in portrait orientation
PAPER_SIZES_MM: dict[str, tuple[float, float]] = {
    "A3":      (297.0, 420.0),
    "A4":      (210.0, 297.0),
    "A5":      (148.0, 210.0),
    "A6":      (105.0, 148.0),
    "Letter":  (215.9, 279.4),
    "Legal":   (215.9, 355.6),
    "Tabloid": (279.4, 431.8),
}


def load_and_binarise(path: str) -> tuple[NDArray, NDArray]:
    """Load image, return (bgr, binary) where bright regions = 255."""
    bgr = cv2.imread(path)
    if bgr is None:
        raise ValueError(f"Cannot read image at {path}")
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, binary = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return bgr, binary


def _approx_rect(cnt: NDArray, epsilon_factor: float = 0.02) -> NDArray | None:
    """Approximate a contour to a 4-point polygon; return None if not quadrilateral."""
    peri = cv2.arcLength(cnt, True)
    approx = cv2.approxPolyDP(cnt, epsilon_factor * peri, True)
    return approx if len(approx) == 4 else None


def _order_points(pts: NDArray) -> NDArray:
    """Order four points: top-left, top-right, bottom-right, bottom-left."""
    pts = pts.reshape(4, 2).astype("float32")
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)
    ordered = np.zeros((4, 2), dtype="float32")
    ordered[0] = pts[np.argmin(s)]
    ordered[2] = pts[np.argmax(s)]
    ordered[1] = pts[np.argmin(diff)]
    ordered[3] = pts[np.argmax(diff)]
    return ordered


def detect_calibration_sheet(
    binary: NDArray,
    sheet_width_mm: float = 210.0,
    sheet_height_mm: float = 297.0,
) -> tuple[float, NDArray | None]:
    """
    Detect the largest rectangular contour (calibration sheet).
    Returns (pixels_per_mm, warped_binary | None).
    The warped binary is perspective-corrected to just the sheet area.
    Falls back to 96 DPI if no sheet is found.
    """
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    h, w = binary.shape
    image_area = h * w

    for cnt in contours[:10]:
        if cv2.contourArea(cnt) < image_area * 0.05:
            break
        approx = _approx_rect(cnt)
        if approx is None:
            continue

        pts = _order_points(approx)
        tl, tr, br, bl = pts

        width_px = float(max(np.linalg.norm(br - bl), np.linalg.norm(tr - tl)))
        height_px = float(max(np.linalg.norm(tr - br), np.linalg.norm(tl - bl)))

        # Choose orientation: portrait vs landscape
        if width_px > height_px:
            # Landscape — long side matches the sheet's long dimension
            ppm = width_px / sheet_height_mm
        else:
            ppm = height_px / sheet_height_mm

        dst = np.array(
            [
                [0, 0],
                [int(width_px) - 1, 0],
                [int(width_px) - 1, int(height_px) - 1],
                [0, int(height_px) - 1],
            ],
            dtype="float32",
        )
        M = cv2.getPerspectiveTransform(pts, dst)
        warped = cv2.warpPerspective(binary, M, (int(width_px), int(height_px)))
        return ppm, warped

    # Fallback: assume 96 dpi → 3.78 px/mm
    return 96.0 / 25.4, None


def _find_object_contour(
    binary: NDArray,
    min_ratio: float = 0.005,
    max_ratio: float = 0.90,
) -> NDArray | None:
    """Return the largest contour whose area falls in [min_ratio, max_ratio] of image."""
    h, w = binary.shape
    image_area = h * w
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    for cnt in contours:
        ratio = cv2.contourArea(cnt) / image_area
        if min_ratio <= ratio <= max_ratio:
            return cnt
    return None


def extract_object_contour(
    binary: NDArray,
    pixels_per_mm: float,
    epsilon_mm: float = 0.5,
) -> list[list[float]]:
    """
    Find the largest non-background contour, simplify with RDP, convert to mm.
    Returns [[x_mm, y_mm], ...].
    """
    chosen = _find_object_contour(binary)
    if chosen is None:
        raise ValueError("No contours detected in the image.")

    epsilon_px = epsilon_mm * pixels_per_mm
    simplified = cv2.approxPolyDP(chosen, epsilon_px, closed=True)
    pts_mm = (simplified.reshape(-1, 2) / pixels_per_mm).tolist()
    return pts_mm


def fit_bspline(points: list[list[float]], num_points: int = 200) -> list[list[float]]:
    """Fit a B-spline through the given points and return resampled coordinates."""
    arr = np.array(points)
    if len(arr) < 4:
        return points
    tck, _ = splprep([arr[:, 0], arr[:, 1]], s=0, per=True)
    u_new = np.linspace(0, 1, num_points)
    x_new, y_new = splev(u_new, tck)
    return list(zip(x_new.tolist(), y_new.tolist()))


def process_image(image_path: str, paper_size: str = "A4") -> dict:
    """
    Full pipeline: load → binarise → calibrate → extract contour → optional spline.
    Returns a dict matching ContourResponse fields.
    """
    dims = PAPER_SIZES_MM.get(paper_size, PAPER_SIZES_MM["A4"])
    sheet_w_mm, sheet_h_mm = dims

    bgr, binary = load_and_binarise(image_path)
    h, w = binary.shape

    pixels_per_mm, warped = detect_calibration_sheet(binary, sheet_w_mm, sheet_h_mm)

    if warped is not None:
        # The warped binary shows the calibration sheet region:
        #   paper area → 255 (white), dark object on paper → 0 (black).
        # Invert so the object becomes the white (foreground) region.
        inv = cv2.bitwise_not(warped)
        # Morphological open removes tiny warp-border artifacts.
        kernel = np.ones((5, 5), np.uint8)
        working = cv2.morphologyEx(inv, cv2.MORPH_OPEN, kernel)
    else:
        # No calibration sheet found — try the raw binary first, then its inverse.
        working = binary
        if _find_object_contour(working) is None:
            working = cv2.bitwise_not(binary)

    points = extract_object_contour(working, pixels_per_mm)

    spline: list[list[float]] | None = None
    if len(points) >= 4:
        try:
            spline = fit_bspline(points)
        except Exception:
            spline = None

    return {
        "points": points,
        "scale": round(pixels_per_mm, 4),
        "image_width": w,
        "image_height": h,
        "spline_points": spline,
    }

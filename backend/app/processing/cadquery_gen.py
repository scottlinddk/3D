"""3-D model generation using CadQuery."""
from __future__ import annotations

from pathlib import Path


def generate_model(
    points: list[list[float]],
    height: float,
    output_path: str,
    fmt: str = "stl",
    revolve: bool = False,
) -> None:
    """
    Build a 3-D solid from a 2-D profile polyline and export it.

    Parameters
    ----------
    points:
        Profile as [[x, y], ...] in mm.  The polyline is automatically closed.
    height:
        Extrusion depth in mm (ignored when revolve=True).
    output_path:
        Absolute path where the output file will be written.
    fmt:
        "stl" or "step".
    revolve:
        When True, revolve the profile 360° around the Y-axis.
    """
    try:
        import cadquery as cq
    except ImportError as exc:
        raise RuntimeError(
            "cadquery is not installed. Run: pip install cadquery"
        ) from exc

    if len(points) < 3:
        raise ValueError("At least 3 points are required to generate a solid.")

    # Close the profile if not already closed
    pts = [(float(p[0]), float(p[1])) for p in points]
    if pts[0] != pts[-1]:
        pts.append(pts[0])

    wire = cq.Workplane("XY").polyline(pts).close()

    if revolve:
        solid = wire.revolve(360, (0, 0, 0), (0, 1, 0))
    else:
        solid = wire.extrude(height)

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    if fmt == "step":
        cq.exporters.export(solid.val(), str(out))
    else:
        cq.exporters.export(solid.val(), str(out), exportType="STL")

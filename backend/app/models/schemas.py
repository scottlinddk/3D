from typing import Literal
from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    token: str = Field(..., description="Unique processing token for this upload")


class StatusResponse(BaseModel):
    token: str
    status: Literal["pending", "processing", "ready", "error"]
    message: str | None = None


class ContourResponse(BaseModel):
    token: str
    points: list[list[float]] = Field(
        ..., description="Simplified contour as [[x, y], ...] in mm"
    )
    scale: float = Field(..., description="Pixels per mm derived from calibration sheet")
    image_width: int
    image_height: int
    spline_points: list[list[float]] | None = Field(
        None, description="Optional B-spline fitted points"
    )
    paper_size: str = Field(default="A4", description="Calibration sheet size used")


class ModelRequest(BaseModel):
    token: str = Field(..., description="Token from upload step")
    points: list[list[float]] = Field(
        ..., description="Final profile points in mm [[x, y], ...]"
    )
    height: float = Field(default=10.0, gt=0, description="Extrusion height in mm")
    format: Literal["stl", "step"] = Field(default="stl")
    revolve: bool = Field(
        default=False, description="Revolve profile around Y-axis instead of extruding"
    )


class ModelResponse(BaseModel):
    url: str = Field(..., description="Download URL for the generated 3D file")
    format: str
    filename: str


# ── History ──────────────────────────────────────────────────────────────────

class HistorySaveRequest(BaseModel):
    name: str = Field(default="Untitled", max_length=120)
    points: list[list[float]] = Field(..., description="Profile points in mm")
    height: float = Field(default=10.0, gt=0)
    revolve: bool = Field(default=False)
    format: Literal["stl", "step"] = Field(default="stl")
    paper_size: str = Field(default="A4")


class HistoryEntry(BaseModel):
    id: int
    name: str
    points: list[list[float]]
    height: float
    revolve: bool
    format: str
    paper_size: str
    created_at: str

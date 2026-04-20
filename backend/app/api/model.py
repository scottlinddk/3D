import asyncio
from pathlib import Path

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse

from app.models.schemas import ModelRequest, ModelResponse
from app.processing.cadquery_gen import generate_model
from app.storage.temp import image_path, output_path, set_status

router = APIRouter()


def _run_generation(req: ModelRequest, out: str) -> None:
    generate_model(
        points=req.points,
        height=req.height,
        output_path=out,
        fmt=req.format,
        revolve=req.revolve,
    )


@router.post(
    "/model",
    response_model=ModelResponse,
    summary="Generate a 3-D model from a profile and return a download URL",
)
async def create_model(req: ModelRequest) -> ModelResponse:
    img = image_path(req.token)
    if not img.exists():
        raise HTTPException(status_code=404, detail="Token not found.")

    if len(req.points) < 3:
        raise HTTPException(status_code=422, detail="At least 3 points are required.")

    out = str(output_path(req.token, req.format))
    set_status(req.token, "processing")

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _run_generation, req, out)
    except RuntimeError as exc:
        set_status(req.token, "error", str(exc))
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        set_status(req.token, "error", str(exc))
        raise HTTPException(status_code=500, detail="Model generation failed.") from exc

    set_status(req.token, "ready")
    filename = f"model_{req.token[:8]}.{req.format}"
    # Return a relative path so the browser resolves it against the page origin,
    # routing through the correct proxy (Vite in dev, nginx in prod) instead of
    # hitting the internal backend address directly.
    url = f"/api/download/{req.token}/{req.format}"

    return ModelResponse(url=url, format=req.format, filename=filename)


@router.get("/download/{token}/{fmt}", summary="Download a previously generated 3-D file")
async def download_model(token: str, fmt: str) -> FileResponse:
    if fmt not in ("stl", "step"):
        raise HTTPException(status_code=400, detail="Format must be stl or step.")
    path = output_path(token, fmt)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found. Generate the model first.")
    media = "application/octet-stream" if fmt == "stl" else "application/step"
    return FileResponse(str(path), media_type=media, filename=f"model.{fmt}")

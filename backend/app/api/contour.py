from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import ContourResponse
from app.processing.image import process_image, PAPER_SIZES_MM
from app.storage.temp import image_path, get_status, set_status

router = APIRouter()

VALID_PAPER_SIZES = list(PAPER_SIZES_MM.keys())


@router.get(
    "/contour/{token}",
    response_model=ContourResponse,
    summary="Extract and return the object contour for a processed image",
)
async def get_contour(
    token: str,
    paper_size: str = Query(default="A4", description=f"Calibration sheet size. One of: {', '.join(VALID_PAPER_SIZES)}"),
) -> ContourResponse:
    path = image_path(token)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Token not found. Upload an image first.")

    if paper_size not in PAPER_SIZES_MM:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid paper_size '{paper_size}'. Choose from: {', '.join(VALID_PAPER_SIZES)}",
        )

    set_status(token, "processing")
    try:
        result = process_image(str(path), paper_size=paper_size)
    except ValueError as exc:
        set_status(token, "error", str(exc))
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        set_status(token, "error", str(exc))
        raise HTTPException(status_code=500, detail="Unexpected processing error.") from exc

    set_status(token, "ready")
    return ContourResponse(token=token, paper_size=paper_size, **result)

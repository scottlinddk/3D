from fastapi import APIRouter, HTTPException

from app.models.schemas import ContourResponse
from app.processing.image import process_image
from app.storage.temp import image_path, get_status, set_status

router = APIRouter()


@router.get(
    "/contour/{token}",
    response_model=ContourResponse,
    summary="Extract and return the object contour for a processed image",
)
async def get_contour(token: str) -> ContourResponse:
    path = image_path(token)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Token not found. Upload an image first.")

    status, _ = get_status(token)
    if status == "error":
        raise HTTPException(status_code=422, detail="Image processing previously failed.")

    set_status(token, "processing")
    try:
        result = process_image(str(path))
    except ValueError as exc:
        set_status(token, "error", str(exc))
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        set_status(token, "error", str(exc))
        raise HTTPException(status_code=500, detail="Unexpected processing error.") from exc

    set_status(token, "ready")
    return ContourResponse(token=token, **result)

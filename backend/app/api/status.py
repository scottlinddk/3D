from fastapi import APIRouter, HTTPException

from app.models.schemas import StatusResponse
from app.storage.temp import image_path, get_status

router = APIRouter()


@router.get(
    "/status/{token}",
    response_model=StatusResponse,
    summary="Return the current processing status for a token",
)
async def get_processing_status(token: str) -> StatusResponse:
    if not image_path(token).exists():
        raise HTTPException(status_code=404, detail="Token not found.")
    status, message = get_status(token)
    return StatusResponse(token=token, status=status, message=message)

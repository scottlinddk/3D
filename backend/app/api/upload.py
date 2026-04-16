from fastapi import APIRouter, UploadFile, File, HTTPException
import aiofiles

from app.models.schemas import UploadResponse
from app.storage.temp import new_token, image_path, set_status

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/tiff"}
MAX_SIZE_MB = 20


@router.post("/upload", response_model=UploadResponse, summary="Upload an image for processing")
async def upload_image(file: UploadFile = File(...)) -> UploadResponse:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type: {file.content_type}. Use JPEG, PNG, WebP or TIFF.",
        )

    token = new_token()
    dest = image_path(token)

    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds {MAX_SIZE_MB} MB limit.")

    async with aiofiles.open(dest, "wb") as f:
        await f.write(content)

    set_status(token, "ready")
    return UploadResponse(token=token)

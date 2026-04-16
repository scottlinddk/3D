from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import upload, contour, model, status

app = FastAPI(
    title="Curve Extraction API",
    description=(
        "Upload photographs of objects, extract curved profiles, "
        "and generate 3-D models for CAD software."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_PREFIX = "/api"
app.include_router(upload.router, prefix=_PREFIX, tags=["Upload"])
app.include_router(contour.router, prefix=_PREFIX, tags=["Contour"])
app.include_router(model.router, prefix=_PREFIX, tags=["Model"])
app.include_router(status.router, prefix=_PREFIX, tags=["Status"])


@app.get("/health", tags=["Health"])
async def health() -> dict:
    return {"status": "ok"}

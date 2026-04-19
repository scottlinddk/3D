from fastapi import APIRouter, HTTPException

from app.models.schemas import HistorySaveRequest, HistoryEntry
from app.storage.db import save_model, list_models, delete_model

router = APIRouter()


@router.post("/history", response_model=HistoryEntry, status_code=201,
             summary="Save a model configuration to history")
async def create_history(req: HistorySaveRequest) -> HistoryEntry:
    entry_id = save_model(
        name=req.name,
        points=req.points,
        height=req.height,
        revolve=req.revolve,
        format=req.format,
        paper_size=req.paper_size,
    )
    rows = list_models(limit=1)
    for row in rows:
        if row["id"] == entry_id:
            return HistoryEntry(**row)
    raise HTTPException(status_code=500, detail="Failed to retrieve saved entry.")


@router.get("/history", response_model=list[HistoryEntry],
            summary="List all saved model configurations")
async def get_history() -> list[HistoryEntry]:
    return [HistoryEntry(**row) for row in list_models()]


@router.delete("/history/{entry_id}", status_code=204,
               summary="Delete a history entry")
async def remove_history(entry_id: int) -> None:
    if not delete_model(entry_id):
        raise HTTPException(status_code=404, detail="History entry not found.")

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, require_viewer, require_admin
from app.schemas.floor import FloorCreate, FloorRead
from app.schemas.seat import SeatRead
from app.services.floor_service import FloorService
from app.services.seat_service import SeatService

router = APIRouter()
floor_service = FloorService()
seat_service = SeatService()


@router.post("", response_model=FloorRead, status_code=status.HTTP_201_CREATED)
async def create_floor(
    data: FloorCreate,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_admin),
):
    return await floor_service.create_floor(db, data)


@router.get("/{id}/seats", response_model=List[SeatRead])
async def list_floor_seats(
    id: int,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_viewer),
):
    # Validate the floor exists first
    await floor_service.get_floor(db, id)
    return await seat_service.list_seats(db, floor_id=id)

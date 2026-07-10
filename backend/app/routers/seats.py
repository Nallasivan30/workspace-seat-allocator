from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, require_viewer, require_admin
from app.schemas.seat import SeatCreate, SeatUpdate, SeatRead, SeatWithLocationRead, SeatDetailRead
from app.services.seat_service import SeatService

router = APIRouter()
seat_service = SeatService()


@router.get("", response_model=List[SeatWithLocationRead])
async def list_seats(
    building_id: Optional[int] = None,
    floor_id: Optional[int] = None,
    status: Optional[str] = None,
    seat_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_viewer),
):
    return await seat_service.list_seats(
        db,
        building_id=building_id,
        floor_id=floor_id,
        status=status,
        seat_type=seat_type,
    )


@router.get("/available", response_model=List[SeatWithLocationRead])
async def list_available_seats(
    building_id: Optional[int] = None,
    floor_id: Optional[int] = None,
    seat_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_viewer),
):
    return await seat_service.list_seats(
        db,
        building_id=building_id,
        floor_id=floor_id,
        status="available",
        seat_type=seat_type,
    )


@router.get("/{id}", response_model=SeatDetailRead)
async def get_seat_detail(
    id: int,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_viewer),
):
    return await seat_service.get_seat(db, id)


@router.post("", response_model=SeatWithLocationRead, status_code=status.HTTP_201_CREATED)
async def create_seat(
    data: SeatCreate,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_admin),
):
    return await seat_service.create_seat(db, data)


@router.patch("/{id}", response_model=SeatWithLocationRead)
async def update_seat(
    id: int,
    data: SeatUpdate,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_admin),
):
    return await seat_service.update_seat(db, id, data)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_seat(
    id: int,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_admin),
):
    await seat_service.delete_seat(db, id)

from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.seat_repository import SeatRepository
from app.repositories.floor_repository import FloorRepository
from app.schemas.seat import SeatCreate, SeatUpdate
from app.models.seat import Seat


class SeatService:
    def __init__(self):
        self.seat_repo = SeatRepository()
        self.floor_repo = FloorRepository()

    async def get_seat(self, db: AsyncSession, seat_id: int) -> Seat:
        seat = await self.seat_repo.get_by_id(db, seat_id)
        if not seat:
            raise HTTPException(status_code=404, detail="Seat not found")
        return seat

    async def list_seats(
        self,
        db: AsyncSession,
        *,
        building_id: Optional[int] = None,
        floor_id: Optional[int] = None,
        status: Optional[str] = None,
        seat_type: Optional[str] = None,
    ) -> List[Seat]:
        return await self.seat_repo.list_seats(
            db,
            building_id=building_id,
            floor_id=floor_id,
            status=status,
            seat_type=seat_type,
        )

    async def create_seat(self, db: AsyncSession, obj_in: SeatCreate) -> Seat:
        # Validate floor exists
        floor = await self.floor_repo.get_by_id(db, obj_in.floor_id)
        if not floor:
            raise HTTPException(status_code=404, detail="Floor not found")

        # Check duplicate seat code on floor
        existing = await self.seat_repo.get_by_code_and_floor(
            db, seat_code=obj_in.seat_code, floor_id=obj_in.floor_id
        )
        if existing:
            raise HTTPException(status_code=400, detail="Seat code already exists on this floor")

        try:
            seat = await self.seat_repo.create(db, obj_in)
            await db.commit()
            return await self.seat_repo.get_by_id(db, seat.id)
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create seat: {str(e)}")

    async def update_seat(
        self, db: AsyncSession, seat_id: int, obj_in: SeatUpdate
    ) -> Seat:
        seat = await self.seat_repo.get_by_id(db, seat_id)
        if not seat:
            raise HTTPException(status_code=404, detail="Seat not found")

        # If updating floor_id or seat_code, validate uniqueness
        floor_id = obj_in.floor_id or seat.floor_id
        seat_code = obj_in.seat_code or seat.seat_code
        if obj_in.floor_id is not None or obj_in.seat_code is not None:
            existing = await self.seat_repo.get_by_code_and_floor(
                db, seat_code=seat_code, floor_id=floor_id
            )
            if existing and existing.id != seat.id:
                raise HTTPException(status_code=400, detail="Seat code already exists on the target floor")

        try:
            seat = await self.seat_repo.update(db, seat, obj_in)
            await db.commit()
            return await self.seat_repo.get_by_id(db, seat.id)
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to update seat: {str(e)}")

    async def delete_seat(self, db: AsyncSession, seat_id: int) -> None:
        seat = await self.seat_repo.get_by_id(db, seat_id)
        if not seat:
            raise HTTPException(status_code=404, detail="Seat not found")
        try:
            await self.seat_repo.soft_delete(db, seat)
            await db.commit()
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to delete seat: {str(e)}")

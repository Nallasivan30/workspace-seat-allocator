from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.floor_repository import FloorRepository
from app.repositories.building_repository import BuildingRepository
from app.schemas.floor import FloorCreate, FloorUpdate
from app.models.floor import Floor


class FloorService:
    def __init__(self):
        self.floor_repo = FloorRepository()
        self.building_repo = BuildingRepository()

    async def get_floor(self, db: AsyncSession, floor_id: int) -> Floor:
        floor = await self.floor_repo.get_by_id(db, floor_id)
        if not floor:
            raise HTTPException(status_code=404, detail="Floor not found")
        return floor

    async def list_by_building(self, db: AsyncSession, building_id: int) -> List[Floor]:
        # Validate building exists
        building = await self.building_repo.get_by_id(db, building_id)
        if not building:
            raise HTTPException(status_code=404, detail="Building not found")
        return await self.floor_repo.list_by_building(db, building_id)

    async def create_floor(self, db: AsyncSession, obj_in: FloorCreate) -> Floor:
        # Validate building exists
        building = await self.building_repo.get_by_id(db, obj_in.building_id)
        if not building:
            raise HTTPException(status_code=404, detail="Building not found")

        # Check duplicate floor number in building
        existing = await self.floor_repo.get_by_building_and_number(
            db, building_id=obj_in.building_id, floor_number=obj_in.floor_number
        )
        if existing:
            raise HTTPException(status_code=400, detail="Floor number already exists in this building")

        try:
            floor = await self.floor_repo.create(db, obj_in)
            await db.commit()
            return floor
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create floor: {str(e)}")

    async def update_floor(
        self, db: AsyncSession, floor_id: int, obj_in: FloorUpdate
    ) -> Floor:
        floor = await self.floor_repo.get_by_id(db, floor_id)
        if not floor:
            raise HTTPException(status_code=404, detail="Floor not found")

        if obj_in.floor_number is not None and obj_in.floor_number != floor.floor_number:
            existing = await self.floor_repo.get_by_building_and_number(
                db, building_id=floor.building_id, floor_number=obj_in.floor_number
            )
            if existing:
                raise HTTPException(status_code=400, detail="Floor number already exists in this building")

        try:
            floor = await self.floor_repo.update(db, floor, obj_in)
            await db.commit()
            return floor
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to update floor: {str(e)}")

    async def delete_floor(self, db: AsyncSession, floor_id: int) -> None:
        floor = await self.floor_repo.get_by_id(db, floor_id)
        if not floor:
            raise HTTPException(status_code=404, detail="Floor not found")
        try:
            await self.floor_repo.soft_delete(db, floor)
            await db.commit()
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to delete floor: {str(e)}")

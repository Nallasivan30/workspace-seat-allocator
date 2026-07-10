from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.building_repository import BuildingRepository
from app.schemas.building import BuildingCreate, BuildingUpdate
from app.models.building import Building


class BuildingService:
    def __init__(self):
        self.building_repo = BuildingRepository()

    async def get_building(self, db: AsyncSession, building_id: int) -> Building:
        building = await self.building_repo.get_by_id(db, building_id)
        if not building:
            raise HTTPException(status_code=404, detail="Building not found")
        return building

    async def list_buildings(self, db: AsyncSession) -> List[Building]:
        return await self.building_repo.list_buildings(db)

    async def create_building(self, db: AsyncSession, obj_in: BuildingCreate) -> Building:
        existing = await self.building_repo.get_by_code(db, obj_in.code)
        if existing:
            raise HTTPException(status_code=400, detail="Building code already exists")
        try:
            building = await self.building_repo.create(db, obj_in)
            await db.commit()
            return building
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create building: {str(e)}")

    async def update_building(
        self, db: AsyncSession, building_id: int, obj_in: BuildingUpdate
    ) -> Building:
        building = await self.building_repo.get_by_id(db, building_id)
        if not building:
            raise HTTPException(status_code=404, detail="Building not found")
        
        if obj_in.code is not None and obj_in.code != building.code:
            existing = await self.building_repo.get_by_code(db, obj_in.code)
            if existing:
                raise HTTPException(status_code=400, detail="Building code already exists")

        try:
            building = await self.building_repo.update(db, building, obj_in)
            await db.commit()
            return building
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to update building: {str(e)}")

    async def delete_building(self, db: AsyncSession, building_id: int) -> None:
        building = await self.building_repo.get_by_id(db, building_id)
        if not building:
            raise HTTPException(status_code=404, detail="Building not found")
        try:
            await self.building_repo.soft_delete(db, building)
            await db.commit()
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to delete building: {str(e)}")

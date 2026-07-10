from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.building import Building
from app.schemas.building import BuildingCreate, BuildingUpdate


class BuildingRepository:
    async def get_by_id(self, db: AsyncSession, building_id: int) -> Optional[Building]:
        stmt = (
            select(Building)
            .where(Building.id == building_id, Building.is_active == True)
            .options(selectinload(Building.floors))
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_code(self, db: AsyncSession, code: str) -> Optional[Building]:
        stmt = select(Building).where(Building.code == code, Building.is_active == True)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def list_buildings(self, db: AsyncSession) -> List[Building]:
        stmt = select(Building).where(Building.is_active == True).order_by(Building.name.asc())
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def create(self, db: AsyncSession, obj_in: BuildingCreate) -> Building:
        db_obj = Building(
            code=obj_in.code,
            name=obj_in.name,
            address=obj_in.address,
            is_active=obj_in.is_active,
        )
        db.add(db_obj)
        await db.flush()
        return db_obj

    async def update(self, db: AsyncSession, db_obj: Building, obj_in: BuildingUpdate) -> Building:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.flush()
        return db_obj

    async def soft_delete(self, db: AsyncSession, db_obj: Building) -> Building:
        db_obj.is_active = False
        db.add(db_obj)
        await db.flush()
        return db_obj

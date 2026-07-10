from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.floor import Floor
from app.schemas.floor import FloorCreate, FloorUpdate


class FloorRepository:
    async def get_by_id(self, db: AsyncSession, floor_id: int) -> Optional[Floor]:
        stmt = (
            select(Floor)
            .where(Floor.id == floor_id, Floor.is_active == True)
            .options(selectinload(Floor.building))
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_building_and_number(
        self, db: AsyncSession, *, building_id: int, floor_number: int
    ) -> Optional[Floor]:
        stmt = select(Floor).where(
            Floor.building_id == building_id,
            Floor.floor_number == floor_number,
            Floor.is_active == True,
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def list_by_building(self, db: AsyncSession, building_id: int) -> List[Floor]:
        stmt = (
            select(Floor)
            .where(Floor.building_id == building_id, Floor.is_active == True)
            .order_by(Floor.floor_number.asc())
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def create(self, db: AsyncSession, obj_in: FloorCreate) -> Floor:
        db_obj = Floor(
            building_id=obj_in.building_id,
            floor_number=obj_in.floor_number,
            name=obj_in.name,
            is_active=obj_in.is_active,
        )
        db.add(db_obj)
        await db.flush()
        return db_obj

    async def update(self, db: AsyncSession, db_obj: Floor, obj_in: FloorUpdate) -> Floor:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.flush()
        return db_obj

    async def soft_delete(self, db: AsyncSession, db_obj: Floor) -> Floor:
        db_obj.is_active = False
        db.add(db_obj)
        await db.flush()
        return db_obj

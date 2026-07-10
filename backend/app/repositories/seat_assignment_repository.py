from datetime import datetime
from typing import Optional, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models.seat_assignment import SeatAssignment
from app.models.seat_release_log import SeatReleaseLog
from app.schemas.seat_assignment import SeatAssignmentCreate, SeatReleaseCreate
from app.models.seat import Seat
from app.models.floor import Floor


class SeatAssignmentRepository:
    async def get_by_id(self, db: AsyncSession, assignment_id: int) -> Optional[SeatAssignment]:
        stmt = (
            select(SeatAssignment)
            .where(SeatAssignment.id == assignment_id)
            .options(
                joinedload(SeatAssignment.employee),
                joinedload(SeatAssignment.seat),
            )
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_active_for_employee(
        self, db: AsyncSession, employee_id: int
    ) -> Optional[SeatAssignment]:
        stmt = (
            select(SeatAssignment)
            .where(
                SeatAssignment.employee_id == employee_id,
                SeatAssignment.released_at == None,
            )
            .options(
                joinedload(SeatAssignment.seat).joinedload(Seat.floor).joinedload(Floor.building)
            )
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_active_for_seat(
        self, db: AsyncSession, seat_id: int
    ) -> Optional[SeatAssignment]:
        stmt = (
            select(SeatAssignment)
            .where(
                SeatAssignment.seat_id == seat_id,
                SeatAssignment.released_at == None,
            )
            .options(joinedload(SeatAssignment.employee))
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def create(self, db: AsyncSession, obj_in: SeatAssignmentCreate, assigned_by_user_id: Optional[int] = None) -> SeatAssignment:
        db_obj = SeatAssignment(
            employee_id=obj_in.employee_id,
            seat_id=obj_in.seat_id,
            notes=obj_in.notes,
            assigned_by_user_id=assigned_by_user_id,
            assigned_at=datetime.utcnow(),
            released_at=None,
        )
        db.add(db_obj)
        await db.flush()
        return db_obj

    async def release(
        self, db: AsyncSession, db_obj: SeatAssignment, obj_in: SeatReleaseCreate
    ) -> SeatReleaseLog:
        # Mark assignment as released
        now = datetime.utcnow()
        db_obj.released_at = now
        db.add(db_obj)

        # Create release log
        log_obj = SeatReleaseLog(
            seat_assignment_id=db_obj.id,
            released_by_user_id=obj_in.released_by_user_id,
            reason=obj_in.reason,
            notes=obj_in.notes,
            released_at=now,
        )
        db.add(log_obj)
        await db.flush()
        return log_obj

    async def list_active_assignments(self, db: AsyncSession) -> List[SeatAssignment]:
        stmt = (
            select(SeatAssignment)
            .where(SeatAssignment.released_at == None)
            .options(
                joinedload(SeatAssignment.employee),
                joinedload(SeatAssignment.seat).joinedload(Seat.floor).joinedload(Floor.building),
            )
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def list_assignments(
        self,
        db: AsyncSession,
        *,
        employee_id: Optional[int] = None,
        seat_id: Optional[int] = None,
        status: Optional[str] = None,
    ) -> List[SeatAssignment]:
        stmt = select(SeatAssignment).options(
            joinedload(SeatAssignment.employee),
            joinedload(SeatAssignment.seat).joinedload(Seat.floor).joinedload(Floor.building),
            joinedload(SeatAssignment.release_log),
        )
        
        if employee_id is not None:
            stmt = stmt.where(SeatAssignment.employee_id == employee_id)
        if seat_id is not None:
            stmt = stmt.where(SeatAssignment.seat_id == seat_id)
            
        if status == "active":
            stmt = stmt.where(SeatAssignment.released_at == None)
        elif status == "released":
            stmt = stmt.where(SeatAssignment.released_at != None)
            
        stmt = stmt.order_by(SeatAssignment.assigned_at.desc())
        res = await db.execute(stmt)
        return list(res.scalars().all())

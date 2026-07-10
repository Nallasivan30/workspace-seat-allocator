from typing import Optional, List, Tuple
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models.seat import Seat
from app.models.floor import Floor
from app.models.building import Building
from app.models.employee_project import EmployeeProject
from app.models.seat_assignment import SeatAssignment
from app.schemas.seat import SeatCreate, SeatUpdate


class SeatRepository:
    async def get_by_id(self, db: AsyncSession, seat_id: int) -> Optional[Seat]:
        stmt = (
            select(Seat)
            .where(Seat.id == seat_id, Seat.is_active == True)
            .options(
                joinedload(Seat.floor).joinedload(Floor.building),
                selectinload(Seat.assignments).selectinload(SeatAssignment.employee)
            )
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_code_and_floor(
        self, db: AsyncSession, *, seat_code: str, floor_id: int
    ) -> Optional[Seat]:
        stmt = (
            select(Seat)
            .where(
                Seat.seat_code == seat_code,
                Seat.floor_id == floor_id,
                Seat.is_active == True,
            )
            .options(joinedload(Seat.floor).joinedload(Floor.building))
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def list_seats(
        self,
        db: AsyncSession,
        *,
        building_id: Optional[int] = None,
        floor_id: Optional[int] = None,
        status: Optional[str] = None,
        seat_type: Optional[str] = None,
    ) -> List[Seat]:
        stmt = (
            select(Seat)
            .join(Floor, Seat.floor_id == Floor.id)
            .where(Seat.is_active == True)
            .options(joinedload(Seat.floor).joinedload(Floor.building))
        )

        if building_id is not None:
            stmt = stmt.where(Floor.building_id == building_id)
        if floor_id is not None:
            stmt = stmt.where(Seat.floor_id == floor_id)
        if status is not None:
            stmt = stmt.where(Seat.status == status)
        if seat_type is not None:
            stmt = stmt.where(Seat.seat_type == seat_type)

        stmt = stmt.order_by(Floor.floor_number.asc(), Seat.seat_code.asc())
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def find_best_available_seat(
        self,
        db: AsyncSession,
        *,
        employee_id: int,
        building_id: Optional[int] = None,
        floor_id: Optional[int] = None,
        seat_type: Optional[str] = None,
    ) -> Optional[Seat]:
        # 1. Identify active projects for the employee
        active_projects_stmt = select(EmployeeProject.project_id).where(
            EmployeeProject.employee_id == employee_id,
            EmployeeProject.end_date == None,
        )
        project_ids = (await db.scalars(active_projects_stmt)).all()

        teammate_floor_ids = []
        if project_ids:
            # 2. Find floors where teammates of those projects are currently seated
            teammates_stmt = select(EmployeeProject.employee_id).where(
                EmployeeProject.project_id.in_(project_ids),
                EmployeeProject.employee_id != employee_id,
                EmployeeProject.end_date == None,
            )
            teammate_ids = (await db.scalars(teammates_stmt)).all()

            if teammate_ids:
                teammate_floors_stmt = (
                    select(Seat.floor_id)
                    .join(SeatAssignment, SeatAssignment.seat_id == Seat.id)
                    .where(
                        SeatAssignment.employee_id.in_(teammate_ids),
                        SeatAssignment.released_at == None,
                    )
                )
                teammate_floor_ids = list(set((await db.scalars(teammate_floors_stmt)).all()))

        # 3. Query the seats grid
        stmt = (
            select(Seat)
            .join(Floor, Seat.floor_id == Floor.id)
            .where(
                Seat.status == "available",
                Seat.is_active == True,
            )
            .options(joinedload(Seat.floor).joinedload(Floor.building))
        )

        if building_id is not None:
            stmt = stmt.where(Floor.building_id == building_id)
        if floor_id is not None:
            stmt = stmt.where(Seat.floor_id == floor_id)
        if seat_type is not None:
            stmt = stmt.where(Seat.seat_type == seat_type)

        # Ordering
        order_clauses = []
        if teammate_floor_ids:
            # Prefer seats on the same floor as project teammates
            order_clauses.append(
                case(
                    (Seat.floor_id.in_(teammate_floor_ids), 0),
                    else_=1,
                )
            )

        # Prefer lower floors, then seat_code ascending
        order_clauses.append(Floor.floor_number.asc())
        order_clauses.append(Seat.seat_code.asc())

        stmt = stmt.order_by(*order_clauses).limit(1)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def create(self, db: AsyncSession, obj_in: SeatCreate) -> Seat:
        db_obj = Seat(
            floor_id=obj_in.floor_id,
            seat_code=obj_in.seat_code,
            seat_type=obj_in.seat_type,
            status=obj_in.status,
            is_active=obj_in.is_active,
        )
        db.add(db_obj)
        await db.flush()
        return db_obj

    async def update(self, db: AsyncSession, db_obj: Seat, obj_in: SeatUpdate) -> Seat:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.flush()
        return db_obj

    async def soft_delete(self, db: AsyncSession, db_obj: Seat) -> Seat:
        db_obj.is_active = False
        db.add(db_obj)
        await db.flush()
        return db_obj

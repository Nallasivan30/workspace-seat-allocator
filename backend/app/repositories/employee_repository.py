from datetime import date
from typing import Optional, List, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.models.employee import Employee
from app.models.employee_project import EmployeeProject
from app.models.seat_assignment import SeatAssignment
from app.models.seat import Seat
from app.models.floor import Floor
from app.schemas.employee import EmployeeCreate, EmployeeUpdate


class EmployeeRepository:
    async def get_by_id(
        self, db: AsyncSession, employee_id: int, include_inactive: bool = False
    ) -> Optional[Employee]:
        stmt = select(Employee).where(Employee.id == employee_id)
        if not include_inactive:
            stmt = stmt.where(Employee.is_active == True)
        stmt = stmt.options(
            selectinload(Employee.reporting_manager),
            selectinload(Employee.projects).selectinload(EmployeeProject.project),
            selectinload(Employee.assignments)
            .selectinload(SeatAssignment.seat)
            .selectinload(Seat.floor)
            .selectinload(Floor.building),
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[Employee]:
        stmt = select(Employee).where(Employee.email == email, Employee.is_active == True)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_code(self, db: AsyncSession, code: str) -> Optional[Employee]:
        stmt = select(Employee).where(Employee.employee_code == code, Employee.is_active == True)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def list_employees(
        self,
        db: AsyncSession,
        *,
        q: Optional[str] = None,
        department: Optional[str] = None,
        status: Optional[str] = None,
        project_id: Optional[int] = None,
        has_seat: Optional[bool] = None,
        page: int = 1,
        page_size: int = 20,
        sort: Optional[str] = None,
    ) -> Tuple[List[Employee], int]:
        # Count query
        count_stmt = select(func.count(Employee.id)).where(Employee.is_active == True)
        # Main query
        stmt = select(Employee).where(Employee.is_active == True)

        # Filters
        filters = []
        if q:
            q_stripped = q.strip()
            if len(q_stripped) >= 2:
                search_filter = or_(
                    (Employee.first_name + " " + Employee.last_name).ilike(f"%{q_stripped}%"),
                    Employee.employee_code.ilike(f"%{q_stripped}%"),
                    Employee.email.ilike(f"%{q_stripped}%"),
                )
                filters.append(search_filter)

        if department:
            filters.append(Employee.department == department)
        if status:
            filters.append(Employee.status == status)
        if project_id is not None:
            filters.append(
                Employee.projects.any(
                    (EmployeeProject.project_id == project_id) & (EmployeeProject.end_date == None)
                )
            )
        if has_seat is not None:
            active_assignment_exists = select(SeatAssignment.id).where(
                SeatAssignment.employee_id == Employee.id,
                SeatAssignment.released_at == None,
            ).exists()
            if has_seat:
                filters.append(active_assignment_exists)
            else:
                filters.append(~active_assignment_exists)

        for f in filters:
            count_stmt = count_stmt.where(f)
            stmt = stmt.where(f)

        # Total count
        total = await db.scalar(count_stmt) or 0

        # Sort
        if sort:
            descending = sort.startswith("-")
            col_name = sort.lstrip("-")
            col = getattr(Employee, col_name, None)
            if col:
                stmt = stmt.order_by(col.desc() if descending else col.asc())
            else:
                stmt = stmt.order_by(Employee.id.desc())
        else:
            stmt = stmt.order_by(Employee.id.desc())

        # Pagination
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        # Eager load relationships needed for list view
        stmt = stmt.options(
            selectinload(Employee.reporting_manager),
            selectinload(Employee.assignments)
            .selectinload(SeatAssignment.seat)
            .selectinload(Seat.floor)
            .selectinload(Floor.building),
        )

        res = await db.execute(stmt)
        items = list(res.scalars().all())
        return items, total

    async def list_unassigned_employees(
        self,
        db: AsyncSession,
        *,
        department: Optional[str] = None,
    ) -> List[Employee]:
        # Unassigned means active employees with no active seat assignment
        active_assignment_exists = select(SeatAssignment.id).where(
            SeatAssignment.employee_id == Employee.id,
            SeatAssignment.released_at == None,
        ).exists()
        
        stmt = select(Employee).where(
            Employee.is_active == True,
            Employee.status == "active",
            ~active_assignment_exists
        )
        if department:
            stmt = stmt.where(Employee.department == department)
            
        stmt = stmt.order_by(Employee.first_name.asc(), Employee.last_name.asc())
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def create(self, db: AsyncSession, obj_in: EmployeeCreate) -> Employee:
        db_obj = Employee(
            employee_code=obj_in.employee_code,
            first_name=obj_in.first_name,
            last_name=obj_in.last_name,
            email=obj_in.email,
            department=obj_in.department,
            designation=obj_in.designation,
            status=obj_in.status,
            joining_date=obj_in.joining_date,
            exit_date=obj_in.exit_date,
            reporting_manager_id=obj_in.reporting_manager_id,
            is_active=obj_in.is_active,
        )
        db.add(db_obj)
        await db.flush()
        return db_obj

    async def update(self, db: AsyncSession, db_obj: Employee, obj_in: EmployeeUpdate) -> Employee:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.flush()
        return db_obj

    async def soft_delete(self, db: AsyncSession, db_obj: Employee) -> Employee:
        db_obj.is_active = False
        db_obj.status = "exited"
        db_obj.exit_date = date.today()
        db.add(db_obj)
        await db.flush()
        return db_obj

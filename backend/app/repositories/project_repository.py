from datetime import date
from typing import Optional, List, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.project import Project
from app.models.employee_project import EmployeeProject
from app.schemas.project import ProjectCreate, ProjectUpdate, EmployeeProjectCreate


class ProjectRepository:
    async def get_by_id(self, db: AsyncSession, project_id: int) -> Optional[Project]:
        stmt = (
            select(Project)
            .where(Project.id == project_id, Project.is_active == True)
            .options(
                selectinload(Project.employees).selectinload(EmployeeProject.employee)
            )
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_code(self, db: AsyncSession, code: str) -> Optional[Project]:
        stmt = select(Project).where(Project.project_code == code, Project.is_active == True)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def list_projects(
        self,
        db: AsyncSession,
        *,
        q: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
        sort: Optional[str] = None,
    ) -> Tuple[List[Project], int]:
        count_stmt = select(func.count(Project.id)).where(Project.is_active == True)
        stmt = select(Project).where(Project.is_active == True)

        filters = []
        if q:
            q_stripped = q.strip()
            if len(q_stripped) >= 2:
                search_filter = or_(
                    Project.name.ilike(f"%{q_stripped}%"),
                    Project.project_code.ilike(f"%{q_stripped}%"),
                    Project.client_name.ilike(f"%{q_stripped}%"),
                )
                filters.append(search_filter)

        if status:
            filters.append(Project.status == status)

        for f in filters:
            count_stmt = count_stmt.where(f)
            stmt = stmt.where(f)

        total = await db.scalar(count_stmt) or 0

        if sort:
            descending = sort.startswith("-")
            col_name = sort.lstrip("-")
            col = getattr(Project, col_name, None)
            if col:
                stmt = stmt.order_by(col.desc() if descending else col.asc())
            else:
                stmt = stmt.order_by(Project.id.desc())
        else:
            stmt = stmt.order_by(Project.id.desc())

        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        res = await db.execute(stmt)
        items = list(res.scalars().all())
        return items, total

    async def create(self, db: AsyncSession, obj_in: ProjectCreate) -> Project:
        db_obj = Project(
            project_code=obj_in.project_code,
            name=obj_in.name,
            client_name=obj_in.client_name,
            status=obj_in.status,
            start_date=obj_in.start_date,
            end_date=obj_in.end_date,
            is_active=obj_in.is_active,
        )
        db.add(db_obj)
        await db.flush()
        return db_obj

    async def update(self, db: AsyncSession, db_obj: Project, obj_in: ProjectUpdate) -> Project:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.flush()
        return db_obj

    async def soft_delete(self, db: AsyncSession, db_obj: Project) -> Project:
        db_obj.is_active = False
        db_obj.status = "closed"
        db_obj.end_date = date.today()
        db.add(db_obj)
        await db.flush()
        return db_obj

    # Employee-Project Mapping Methods
    async def get_mapping(
        self, db: AsyncSession, *, employee_id: int, project_id: int
    ) -> Optional[EmployeeProject]:
        stmt = select(EmployeeProject).where(
            EmployeeProject.employee_id == employee_id,
            EmployeeProject.project_id == project_id,
            EmployeeProject.end_date == None,
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_active_mappings_for_employee(
        self, db: AsyncSession, employee_id: int
    ) -> List[EmployeeProject]:
        stmt = (
            select(EmployeeProject)
            .where(
                EmployeeProject.employee_id == employee_id,
                EmployeeProject.end_date == None,
            )
            .options(selectinload(EmployeeProject.project))
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def add_employee(
        self, db: AsyncSession, obj_in: EmployeeProjectCreate
    ) -> EmployeeProject:
        db_obj = EmployeeProject(
            employee_id=obj_in.employee_id,
            project_id=obj_in.project_id,
            role_on_project=obj_in.role_on_project,
            allocation_percent=obj_in.allocation_percent,
            start_date=obj_in.start_date,
            end_date=obj_in.end_date,
        )
        db.add(db_obj)
        await db.flush()
        return db_obj

    async def close_all_mappings_for_employee(self, db: AsyncSession, employee_id: int) -> None:
        stmt = select(EmployeeProject).where(
            EmployeeProject.employee_id == employee_id,
            EmployeeProject.end_date == None,
        )
        res = await db.execute(stmt)
        mappings = res.scalars().all()
        today = date.today()
        for m in mappings:
            m.end_date = today
            db.add(m)
        await db.flush()

    async def close_all_mappings_for_project(self, db: AsyncSession, project_id: int) -> None:
        stmt = select(EmployeeProject).where(
            EmployeeProject.project_id == project_id,
            EmployeeProject.end_date == None,
        )
        res = await db.execute(stmt)
        mappings = res.scalars().all()
        today = date.today()
        for m in mappings:
            m.end_date = today
            db.add(m)
        await db.flush()

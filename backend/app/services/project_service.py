from typing import List, Optional, Tuple
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.project_repository import ProjectRepository
from app.repositories.employee_repository import EmployeeRepository
from app.schemas.project import ProjectCreate, ProjectUpdate, EmployeeProjectCreate
from app.models.project import Project
from app.models.employee_project import EmployeeProject


class ProjectService:
    def __init__(self):
        self.project_repo = ProjectRepository()
        self.employee_repo = EmployeeRepository()

    async def get_project(self, db: AsyncSession, project_id: int) -> Project:
        project = await self.project_repo.get_by_id(db, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return project

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
        return await self.project_repo.list_projects(
            db, q=q, status=status, page=page, page_size=page_size, sort=sort
        )

    async def create_project(self, db: AsyncSession, obj_in: ProjectCreate) -> Project:
        existing = await self.project_repo.get_by_code(db, obj_in.project_code)
        if existing:
            raise HTTPException(status_code=400, detail="Project code already exists")
        try:
            project = await self.project_repo.create(db, obj_in)
            await db.commit()
            return await self.project_repo.get_by_id(db, project.id)
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create project: {str(e)}")

    async def update_project(
        self, db: AsyncSession, project_id: int, obj_in: ProjectUpdate
    ) -> Project:
        project = await self.project_repo.get_by_id(db, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        if obj_in.project_code is not None and obj_in.project_code != project.project_code:
            existing = await self.project_repo.get_by_code(db, obj_in.project_code)
            if existing:
                raise HTTPException(status_code=400, detail="Project code already exists")

        try:
            project = await self.project_repo.update(db, project, obj_in)
            await db.commit()
            return await self.project_repo.get_by_id(db, project.id)
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to update project: {str(e)}")

    async def delete_project(self, db: AsyncSession, project_id: int) -> None:
        project = await self.project_repo.get_by_id(db, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        try:
            # 1. Close all active employee mappings for the project
            await self.project_repo.close_all_mappings_for_project(db, project_id)
            # 2. Soft delete project
            await self.project_repo.soft_delete(db, project)
            await db.commit()
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to delete project: {str(e)}")

    # Employee-Project mapping logic
    async def add_employee_to_project(
        self, db: AsyncSession, obj_in: EmployeeProjectCreate
    ) -> EmployeeProject:
        # Validate employee
        employee = await self.employee_repo.get_by_id(db, obj_in.employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")

        # Validate project
        project = await self.project_repo.get_by_id(db, obj_in.project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Check existing mapping
        existing = await self.project_repo.get_mapping(
            db, employee_id=obj_in.employee_id, project_id=obj_in.project_id
        )
        if existing:
            raise HTTPException(status_code=400, detail="Employee is already actively assigned to this project")

        try:
            mapping = await self.project_repo.add_employee(db, obj_in)
            await db.commit()
            # Return fresh mapped object
            stmt = select(EmployeeProject).where(EmployeeProject.id == mapping.id)
            res = await db.execute(stmt)
            return res.scalar_one()
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to assign employee to project: {str(e)}")

    async def remove_employee_from_project(
        self, db: AsyncSession, *, employee_id: int, project_id: int
    ) -> None:
        mapping = await self.project_repo.get_mapping(
            db, employee_id=employee_id, project_id=project_id
        )
        if not mapping:
            raise HTTPException(status_code=404, detail="Active project mapping not found")

        try:
            import datetime
            mapping.end_date = datetime.date.today()
            db.add(mapping)
            await db.commit()
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to remove employee from project: {str(e)}")

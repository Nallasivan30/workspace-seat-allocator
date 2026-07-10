from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, require_viewer, require_admin
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectRead,
    ProjectDetailRead,
    ProjectEmployeeAssignRequest,
    EmployeeProjectCreate,
    EmployeeProjectRead,
)
from app.schemas.common import Page
from app.services.project_service import ProjectService

router = APIRouter()
project_service = ProjectService()


@router.get("", response_model=Page[ProjectRead])
async def list_projects(
    q: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    sort: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_viewer),
):
    items, total = await project_service.list_projects(
        db, q=q, status=status, page=page, page_size=page_size, sort=sort
    )
    pages = (total + page_size - 1) // page_size if total > 0 else 0
    return Page[ProjectRead](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{id}", response_model=ProjectDetailRead)
async def get_project(
    id: int,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_viewer),
):
    return await project_service.get_project(db, id)


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_admin),
):
    return await project_service.create_project(db, data)


@router.patch("/{id}", response_model=ProjectRead)
async def update_project(
    id: int,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_admin),
):
    return await project_service.update_project(db, id, data)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    id: int,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_admin),
):
    await project_service.delete_project(db, id)


@router.post("/{id}/employees", response_model=EmployeeProjectRead, status_code=status.HTTP_201_CREATED)
async def assign_employee_to_project(
    id: int,
    data: ProjectEmployeeAssignRequest,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_admin),
):
    create_schema = EmployeeProjectCreate(
        employee_id=data.employee_id,
        project_id=id,
        role_on_project=data.role_on_project,
        allocation_percent=data.allocation_percent,
        start_date=data.start_date,
        end_date=data.end_date,
    )
    mapping = await project_service.add_employee_to_project(db, create_schema)
    
    # Calculate sum of active allocations to see if it exceeds 100%
    active_mappings = await project_service.project_repo.get_active_mappings_for_employee(db, data.employee_id)
    total_allocation = sum(m.allocation_percent for m in active_mappings)
    
    warning = None
    if total_allocation > 100:
        warning = f"Total project allocation for employee exceeds 100% (currently {total_allocation}%)."
    
    mapping.warning = warning
    return mapping


@router.delete("/{id}/employees/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_employee_from_project(
    id: int,
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_admin),
):
    await project_service.remove_employee_from_project(db, employee_id=employee_id, project_id=id)

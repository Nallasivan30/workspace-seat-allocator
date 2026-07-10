from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, require_viewer, require_admin
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeRead, EmployeeDetailRead
from app.schemas.common import Page
from app.services.employee_service import EmployeeService

router = APIRouter()
employee_service = EmployeeService()


@router.get("", response_model=Page[EmployeeRead])
async def list_employees(
    q: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    project_id: Optional[int] = None,
    has_seat: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20,
    sort: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_viewer),
):
    items, total = await employee_service.list_employees(
        db,
        q=q,
        department=department,
        status=status,
        project_id=project_id,
        has_seat=has_seat,
        page=page,
        page_size=page_size,
        sort=sort,
    )
    pages = (total + page_size - 1) // page_size if total > 0 else 0
    return Page[EmployeeRead](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/unassigned", response_model=List[EmployeeRead])
async def list_unassigned_employees(
    department: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_viewer),
):
    return await employee_service.list_unassigned_employees(db, department=department)


@router.get("/{id}", response_model=EmployeeDetailRead)
async def get_employee(
    id: int,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_viewer),
):
    return await employee_service.get_employee(db, id)


@router.post("", response_model=EmployeeRead, status_code=status.HTTP_201_CREATED)
async def create_employee(
    data: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_admin),
):
    return await employee_service.create_employee(db, data)


@router.patch("/{id}", response_model=EmployeeRead)
async def update_employee(
    id: int,
    data: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_admin),
):
    return await employee_service.update_employee(db, id, data)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    id: int,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_admin),
):
    await employee_service.delete_employee(db, id)

from typing import Optional, List, Tuple
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.employee_repository import EmployeeRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.seat_assignment_repository import SeatAssignmentRepository
from app.services.seat_allocation_service import SeatAllocationService
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.schemas.seat_assignment import SeatReleaseCreate
from app.models.employee import Employee


class EmployeeService:
    def __init__(self):
        self.employee_repo = EmployeeRepository()
        self.project_repo = ProjectRepository()
        self.assignment_repo = SeatAssignmentRepository()
        self.allocation_service = SeatAllocationService()

    async def get_employee(self, db: AsyncSession, employee_id: int) -> Employee:
        employee = await self.employee_repo.get_by_id(db, employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        return employee

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
        return await self.employee_repo.list_employees(
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

    async def list_unassigned_employees(
        self,
        db: AsyncSession,
        *,
        department: Optional[str] = None,
    ) -> List[Employee]:
        return await self.employee_repo.list_unassigned_employees(db, department=department)

    async def create_employee(self, db: AsyncSession, obj_in: EmployeeCreate) -> Employee:
        # Check duplicate code
        existing = await self.employee_repo.get_by_code(db, obj_in.employee_code)
        if existing:
            raise HTTPException(status_code=400, detail="Employee code already exists")
        
        # Check duplicate email
        existing_email = await self.employee_repo.get_by_email(db, obj_in.email)
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already exists")

        # Validate manager
        if obj_in.reporting_manager_id:
            manager = await self.employee_repo.get_by_id(db, obj_in.reporting_manager_id)
            if not manager:
                raise HTTPException(status_code=400, detail="Reporting manager not found")

        try:
            employee = await self.employee_repo.create(db, obj_in)
            await db.commit()
            return await self.employee_repo.get_by_id(db, employee.id)
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create employee: {str(e)}")

    async def update_employee(
        self, db: AsyncSession, employee_id: int, obj_in: EmployeeUpdate
    ) -> Employee:
        employee = await self.employee_repo.get_by_id(db, employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")

        # Validate manager if updated
        if obj_in.reporting_manager_id is not None:
            if obj_in.reporting_manager_id == employee_id:
                raise HTTPException(status_code=400, detail="An employee cannot report to themselves")
            manager = await self.employee_repo.get_by_id(db, obj_in.reporting_manager_id)
            if not manager:
                raise HTTPException(status_code=400, detail="Reporting manager not found")

        # Check code / email if they are changed
        if obj_in.employee_code is not None and obj_in.employee_code != employee.employee_code:
            existing = await self.employee_repo.get_by_code(db, obj_in.employee_code)
            if existing:
                raise HTTPException(status_code=400, detail="Employee code already exists")

        if obj_in.email is not None and obj_in.email != employee.email:
            existing_email = await self.employee_repo.get_by_email(db, obj_in.email)
            if existing_email:
                raise HTTPException(status_code=400, detail="Email already exists")

        # Handle cascading for deactivation if status is changed to "exited" or is_active is set to False
        is_exiting = False
        if obj_in.is_active is False or (obj_in.status is not None and obj_in.status == "exited"):
            is_exiting = True

        try:
            if is_exiting:
                # 1. Release seat
                active_assign = await self.assignment_repo.get_active_for_employee(db, employee_id)
                if active_assign:
                    await self.allocation_service.release(
                        db,
                        active_assign.id,
                        SeatReleaseCreate(
                            released_by="system",
                            reason="resigned" if obj_in.status == "exited" else "other",
                            notes="Auto-released due to employee deactivation/exit.",
                        ),
                    )
                # 2. Close active project mappings
                await self.project_repo.close_all_mappings_for_employee(db, employee_id)

            employee = await self.employee_repo.update(db, employee, obj_in)
            await db.commit()
            return await self.employee_repo.get_by_id(db, employee.id, include_inactive=True)
        except HTTPException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to update employee: {str(e)}")

    async def delete_employee(self, db: AsyncSession, employee_id: int) -> None:
        employee = await self.employee_repo.get_by_id(db, employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")

        try:
            # 1. Auto-release active seat
            active_assign = await self.assignment_repo.get_active_for_employee(db, employee_id)
            if active_assign:
                await self.allocation_service.release(
                    db,
                    active_assign.id,
                    SeatReleaseCreate(
                        released_by="system",
                        reason="other",
                        notes="Auto-released due to employee soft delete.",
                    ),
                )
            
            # 2. Close active project mappings
            await self.project_repo.close_all_mappings_for_employee(db, employee_id)

            # 3. Soft delete employee
            await self.employee_repo.soft_delete(db, employee)
            await db.commit()
        except HTTPException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to delete employee: {str(e)}")

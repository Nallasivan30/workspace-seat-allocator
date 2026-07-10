from datetime import datetime
from typing import Optional
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.repositories.seat_repository import SeatRepository
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.seat_assignment_repository import SeatAssignmentRepository
from app.schemas.seat_assignment import SeatAssignmentCreate, SeatReleaseCreate
from app.schemas.seat import SeatUpdate
from app.models.seat_assignment import SeatAssignment


class SeatAllocationService:
    def __init__(self):
        self.seat_repo = SeatRepository()
        self.employee_repo = EmployeeRepository()
        self.assignment_repo = SeatAssignmentRepository()

    async def allocate(
        self, db: AsyncSession, obj_in: SeatAssignmentCreate, assigned_by_user_id: Optional[int] = None
    ) -> SeatAssignment:
        # 1. Load employee & validate status
        employee = await self.employee_repo.get_by_id(db, obj_in.employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        if employee.status != "active":
            raise HTTPException(status_code=400, detail="EMPLOYEE_INACTIVE")

        # 2. Load seat & validate suitability
        seat = await self.seat_repo.get_by_id(db, obj_in.seat_id)
        if not seat:
            raise HTTPException(status_code=404, detail="Seat not found")
        if not seat.is_active:
            raise HTTPException(status_code=400, detail="SEAT_INACTIVE")
        if seat.status == "maintenance":
            raise HTTPException(status_code=400, detail="SEAT_IN_MAINTENANCE")

        # 3. Check for pre-existing occupant on this seat
        active_seat_assign = await self.assignment_repo.get_active_for_seat(db, obj_in.seat_id)
        if active_seat_assign:
            raise HTTPException(status_code=409, detail="SEAT_ALREADY_OCCUPIED")

        # 4. Check if employee already has an active assignment
        active_emp_assign = await self.assignment_repo.get_active_for_employee(db, obj_in.employee_id)
        if active_emp_assign:
            raise HTTPException(status_code=409, detail="EMPLOYEE_ALREADY_SEATED")

        # 5. Create assignment and update seat status cache within a transaction block
        try:
            assignment = await self.assignment_repo.create(db, obj_in, assigned_by_user_id=assigned_by_user_id)
            await self.seat_repo.update(db, seat, SeatUpdate(status="occupied"))
            await db.commit()
            
            # Refresh to load relationships
            return await self.assignment_repo.get_by_id(db, assignment.id)
        except IntegrityError as e:
            await db.rollback()
            err_msg = str(e.orig).lower()
            if "uq_active_seat" in err_msg or "seat_id" in err_msg:
                raise HTTPException(status_code=409, detail="SEAT_ALREADY_OCCUPIED")
            elif "uq_active_employee" in err_msg or "employee_id" in err_msg:
                raise HTTPException(status_code=409, detail="EMPLOYEE_ALREADY_SEATED")
            else:
                raise HTTPException(status_code=409, detail="ALLOCATION_CONFLICT")

    async def auto_allocate(
        self,
        db: AsyncSession,
        *,
        employee_id: int,
        building_id: Optional[int] = None,
        floor_id: Optional[int] = None,
        seat_type: Optional[str] = None,
        assigned_by_user_id: Optional[int] = None,
    ) -> SeatAssignment:
        # Validate employee first
        employee = await self.employee_repo.get_by_id(db, employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        if employee.status != "active":
            raise HTTPException(status_code=400, detail="EMPLOYEE_INACTIVE")

        # Check if already seated
        active_assign = await self.assignment_repo.get_active_for_employee(db, employee_id)
        if active_assign:
            raise HTTPException(status_code=400, detail="EMPLOYEE_ALREADY_SEATED")

        # Find best available seat
        seat = await self.seat_repo.find_best_available_seat(
            db,
            employee_id=employee_id,
            building_id=building_id,
            floor_id=floor_id,
            seat_type=seat_type,
        )

        if not seat:
            # Build helpful suggestions in error response
            suggestions = "Try choosing a different building, floor, or seat type filter."
            raise HTTPException(
                status_code=409,
                detail={
                    "error_code": "NO_AVAILABLE_SEATS",
                    "message": "No suitable seat found matching the filters.",
                    "suggestions": suggestions,
                },
            )

        # Allocate using standard allocate logic
        return await self.allocate(
            db,
            SeatAssignmentCreate(employee_id=employee_id, seat_id=seat.id),
            assigned_by_user_id=assigned_by_user_id,
        )

    async def release(
        self, db: AsyncSession, assignment_id: int, obj_in: SeatReleaseCreate
    ) -> None:
        # 1. Load assignment
        assignment = await self.assignment_repo.get_by_id(db, assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        if assignment.released_at is not None:
            raise HTTPException(status_code=409, detail="ALREADY_RELEASED")

        # 2. Load seat
        seat = await self.seat_repo.get_by_id(db, assignment.seat_id)
        if not seat:
            raise HTTPException(status_code=404, detail="Seat not found")

        # 3. Release and update seat status cache
        try:
            await self.assignment_repo.release(db, assignment, obj_in)
            await self.seat_repo.update(db, seat, SeatUpdate(status="available"))
            await db.commit()
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to release seat: {str(e)}")

    async def release_by_employee(
        self, db: AsyncSession, employee_id: int, obj_in: SeatReleaseCreate
    ) -> None:
        assignment = await self.assignment_repo.get_active_for_employee(db, employee_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="No active seat assignment found for this employee.")
        await self.release(db, assignment.id, obj_in)

from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, require_viewer, require_admin, get_current_user
from app.schemas.user import UserRead
from app.schemas.seat_assignment import (
    SeatAssignmentCreate,
    SeatAssignmentRead,
    SeatAssignmentRelease,
    SeatReleaseCreate,
    SeatAutoAllocateRequest,
)
from app.services.seat_allocation_service import SeatAllocationService

router = APIRouter()
allocation_service = SeatAllocationService()


@router.get("", response_model=List[SeatAssignmentRead])
async def list_assignments(
    employee_id: Optional[int] = None,
    seat_id: Optional[int] = None,
    status: Optional[str] = None,
    active_only: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_viewer),
):
    # Map active_only / status
    if status is None:
        if active_only is False:
            status = None
        else:
            status = "active"
            
    return await allocation_service.assignment_repo.list_assignments(
        db, employee_id=employee_id, seat_id=seat_id, status=status
    )


@router.post("", response_model=SeatAssignmentRead, status_code=status.HTTP_201_CREATED)
async def allocate_seat(
    data: SeatAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserRead = Depends(get_current_user),
    user_payload: dict = Depends(require_admin),
):
    return await allocation_service.allocate(db, data, assigned_by_user_id=current_user.id)


@router.post("/auto-allocate", response_model=SeatAssignmentRead, status_code=status.HTTP_201_CREATED)
async def auto_allocate_seat(
    data: SeatAutoAllocateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserRead = Depends(get_current_user),
    user_payload: dict = Depends(require_admin),
):
    return await allocation_service.auto_allocate(
        db,
        employee_id=data.employee_id,
        building_id=data.building_id,
        floor_id=data.floor_id,
        seat_type=data.seat_type,
        assigned_by_user_id=current_user.id,
    )


@router.post("/{id}/release", response_model=dict)
async def release_seat(
    id: int,
    data: SeatAssignmentRelease,
    db: AsyncSession = Depends(get_db),
    current_user: UserRead = Depends(get_current_user),
    user_payload: dict = Depends(require_admin),
):
    release_in = SeatReleaseCreate(
        released_by_user_id=current_user.id,
        reason=data.reason,
        notes=data.notes,
    )
    await allocation_service.release(db, id, release_in)
    return {"status": "success", "message": "Seat allocation released successfully"}

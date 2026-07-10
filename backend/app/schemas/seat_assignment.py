from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class SeatAssignmentBase(BaseModel):
    seat_id: int
    employee_id: int
    notes: Optional[str] = None

class SeatAssignmentCreate(SeatAssignmentBase):
    pass

from app.schemas.common import EmployeeMinRead

class SeatAssignmentRead(SeatAssignmentBase):
    id: int
    assigned_at: datetime
    released_at: Optional[datetime] = None
    assigned_by_user_id: Optional[int] = None
    
    # Nested & dynamic fields
    employee: Optional[EmployeeMinRead] = None
    seat_code: Optional[str] = None
    building_name: Optional[str] = None
    floor_number: Optional[int] = None
    allocated_at: Optional[datetime] = None
    release_reason: Optional[str] = None
    release_notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SeatAssignmentRelease(BaseModel):
    reason: str
    notes: Optional[str] = None

class SeatReleaseCreate(BaseModel):
    released_by_user_id: Optional[int] = None
    reason: str
    notes: Optional[str] = None

class SeatAutoAllocateRequest(BaseModel):
    employee_id: int
    building_id: Optional[int] = None
    floor_id: Optional[int] = None
    seat_type: Optional[str] = None

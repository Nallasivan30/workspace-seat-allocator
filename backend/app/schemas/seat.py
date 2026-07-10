from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.floor import FloorRead
from app.schemas.building import BuildingRead
from app.schemas.common import EmployeeMinRead

class SeatBase(BaseModel):
    floor_id: int
    seat_code: str = Field(..., max_length=30)
    seat_type: str = Field("standard", max_length=20)  # standard / workstation / cabin / hotdesk
    status: str = Field("available", max_length=20)  # available / occupied / reserved / maintenance
    is_active: bool = True

class SeatCreate(SeatBase):
    pass

class SeatUpdate(BaseModel):
    floor_id: Optional[int] = None
    seat_code: Optional[str] = Field(None, max_length=30)
    seat_type: Optional[str] = Field(None, max_length=20)
    status: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None

class SeatRead(SeatBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SeatWithLocationRead(SeatRead):
    floor: FloorRead
    building: BuildingRead

    model_config = ConfigDict(from_attributes=True)

class SeatAssignmentMinRead(BaseModel):
    id: int
    assigned_at: datetime
    released_at: Optional[datetime] = None
    employee: EmployeeMinRead

    model_config = ConfigDict(from_attributes=True)

class SeatDetailRead(SeatWithLocationRead):
    current_assignment: Optional[SeatAssignmentMinRead] = None
    assignments: List[SeatAssignmentMinRead] = []

    model_config = ConfigDict(from_attributes=True)

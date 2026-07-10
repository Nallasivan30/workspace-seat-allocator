from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class FloorBase(BaseModel):
    building_id: int
    floor_number: int
    name: Optional[str] = Field(None, max_length=100)
    is_active: bool = True

class FloorCreate(FloorBase):
    pass

class FloorUpdate(BaseModel):
    building_id: Optional[int] = None
    floor_number: Optional[int] = None
    name: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None

class FloorRead(FloorBase):
    id: int
    total_seats: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

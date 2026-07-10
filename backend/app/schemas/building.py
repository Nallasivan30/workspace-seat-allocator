from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class BuildingBase(BaseModel):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=20, pattern=r"^[A-Z0-9-]+$")
    address: Optional[str] = None
    is_active: bool = True

class BuildingCreate(BuildingBase):
    pass

class BuildingUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    code: Optional[str] = Field(None, max_length=20, pattern=r"^[A-Z0-9-]+$")
    address: Optional[str] = None
    is_active: Optional[bool] = None

class BuildingRead(BuildingBase):
    id: int
    total_floors: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

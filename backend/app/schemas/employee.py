from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from app.schemas.project import EmployeeProjectWithProjectRead
from app.schemas.seat import SeatWithLocationRead

class EmployeeBase(BaseModel):
    employee_code: str = Field(..., max_length=20)
    first_name: str = Field(..., max_length=80)
    last_name: str = Field(..., max_length=80)
    email: EmailStr
    department: str = Field(..., max_length=80)
    designation: str = Field(..., max_length=80)
    status: str = Field("active", max_length=20)  # active / on_leave / exited
    joining_date: date
    exit_date: Optional[date] = None
    reporting_manager_id: Optional[int] = None
    is_active: bool = True

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    employee_code: Optional[str] = Field(None, max_length=20)
    first_name: Optional[str] = Field(None, max_length=80)
    last_name: Optional[str] = Field(None, max_length=80)
    email: Optional[EmailStr] = None
    department: Optional[str] = Field(None, max_length=80)
    designation: Optional[str] = Field(None, max_length=80)
    status: Optional[str] = Field(None, max_length=20)
    joining_date: Optional[date] = None
    exit_date: Optional[date] = None
    reporting_manager_id: Optional[int] = None
    is_active: Optional[bool] = None

from app.schemas.common import EmployeeMinRead

class EmployeeRead(EmployeeBase):
    id: int
    created_at: datetime
    updated_at: datetime
    reporting_manager: Optional[EmployeeMinRead] = None

    model_config = ConfigDict(from_attributes=True)

class EmployeeDetailRead(EmployeeRead):
    projects: List[EmployeeProjectWithProjectRead] = []
    current_seat: Optional[SeatWithLocationRead] = None

    model_config = ConfigDict(from_attributes=True)

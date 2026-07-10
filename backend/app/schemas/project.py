from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.common import EmployeeMinRead

class ProjectBase(BaseModel):
    project_code: str = Field(..., max_length=30)
    name: str = Field(..., max_length=150)
    client_name: Optional[str] = Field(None, max_length=150)
    status: str = Field("active", max_length=20)  # active / on_hold / closed
    start_date: date
    end_date: Optional[date] = None
    is_active: bool = True

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    project_code: Optional[str] = Field(None, max_length=30)
    name: Optional[str] = Field(None, max_length=150)
    client_name: Optional[str] = Field(None, max_length=150)
    status: Optional[str] = Field(None, max_length=20)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None

class ProjectRead(ProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class EmployeeProjectBase(BaseModel):
    employee_id: int
    project_id: int
    role_on_project: str = Field(..., max_length=80)
    allocation_percent: int = Field(100, ge=1, le=100)
    start_date: date
    end_date: Optional[date] = None

class ProjectEmployeeAssignRequest(BaseModel):
    employee_id: int
    role_on_project: str = Field(..., max_length=80)
    allocation_percent: int = Field(100, ge=1, le=100)
    start_date: date
    end_date: Optional[date] = None

class EmployeeProjectCreate(EmployeeProjectBase):
    pass

class EmployeeProjectUpdate(BaseModel):
    role_on_project: Optional[str] = Field(None, max_length=80)
    allocation_percent: Optional[int] = Field(None, ge=1, le=100)
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class EmployeeProjectRead(EmployeeProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime
    warning: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class EmployeeProjectWithProjectRead(EmployeeProjectRead):
    project: ProjectRead

    model_config = ConfigDict(from_attributes=True)

class EmployeeProjectWithEmployeeRead(EmployeeProjectRead):
    employee: EmployeeMinRead

    model_config = ConfigDict(from_attributes=True)

class ProjectDetailRead(ProjectRead):
    employees: List[EmployeeProjectWithEmployeeRead] = []

    model_config = ConfigDict(from_attributes=True)

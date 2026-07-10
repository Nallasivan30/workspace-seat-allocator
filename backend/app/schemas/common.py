from typing import Generic, List, TypeVar
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")

class Page(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int

class ErrorResponse(BaseModel):
    detail: str

class EmployeeMinRead(BaseModel):
    id: int
    employee_code: str
    first_name: str
    last_name: str
    email: str
    department: str
    designation: str

    model_config = ConfigDict(from_attributes=True)

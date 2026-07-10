import pytest
from datetime import date
from sqlalchemy import select
from fastapi import HTTPException

from app.services.employee_service import EmployeeService
from app.services.seat_allocation_service import SeatAllocationService
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.schemas.seat_assignment import SeatAssignmentCreate
from app.models.employee import Employee
from app.models.employee_project import EmployeeProject
from app.models.seat_assignment import SeatAssignment
from app.models.building import Building
from app.models.floor import Floor
from app.models.seat import Seat
from app.models.project import Project


@pytest.mark.asyncio
async def test_create_employee_success(db):
    service = EmployeeService()
    emp_in = EmployeeCreate(
        employee_code="EMP101",
        first_name="Jane",
        last_name="Doe",
        email="jane.doe@example.com",
        department="Engineering",
        designation="Software Engineer",
        joining_date=date.today(),
        status="active"
    )
    emp = await service.create_employee(db, emp_in)
    assert emp.employee_code == "EMP101"
    assert emp.email == "jane.doe@example.com"
    assert emp.is_active is True


@pytest.mark.asyncio
async def test_create_employee_duplicate_code(db):
    service = EmployeeService()
    emp_in = EmployeeCreate(
        employee_code="EMP101",
        first_name="Jane",
        last_name="Doe",
        email="jane.doe@example.com",
        department="Engineering",
        designation="Software Engineer",
        joining_date=date.today(),
        status="active"
    )
    await service.create_employee(db, emp_in)

    # Try creating another with same code
    emp_in2 = EmployeeCreate(
        employee_code="EMP101",
        first_name="John",
        last_name="Smith",
        email="john.smith@example.com",
        department="Engineering",
        designation="Architect",
        joining_date=date.today(),
        status="active"
    )
    with pytest.raises(HTTPException) as exc_info:
        await service.create_employee(db, emp_in2)
    assert exc_info.value.status_code == 400
    assert "Employee code already exists" in exc_info.value.detail


@pytest.mark.asyncio
async def test_employee_deactivation_cascade(db):
    employee_service = EmployeeService()
    allocation_service = SeatAllocationService()

    # 1. Create a Building, Floor, and Seat
    building = Building(name="HQ", code="HQ", address="123 Main St")
    db.add(building)
    await db.flush()

    floor = Floor(building_id=building.id, floor_number=1, name="First Floor")
    db.add(floor)
    await db.flush()

    seat = Seat(floor_id=floor.id, seat_code="1A", seat_type="desk")
    db.add(seat)
    await db.flush()

    # 2. Create a Project
    project = Project(
        project_code="PRJ001",
        name="Phoenix Project",
        client_name="Acme Corp",
        status="active",
        start_date=date.today()
    )
    db.add(project)
    await db.flush()

    # 3. Create Employee
    emp_in = EmployeeCreate(
        employee_code="EMP202",
        first_name="Alice",
        last_name="Wonder",
        email="alice@example.com",
        department="Design",
        designation="UX Designer",
        joining_date=date.today(),
        status="active"
    )
    employee = await employee_service.create_employee(db, emp_in)

    # 4. Allocate Seat to Employee
    assignment = await allocation_service.allocate(
        db,
        SeatAssignmentCreate(seat_id=seat.id, employee_id=employee.id),
        assigned_by_user_id=None
    )
    assert assignment.released_at is None

    # 5. Assign Employee to Project
    employee_project = EmployeeProject(
        employee_id=employee.id,
        project_id=project.id,
        allocation_percent=100,
        start_date=date.today(),
        role_on_project="Developer"
    )
    db.add(employee_project)
    await db.flush()

    # 6. Deactivate Employee
    update_in = EmployeeUpdate(is_active=False)
    updated_emp = await employee_service.update_employee(db, employee.id, update_in)
    assert updated_emp.is_active is False

    # 7. Check seat is released
    stmt_assign = select(SeatAssignment).where(SeatAssignment.id == assignment.id)
    res_assign = await db.execute(stmt_assign)
    assign_check = res_assign.scalar_one()
    assert assign_check.released_at is not None

    # 8. Check project mapping is closed
    stmt_proj = select(EmployeeProject).where(
        EmployeeProject.employee_id == employee.id,
        EmployeeProject.project_id == project.id
    )
    res_proj = await db.execute(stmt_proj)
    proj_check = res_proj.scalar_one()
    assert proj_check.end_date is not None

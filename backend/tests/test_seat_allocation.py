import pytest
from datetime import date, datetime
from fastapi import HTTPException
from sqlalchemy import select

from app.services.employee_service import EmployeeService
from app.services.seat_allocation_service import SeatAllocationService
from app.services.project_service import ProjectService
from app.schemas.employee import EmployeeCreate
from app.schemas.seat_assignment import SeatAssignmentCreate, SeatReleaseCreate
from app.schemas.project import EmployeeProjectCreate
from app.models.employee import Employee
from app.models.employee_project import EmployeeProject
from app.models.seat_assignment import SeatAssignment
from app.models.seat_release_log import SeatReleaseLog
from app.models.building import Building
from app.models.floor import Floor
from app.models.seat import Seat
from app.models.project import Project


@pytest.mark.asyncio
async def test_seat_allocation_success(db):
    employee_service = EmployeeService()
    allocation_service = SeatAllocationService()

    # Create building, floor, seat, employee
    building = Building(name="Engineering Wing", code="EW", address="Tech Park")
    db.add(building)
    await db.flush()

    floor = Floor(building_id=building.id, floor_number=1, name="First Floor")
    db.add(floor)
    await db.flush()

    seat = Seat(floor_id=floor.id, seat_code="SEAT-01", seat_type="desk")
    db.add(seat)
    await db.flush()

    emp_in = EmployeeCreate(
        employee_code="EMP901",
        first_name="Bob",
        last_name="Builder",
        email="bob@example.com",
        department="Engineering",
        designation="Software Engineer",
        joining_date=date.today(),
        status="active"
    )
    employee = await employee_service.create_employee(db, emp_in)

    # Allocate seat
    assignment = await allocation_service.allocate(
        db,
        SeatAssignmentCreate(seat_id=seat.id, employee_id=employee.id),
        assigned_by_user_id=None
    )

    assert assignment.employee_id == employee.id
    assert assignment.seat_id == seat.id
    assert assignment.released_at is None

    # Check that seat status cache updated to occupied
    await db.refresh(seat)
    assert seat.status == "occupied"


@pytest.mark.asyncio
async def test_seat_already_occupied_rejection(db):
    employee_service = EmployeeService()
    allocation_service = SeatAllocationService()

    building = Building(name="HQ", code="HQ", address="HQ Address")
    db.add(building)
    await db.flush()

    floor = Floor(building_id=building.id, floor_number=1, name="Floor 1")
    db.add(floor)
    await db.flush()

    seat = Seat(floor_id=floor.id, seat_code="SEAT-02", seat_type="desk")
    db.add(seat)
    await db.flush()

    # Create employee 1
    emp1_in = EmployeeCreate(
        employee_code="EMP902",
        first_name="User",
        last_name="One",
        email="user1@example.com",
        department="Engineering",
        designation="Developer",
        joining_date=date.today(),
        status="active"
    )
    emp1 = await employee_service.create_employee(db, emp1_in)

    # Create employee 2
    emp2_in = EmployeeCreate(
        employee_code="EMP903",
        first_name="User",
        last_name="Two",
        email="user2@example.com",
        department="Engineering",
        designation="Developer",
        joining_date=date.today(),
        status="active"
    )
    emp2 = await employee_service.create_employee(db, emp2_in)

    # Allocate to employee 1
    await allocation_service.allocate(
        db,
        SeatAssignmentCreate(seat_id=seat.id, employee_id=emp1.id),
        assigned_by_user_id=None
    )

    # Try allocating to employee 2
    with pytest.raises(HTTPException) as exc_info:
        await allocation_service.allocate(
            db,
            SeatAssignmentCreate(seat_id=seat.id, employee_id=emp2.id),
            assigned_by_user_id=None
        )
    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == "SEAT_ALREADY_OCCUPIED"


@pytest.mark.asyncio
async def test_employee_already_seated_rejection(db):
    employee_service = EmployeeService()
    allocation_service = SeatAllocationService()

    building = Building(name="HQ", code="HQ", address="HQ Address")
    db.add(building)
    await db.flush()

    floor = Floor(building_id=building.id, floor_number=1, name="Floor 1")
    db.add(floor)
    await db.flush()

    seat1 = Seat(floor_id=floor.id, seat_code="SEAT-03", seat_type="desk")
    seat2 = Seat(floor_id=floor.id, seat_code="SEAT-04", seat_type="desk")
    db.add(seat1)
    db.add(seat2)
    await db.flush()

    # Create employee
    emp_in = EmployeeCreate(
        employee_code="EMP904",
        first_name="User",
        last_name="Three",
        email="user3@example.com",
        department="Engineering",
        designation="Developer",
        joining_date=date.today(),
        status="active"
    )
    employee = await employee_service.create_employee(db, emp_in)

    # Allocate seat 1 to employee
    await allocation_service.allocate(
        db,
        SeatAssignmentCreate(seat_id=seat1.id, employee_id=employee.id),
        assigned_by_user_id=None
    )

    # Try allocating seat 2 to same employee
    with pytest.raises(HTTPException) as exc_info:
        await allocation_service.allocate(
            db,
            SeatAssignmentCreate(seat_id=seat2.id, employee_id=employee.id),
            assigned_by_user_id=None
        )
    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == "EMPLOYEE_ALREADY_SEATED"


@pytest.mark.asyncio
async def test_release_flow(db):
    employee_service = EmployeeService()
    allocation_service = SeatAllocationService()

    building = Building(name="HQ", code="HQ", address="HQ Address")
    db.add(building)
    await db.flush()

    floor = Floor(building_id=building.id, floor_number=1, name="Floor 1")
    db.add(floor)
    await db.flush()

    seat = Seat(floor_id=floor.id, seat_code="SEAT-05", seat_type="desk")
    db.add(seat)
    await db.flush()

    emp_in = EmployeeCreate(
        employee_code="EMP905",
        first_name="User",
        last_name="Four",
        email="user4@example.com",
        department="Engineering",
        designation="Developer",
        joining_date=date.today(),
        status="active"
    )
    employee = await employee_service.create_employee(db, emp_in)

    # Allocate
    assignment = await allocation_service.allocate(
        db,
        SeatAssignmentCreate(seat_id=seat.id, employee_id=employee.id),
        assigned_by_user_id=None
    )

    # Release
    await allocation_service.release(
        db,
        assignment.id,
        SeatReleaseCreate(released_by_user_id=None, reason="resigned", notes="Clean release")
    )

    # Query release log
    stmt = select(SeatReleaseLog).where(SeatReleaseLog.seat_assignment_id == assignment.id)
    release_log = (await db.execute(stmt)).scalar_one_or_none()

    assert release_log is not None
    assert release_log.reason == "resigned"
    assert release_log.notes == "Clean release"

    # Verify assignment is updated with released_at
    await db.refresh(assignment)
    assert assignment.released_at is not None

    # Verify seat status is updated to available
    await db.refresh(seat)
    assert seat.status == "available"


@pytest.mark.asyncio
async def test_auto_allocate_heuristic(db):
    employee_service = EmployeeService()
    project_service = ProjectService()
    allocation_service = SeatAllocationService()

    # 1. Create a building and two floors
    building = Building(name="Main Campus", code="MC", address="Campus Road")
    db.add(building)
    await db.flush()

    floor1 = Floor(building_id=building.id, floor_number=1, name="Floor 1")
    floor2 = Floor(building_id=building.id, floor_number=2, name="Floor 2")
    db.add(floor1)
    db.add(floor2)
    await db.flush()

    # Floor 1 seats: MC-1-01
    seat_f1 = Seat(floor_id=floor1.id, seat_code="MC-1-01", seat_type="desk", status="available")
    # Floor 2 seats: MC-2-01 (will be occupied)
    seat_f2 = Seat(floor_id=floor2.id, seat_code="MC-2-01", seat_type="desk", status="available")
    db.add(seat_f1)
    db.add(seat_f2)
    await db.flush()

    # 2. Create Project
    project = Project(
        project_code="P-100",
        name="Team Project",
        client_name="Client A",
        status="active",
        start_date=date.today()
    )
    db.add(project)
    await db.flush()

    # 3. Create Teammate employee and seat them on Floor 2
    teammate_in = EmployeeCreate(
        employee_code="EMP910",
        first_name="Teammate",
        last_name="One",
        email="teammate1@example.com",
        department="Engineering",
        designation="Developer",
        joining_date=date.today(),
        status="active"
    )
    teammate = await employee_service.create_employee(db, teammate_in)

    # Assign teammate to project
    await project_service.project_repo.add_employee(
        db,
        EmployeeProjectCreate(
            employee_id=teammate.id,
            project_id=project.id,
            role_on_project="Developer",
            allocation_percent=50,
            start_date=date.today()
        )
    )

    # Manually allocate seat_f2 to teammate (status is now occupied)
    teammate_assignment = SeatAssignment(
        employee_id=teammate.id,
        seat_id=seat_f2.id,
        assigned_at=datetime.utcnow(),
    )
    db.add(teammate_assignment)
    seat_f2.status = "occupied"
    db.add(seat_f2)
    await db.flush()

    # Add a second available seat on Floor 2 so there is an available seat near the teammate
    seat_f2_avail = Seat(floor_id=floor2.id, seat_code="MC-2-02", seat_type="desk", status="available")
    db.add(seat_f2_avail)
    await db.flush()

    # 4. Create New Joiner employee
    new_joiner_in = EmployeeCreate(
        employee_code="EMP911",
        first_name="New",
        last_name="Joiner",
        email="joiner@example.com",
        department="Engineering",
        designation="Developer",
        joining_date=date.today(),
        status="active"
    )
    new_joiner = await employee_service.create_employee(db, new_joiner_in)

    # Assign new joiner to the same project
    await project_service.project_repo.add_employee(
        db,
        EmployeeProjectCreate(
            employee_id=new_joiner.id,
            project_id=project.id,
            role_on_project="Developer",
            allocation_percent=100,
            start_date=date.today()
        )
    )

    # Auto allocate seat to new joiner
    # Heuristic should prefer Floor 2 (MC-2-02) because teammate is seated on Floor 2,
    # even though Floor 1 (MC-1-01) is lower and has a lower seat code.
    assignment = await allocation_service.auto_allocate(
        db,
        employee_id=new_joiner.id
    )

    assert assignment.seat_id == seat_f2_avail.id

    # If there are no teammates, test default heuristic (lower floor first)
    # Let's free the new joiner and delete teammate's active assignment
    await allocation_service.release(
        db,
        assignment.id,
        SeatReleaseCreate(released_by_user_id=None, reason="other", notes="reset")
    )
    await db.delete(teammate_assignment)
    seat_f2.status = "available"
    db.add(seat_f2)
    await db.flush()

    # Auto allocate again. Now, Floor 1 (MC-1-01) should be chosen because it's lower.
    new_assignment = await allocation_service.auto_allocate(
        db,
        employee_id=new_joiner.id
    )
    assert new_assignment.seat_id == seat_f1.id

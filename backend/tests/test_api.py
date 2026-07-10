import pytest
from datetime import date
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.building import Building
from app.models.floor import Floor
from app.models.seat import Seat
from app.models.employee import Employee
from app.models.project import Project
from app.core.security import get_password_hash


async def create_test_user(db: AsyncSession, email: str, role: str) -> User:
    user = User(
        email=email,
        hashed_password=get_password_hash("testpassword"),
        role=role,
        is_active=True
    )
    db.add(user)
    await db.flush()
    return user


@pytest.mark.asyncio
async def test_auth_login_flow(client: AsyncClient, db: AsyncSession):
    # Create an admin user
    await create_test_user(db, "admin@example.com", "admin")

    # Login with correct credentials
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "testpassword"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@example.com"
    token = data["access_token"]

    # Access /me with token
    me_resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "admin@example.com"

    # Try accessing with wrong password
    bad_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "wrongpassword"}
    )
    assert bad_login.status_code == 401

    # Try accessing /me without token
    me_no_token = await client.get("/api/v1/auth/me")
    assert me_no_token.status_code == 401


@pytest.mark.asyncio
async def test_employee_api_flow(client: AsyncClient, db: AsyncSession):
    # Create admin user
    admin_user = await create_test_user(db, "admin@example.com", "admin")
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "testpassword"}
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create employee via POST
    emp_payload = {
        "employee_code": "EMP401",
        "first_name": "Jane",
        "last_name": "Doe",
        "email": "jane@example.com",
        "department": "IT",
        "designation": "Developer",
        "joining_date": str(date.today()),
        "status": "active"
    }
    response = await client.post("/api/v1/employees", json=emp_payload, headers=headers)
    assert response.status_code == 201
    created_emp = response.json()
    assert created_emp["employee_code"] == "EMP401"
    emp_id = created_emp["id"]

    # Get employee by ID
    get_resp = await client.get(f"/api/v1/employees/{emp_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["first_name"] == "Jane"

    # Get without token (should be 401)
    get_no_token = await client.get(f"/api/v1/employees/{emp_id}")
    assert get_no_token.status_code == 401


@pytest.mark.asyncio
async def test_seat_allocation_api_flow(client: AsyncClient, db: AsyncSession):
    admin_user = await create_test_user(db, "admin@example.com", "admin")
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "testpassword"}
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create building, floor, seat, employee
    building = Building(name="Build 1", code="B1", address="Road 1")
    db.add(building)
    await db.flush()

    floor = Floor(building_id=building.id, floor_number=1, name="Fl 1")
    db.add(floor)
    await db.flush()

    seat = Seat(floor_id=floor.id, seat_code="B1-F1-01", seat_type="desk")
    db.add(seat)
    await db.flush()

    employee = Employee(
        employee_code="EMP501",
        first_name="John",
        last_name="Doe",
        email="john@example.com",
        department="Engineering",
        designation="Developer",
        joining_date=date.today(),
        status="active",
        is_active=True
    )
    db.add(employee)
    await db.flush()

    # Allocate seat via API
    alloc_payload = {
        "seat_id": seat.id,
        "employee_id": employee.id,
        "notes": "Assigned via test"
    }
    alloc_resp = await client.post("/api/v1/seat-allocations", json=alloc_payload, headers=headers)
    assert alloc_resp.status_code == 201
    allocation = alloc_resp.json()
    assert allocation["seat_id"] == seat.id
    assert allocation["employee_id"] == employee.id
    alloc_id = allocation["id"]

    # Double-allocate seat (should fail with 409)
    # Create another employee
    employee2 = Employee(
        employee_code="EMP502",
        first_name="Sarah",
        last_name="Smith",
        email="sarah@example.com",
        department="Engineering",
        designation="Developer",
        joining_date=date.today(),
        status="active",
        is_active=True
    )
    db.add(employee2)
    await db.flush()

    alloc_payload2 = {
        "seat_id": seat.id,
        "employee_id": employee2.id,
        "notes": "Try double alloc"
    }
    double_alloc_resp = await client.post("/api/v1/seat-allocations", json=alloc_payload2, headers=headers)
    assert double_alloc_resp.status_code == 409

    # Release seat via API
    release_payload = {
        "reason": "resigned",
        "notes": "Left the company"
    }
    release_resp = await client.post(
        f"/api/v1/seat-allocations/{alloc_id}/release",
        json=release_payload,
        headers=headers
    )
    assert release_resp.status_code == 200
    assert release_resp.json()["status"] == "success"


@pytest.mark.asyncio
async def test_allocate_to_inactive_employee_api(client: AsyncClient, db: AsyncSession):
    admin_user = await create_test_user(db, "admin@example.com", "admin")
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "testpassword"}
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create building, floor, seat, and inactive employee
    building = Building(name="Build 1", code="B1", address="Road 1")
    db.add(building)
    await db.flush()

    floor = Floor(building_id=building.id, floor_number=1, name="Fl 1")
    db.add(floor)
    await db.flush()

    seat = Seat(floor_id=floor.id, seat_code="B1-F1-02", seat_type="desk")
    db.add(seat)
    await db.flush()

    employee = Employee(
        employee_code="EMP503",
        first_name="Inactive",
        last_name="User",
        email="inactive@example.com",
        department="Engineering",
        designation="Developer",
        joining_date=date.today(),
        status="exited",
        is_active=False
    )
    db.add(employee)
    await db.flush()

    # Allocate seat via API (should fail with 404 or 400 since employee is inactive/not found)
    alloc_payload = {
        "seat_id": seat.id,
        "employee_id": employee.id,
        "notes": "Try assigning inactive"
    }
    alloc_resp = await client.post("/api/v1/seat-allocations", json=alloc_payload, headers=headers)
    # The get_by_id checks by default filters out is_active = False, returning 404 Not Found
    assert alloc_resp.status_code in (400, 404)


@pytest.mark.asyncio
async def test_allocation_percent_over_100_warning_api(client: AsyncClient, db: AsyncSession):
    admin_user = await create_test_user(db, "admin@example.com", "admin")
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "testpassword"}
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create employee and two projects
    employee = Employee(
        employee_code="EMP601",
        first_name="Developer",
        last_name="One",
        email="dev1@example.com",
        department="Engineering",
        designation="Developer",
        joining_date=date.today(),
        status="active",
        is_active=True
    )
    db.add(employee)

    proj1 = Project(
        project_code="PRJ101",
        name="Project One",
        client_name="Client A",
        status="active",
        start_date=date.today()
    )
    proj2 = Project(
        project_code="PRJ102",
        name="Project Two",
        client_name="Client B",
        status="active",
        start_date=date.today()
    )
    db.add(proj1)
    db.add(proj2)
    await db.flush()

    # Assign to Project One with 60% allocation
    assign1_resp = await client.post(
        f"/api/v1/projects/{proj1.id}/employees",
        json={
            "employee_id": employee.id,
            "role_on_project": "Lead Developer",
            "allocation_percent": 60,
            "start_date": str(date.today())
        },
        headers=headers
    )
    assert assign1_resp.status_code == 201
    assert assign1_resp.json()["warning"] is None

    # Assign to Project Two with 50% allocation (Total is now 110%)
    assign2_resp = await client.post(
        f"/api/v1/projects/{proj2.id}/employees",
        json={
            "employee_id": employee.id,
            "role_on_project": "Consultant",
            "allocation_percent": 50,
            "start_date": str(date.today())
        },
        headers=headers
    )
    assert assign2_resp.status_code == 201
    assert assign2_resp.json()["warning"] is not None
    assert "exceeds 100%" in assign2_resp.json()["warning"]

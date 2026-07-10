import asyncio
import random
from datetime import datetime, date, timedelta
from faker import Faker
from sqlalchemy import insert, select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import SessionLocal, engine
from app.core.security import get_password_hash
from app.models.user import User
from app.models.building import Building
from app.models.floor import Floor
from app.models.seat import Seat
from app.models.project import Project
from app.models.employee import Employee
from app.models.employee_project import EmployeeProject
from app.models.seat_assignment import SeatAssignment
from app.models.seat_release_log import SeatReleaseLog

# Set seeds for reproducibility
random.seed(42)
Faker.seed(42)
fake = Faker()

async def clear_database(session: AsyncSession):
    print("Clearing existing data...")
    await session.execute(delete(SeatReleaseLog))
    await session.execute(delete(SeatAssignment))
    await session.execute(delete(EmployeeProject))
    await session.execute(delete(Seat))
    await session.execute(delete(Floor))
    await session.execute(delete(Building))
    await session.execute(delete(Project))
    await session.execute(delete(Employee))
    await session.execute(delete(User))
    await session.commit()
    print("Clearing existing data... done")

async def seed_data():
    async with SessionLocal() as session:
        await clear_database(session)

        # 1. Seed Users
        print("Seeding users...")
        users_data = [
            {"email": "admin@ethara.dev", "hashed_password": get_password_hash("password"), "role": "admin", "is_active": True},
            {"email": "viewer@ethara.dev", "hashed_password": get_password_hash("password"), "role": "viewer", "is_active": True},
            {"email": "viewer2@ethara.dev", "hashed_password": get_password_hash("password"), "role": "viewer", "is_active": True},
        ]
        res = await session.execute(insert(User).values(users_data).returning(User.id, User.email))
        users = {r[1]: r[0] for r in res.all()}
        admin_id = users["admin@ethara.dev"]
        print(f"Seeding users... done ({len(users)})")

        # 2. Seed Buildings
        print("Seeding buildings...")
        buildings_data = [
            {"name": "Tower A", "code": "T-A", "address": "101 Innovation Way, Silicon Oasis", "total_floors": 0, "is_active": True},
            {"name": "Tower B", "code": "T-B", "address": "102 Innovation Way, Silicon Oasis", "total_floors": 0, "is_active": True},
            {"name": "Tower C", "code": "T-C", "address": "201 Enterprise Blvd, Downtown", "total_floors": 0, "is_active": True},
            {"name": "Tower D", "code": "T-D", "address": "301 Research Dr, Knowledge Park", "total_floors": 0, "is_active": True},
            {"name": "Tower E", "code": "T-E", "address": "401 Tech Plaza, Marina", "total_floors": 0, "is_active": True},
            {"name": "Tower F", "code": "T-F", "address": "501 Future Loop, JLT", "total_floors": 0, "is_active": True},
        ]
        res = await session.execute(insert(Building).values(buildings_data).returning(Building.id, Building.code))
        buildings = [{"id": r[0], "code": r[1]} for r in res.all()]
        print(f"Seeding buildings... done ({len(buildings)})")

        # 3. Seed Floors
        print("Seeding floors...")
        floors_data = []
        building_floor_counts = {}
        for b in buildings:
            # 12 to 18 floors per building
            num_floors = random.randint(12, 18)
            building_floor_counts[b["id"]] = num_floors
            for f_num in range(1, num_floors + 1):
                floors_data.append({
                    "building_id": b["id"],
                    "floor_number": f_num,
                    "name": f"Floor {f_num}",
                    "total_seats": 0,
                    "is_active": True
                })
        
        res = await session.execute(insert(Floor).values(floors_data).returning(Floor.id, Floor.building_id, Floor.floor_number))
        floors = [{"id": r[0], "building_id": r[1], "floor_number": r[2]} for r in res.all()]
        
        # Group floors by building code for seat code generation
        building_id_to_code = {b["id"]: b["code"] for b in buildings}
        print(f"Seeding floors... done ({len(floors)})")

        # Update buildings total_floors
        for b_id, count in building_floor_counts.items():
            await session.execute(
                update(Building).where(Building.id == b_id).values(total_floors=count)
            )

        # 4. Seed Seats
        print("Seeding seats...")
        seats_data = []
        floor_seat_counts = {}
        for f in floors:
            b_code = building_id_to_code[f["building_id"]]
            # 70 to 100 seats per floor
            num_seats = random.randint(70, 100)
            floor_seat_counts[f["id"]] = num_seats
            for s_idx in range(1, num_seats + 1):
                seat_type = random.choices(
                    ["standard", "workstation", "hotdesk", "cabin"], 
                    weights=[70, 15, 10, 5]
                )[0]
                seats_data.append({
                    "floor_id": f["id"],
                    "seat_code": f"{b_code}-{f['floor_number']}-{s_idx:03d}",
                    "seat_type": seat_type,
                    "status": "available",
                    "is_active": True
                })
        
        # Batch insert seats in chunks of 1000 to keep it fast
        seat_ids = []
        for i in range(0, len(seats_data), 1000):
            chunk = seats_data[i:i+1000]
            res = await session.execute(insert(Seat).values(chunk).returning(Seat.id, Seat.floor_id))
            seat_ids.extend([{"id": r[0], "floor_id": r[1]} for r in res.all()])
        
        print(f"Seeding seats... done ({len(seat_ids)})")

        # Update floors total_seats
        for f_id, count in floor_seat_counts.items():
            await session.execute(
                update(Floor).where(Floor.id == f_id).values(total_seats=count)
            )

        # 5. Seed Projects
        print("Seeding projects...")
        project_adjectives = ["Nexus", "Apex", "Horizon", "Quantum", "Synergy", "Aegis", "Vanguard", "Delta", "Summit", "Genesis"]
        project_nouns = ["Platform", "Core", "Cloud", "Analytics", "Network", "Gateway", "Engine", "Workspace", "Sync", "Link"]
        
        projects_data = []
        num_projects = random.randint(60, 120)
        for i in range(num_projects):
            proj_code = f"PRJ-{1000 + i}"
            name = f"{random.choice(project_adjectives)} {random.choice(project_nouns)} {fake.word().capitalize()}"
            client_name = fake.company()
            status = random.choices(["active", "on_hold", "closed"], weights=[70, 15, 15])[0]
            
            # Start date in the last 2 years
            start_date = date.today() - timedelta(days=random.randint(30, 730))
            end_date = None
            if status == "closed":
                end_date = start_date + timedelta(days=random.randint(60, 365))
                # Ensure end_date is in the past, if not, adjust start_date
                if end_date >= date.today():
                    end_date = date.today() - timedelta(days=random.randint(1, 15))
            
            projects_data.append({
                "project_code": proj_code,
                "name": name,
                "client_name": client_name,
                "status": status,
                "start_date": start_date,
                "end_date": end_date,
                "is_active": status != "closed"
            })
            
        res = await session.execute(insert(Project).values(projects_data).returning(Project.id, Project.status))
        projects = [{"id": r[0], "status": r[1]} for r in res.all()]
        active_project_ids = [p["id"] for p in projects if p["status"] == "active"]
        print(f"Seeding projects... done ({len(projects)})")

        # 6. Seed Employees
        print("Seeding employees...")
        departments = ["Engineering", "QA", "Design", "Product", "HR", "Finance", "Sales", "Operations"]
        dept_weights = [40, 15, 10, 10, 5, 5, 10, 5]
        
        titles = {
            "Engineering": ["Software Engineer", "Senior Software Engineer", "Tech Lead", "Engineering Manager", "Principal Engineer", "Associate Software Engineer"],
            "QA": ["QA Engineer", "Senior QA Engineer", "QA Lead", "QA Manager"],
            "Design": ["Product Designer", "Senior Product Designer", "UI/UX Designer", "Design Lead"],
            "Product": ["Product Manager", "Senior Product Manager", "Product Director", "Associate Product Manager"],
            "HR": ["HR Specialist", "HR Manager", "HR Generalist", "Recruiter"],
            "Finance": ["Accountant", "Financial Analyst", "Finance Manager", "Senior Accountant"],
            "Sales": ["Sales Representative", "Account Executive", "Sales Manager", "Senior Account Executive"],
            "Operations": ["Operations Associate", "Operations Manager", "Operations Lead"]
        }
        
        employees_data = []
        emp_managers_indices = {} # index in employees_data -> index of manager in employees_data
        dept_employee_indices = {d: [] for d in departments}
        
        for idx in range(5000):
            emp_code = f"EMP{10000 + idx}"
            first_name = fake.first_name()
            last_name = fake.last_name()
            email = f"{first_name.lower()}.{last_name.lower()}.{idx}@ethara.dev"
            dept = random.choices(departments, weights=dept_weights)[0]
            desig = random.choice(titles[dept])
            
            # Weighted status: active (95%), exited (3%), on_leave (2%)
            status = random.choices(["active", "exited", "on_leave"], weights=[95, 3, 2])[0]
            
            joining_date = date.today() - timedelta(days=random.randint(30, 5 * 365))
            exit_date = None
            if status == "exited":
                exit_date = joining_date + timedelta(days=random.randint(30, 730))
                if exit_date >= date.today():
                    exit_date = date.today() - timedelta(days=random.randint(1, 15))
            
            # Select manager if enough people exist in department
            manager_idx = None
            dept_emps = dept_employee_indices[dept]
            if len(dept_emps) >= 20:
                # Pick a manager from the first 15 employees created in this department
                manager_idx = random.choice(dept_emps[:15])
                emp_managers_indices[idx] = manager_idx
            
            employees_data.append({
                "employee_code": emp_code,
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "department": dept,
                "designation": desig,
                "status": status,
                "joining_date": joining_date,
                "exit_date": exit_date,
                "reporting_manager_id": None,
                "is_active": status != "exited"
            })
            
            dept_employee_indices[dept].append(idx)

        # Batch insert employees
        employee_ids = []
        for i in range(0, len(employees_data), 1000):
            chunk = employees_data[i:i+1000]
            res = await session.execute(insert(Employee).values(chunk).returning(Employee.id))
            employee_ids.extend([r[0] for r in res.all()])
        
        print(f"Seeding employees... done ({len(employee_ids)})")

        # Update reporting managers using database IDs
        print("Updating reporting manager relationships...")
        update_manager_dicts = []
        for emp_idx, mgr_idx in emp_managers_indices.items():
            emp_id = employee_ids[emp_idx]
            mgr_id = employee_ids[mgr_idx]
            update_manager_dicts.append({
                "id": emp_id,
                "reporting_manager_id": mgr_id
            })
            
        # Run updates in batches of 1000
        for i in range(0, len(update_manager_dicts), 1000):
            chunk = update_manager_dicts[i:i+1000]
            await session.execute(update(Employee), chunk)
            
        print("Updating reporting manager relationships... done")

        # 7. Seed Employee-Project mappings
        print("Seeding employee project mappings...")
        project_roles = ["Developer", "Lead Developer", "QA Tester", "QA Lead", "Designer", "Product Owner", "Project Manager", "Scrum Master", "Business Analyst"]
        
        mappings_data = []
        active_emp_ids = [employee_ids[idx] for idx, emp in enumerate(employees_data) if emp["status"] != "exited"]
        
        for emp_id in active_emp_ids:
            # Active employees get 1-2 projects (80% 1 project, 20% 2 projects)
            num_projs = random.choices([1, 2], weights=[80, 20])[0]
            emp_projects = random.sample(active_project_ids, min(num_projs, len(active_project_ids)))
            
            # Allocation splits
            if len(emp_projects) == 1:
                mappings_data.append({
                    "employee_id": emp_id,
                    "project_id": emp_projects[0],
                    "role_on_project": random.choice(project_roles),
                    "allocation_percent": 100,
                    "start_date": date.today() - timedelta(days=90),
                    "end_date": None
                })
            elif len(emp_projects) == 2:
                split = random.choices([[50, 50], [60, 40]], weights=[60, 40])[0]
                mappings_data.append({
                    "employee_id": emp_id,
                    "project_id": emp_projects[0],
                    "role_on_project": random.choice(project_roles),
                    "allocation_percent": split[0],
                    "start_date": date.today() - timedelta(days=90),
                    "end_date": None
                })
                mappings_data.append({
                    "employee_id": emp_id,
                    "project_id": emp_projects[1],
                    "role_on_project": random.choice(project_roles),
                    "allocation_percent": split[1],
                    "start_date": date.today() - timedelta(days=90),
                    "end_date": None
                })

        for i in range(0, len(mappings_data), 1000):
            chunk = mappings_data[i:i+1000]
            await session.execute(insert(EmployeeProject).values(chunk))
            
        print(f"Seeding employee project mappings... done ({len(mappings_data)})")

        # 8. Seed Seat Assignments (pre-occupied and manual)
        print("Seeding active seat assignments...")
        
        # Prepare data structures for heuristic seat assignments
        # Find available seats and group them by floor
        seats_by_floor = {}
        for s in seat_ids:
            if s["floor_id"] not in seats_by_floor:
                seats_by_floor[s["floor_id"]] = []
            seats_by_floor[s["floor_id"]].append(s["id"])
            
        # Get floor mapping details to find lowest floors quickly
        floor_details = {f["id"]: f for f in floors}
        
        # Map employee to their project teammate floor locations
        # employee_id -> first project_id
        emp_to_project = {}
        for m in mappings_data:
            if m["employee_id"] not in emp_to_project:
                emp_to_project[m["employee_id"]] = m["project_id"]
                
        project_to_assigned_floors = {} # project_id -> list of floor_ids where team is assigned
        
        # We assign ~85-90% of active employees to a seat
        num_to_assign = int(len(active_emp_ids) * 0.88)
        assign_emp_ids = random.sample(active_emp_ids, num_to_assign)
        
        assignments_data = []
        occupied_seat_ids = set()
        
        for emp_id in assign_emp_ids:
            proj_id = emp_to_project.get(emp_id)
            
            chosen_seat_id = None
            chosen_floor_id = None
            
            # Heuristic: try to assign to a floor where project teammates are located
            if proj_id and proj_id in project_to_assigned_floors:
                teammate_floors = project_to_assigned_floors[proj_id]
                # Find a floor with teammates that has available seats
                for fl_id in teammate_floors:
                    avail_seats = [sid for sid in seats_by_floor.get(fl_id, []) if sid not in occupied_seat_ids]
                    if avail_seats:
                        chosen_seat_id = random.choice(avail_seats)
                        chosen_floor_id = fl_id
                        break
                        
            # Fallback: pick any available seat on the lowest available floor
            if not chosen_seat_id:
                # Sort floors by floor_number to prefer lower floors
                sorted_floors = sorted(floors, key=lambda x: x["floor_number"])
                for fl in sorted_floors:
                    avail_seats = [sid for sid in seats_by_floor.get(fl["id"], []) if sid not in occupied_seat_ids]
                    if avail_seats:
                        chosen_seat_id = random.choice(avail_seats)
                        chosen_floor_id = fl["id"]
                        break
                        
            if chosen_seat_id:
                occupied_seat_ids.add(chosen_seat_id)
                assignments_data.append({
                    "seat_id": chosen_seat_id,
                    "employee_id": emp_id,
                    "assigned_at": datetime.now() - timedelta(days=random.randint(10, 180)),
                    "released_at": None,
                    "assigned_by_user_id": admin_id,
                    "notes": "Seeded active allocation"
                })
                
                # Update project assigned floors map
                if proj_id:
                    if proj_id not in project_to_assigned_floors:
                        project_to_assigned_floors[proj_id] = []
                    if chosen_floor_id not in project_to_assigned_floors[proj_id]:
                        project_to_assigned_floors[proj_id].append(chosen_floor_id)

        # Batch insert active assignments
        for i in range(0, len(assignments_data), 1000):
            chunk = assignments_data[i:i+1000]
            await session.execute(insert(SeatAssignment).values(chunk))
            
        # Bulk update occupied seats status to 'occupied'
        occupied_list = list(occupied_seat_ids)
        for i in range(0, len(occupied_list), 1000):
            chunk_ids = occupied_list[i:i+1000]
            await session.execute(
                update(Seat).where(Seat.id.in_(chunk_ids)).values(status="occupied")
            )
            
        print(f"Seeding active seat assignments... done ({len(assignments_data)})")

        # 9. Seed Released Assignments (History & Logs)
        print("Seeding historical released assignments...")
        released_assignments_data = []
        release_logs_data = []
        
        # We choose all exited employees (~150) plus ~100 active employees who transitioned
        exited_emp_ids = [employee_ids[idx] for idx, emp in enumerate(employees_data) if emp["status"] == "exited"]
        transition_active_emp_ids = random.sample([eid for eid in active_emp_ids if eid not in assign_emp_ids], min(100, len(active_emp_ids) - len(assign_emp_ids)))
        
        release_candidate_emp_ids = exited_emp_ids + transition_active_emp_ids
        
        # Find remaining available seats
        available_seat_ids = [s["id"] for s in seat_ids if s["id"] not in occupied_seat_ids]
        
        num_released = min(len(release_candidate_emp_ids), len(available_seat_ids))
        
        for k in range(num_released):
            emp_id = release_candidate_emp_ids[k]
            seat_id = available_seat_ids[k]
            
            # Determine exit dates or mock release dates
            is_exited = emp_id in exited_emp_ids
            exit_date_val = None
            if is_exited:
                # Find the exit date
                emp_idx = employee_ids.index(emp_id)
                exit_date_val = employees_data[emp_idx]["exit_date"]
                
            assign_date = datetime.now() - timedelta(days=random.randint(180, 365))
            if exit_date_val:
                release_date = datetime.combine(exit_date_val, datetime.min.time())
                reason = "resigned"
            else:
                release_date = assign_date + timedelta(days=random.randint(30, 90))
                reason = random.choice(["relocated", "project_change", "other"])
                
            released_assignments_data.append({
                "seat_id": seat_id,
                "employee_id": emp_id,
                "assigned_at": assign_date,
                "released_at": release_date,
                "assigned_by_user_id": admin_id,
                "notes": "Seeded historical assignment"
            })
            
        # Insert released assignments and get their IDs
        if released_assignments_data:
            res = await session.execute(
                insert(SeatAssignment).values(released_assignments_data).returning(SeatAssignment.id, SeatAssignment.released_at)
            )
            inserted_released = [{"id": r[0], "released_at": r[1]} for r in res.all()]
            
            for idx, item in enumerate(inserted_released):
                reason = "resigned" if release_candidate_emp_ids[idx] in exited_emp_ids else random.choice(["relocated", "project_change", "other"])
                release_logs_data.append({
                    "seat_assignment_id": item["id"],
                    "released_at": item["released_at"],
                    "released_by_user_id": admin_id,
                    "reason": reason,
                    "notes": f"Seeded release log for {reason}"
                })
                
            if release_logs_data:
                await session.execute(insert(SeatReleaseLog).values(release_logs_data))
            
        print(f"Seeding historical released assignments... done ({len(released_assignments_data)})")

        await session.commit()
        print("Database seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())

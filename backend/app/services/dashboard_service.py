import asyncio
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.models.employee import Employee
from app.models.seat import Seat
from app.models.seat_assignment import SeatAssignment
from app.models.project import Project
from app.models.building import Building
from app.models.floor import Floor


class DashboardService:
    async def get_summary(self, db: AsyncSession) -> Dict[str, Any]:
        """
        Fetch top KPI card summaries using optimized aggregate queries.
        """
        # 1. Employees KPI
        emp_stmt = select(
            func.count(Employee.id).label("total_employees"),
            func.count(Employee.id).filter(Employee.status == "active").label("active_employees")
        ).where(Employee.is_active == True)

        # 2. Project KPI
        proj_stmt = select(
            func.count(Project.id).label("total_projects"),
            func.count(Project.id).filter(Project.status == "active").label("active_projects")
        ).where(Project.is_active == True)

        # 3. Seats KPI
        active_assignment_exists = select(SeatAssignment.id).where(
            SeatAssignment.seat_id == Seat.id,
            SeatAssignment.released_at == None
        ).exists()

        seat_stmt = select(
            func.count(Seat.id).label("total_seats"),
            func.count(Seat.id).filter(active_assignment_exists).label("occupied_seats"),
            func.count(Seat.id).filter(~active_assignment_exists).label("available_seats")
        ).where(Seat.is_active == True)

        # 4. Unassigned Employees KPI
        has_seat_subquery = select(SeatAssignment.employee_id).where(
            SeatAssignment.released_at == None
        ).subquery()

        unassigned_stmt = select(func.count(Employee.id)).where(
            Employee.is_active == True,
            Employee.status == "active",
            ~Employee.id.in_(select(has_seat_subquery))
        )

        # Run queries in parallel
        emp_task = db.execute(emp_stmt)
        proj_task = db.execute(proj_stmt)
        seat_task = db.execute(seat_stmt)
        unassigned_task = db.execute(unassigned_stmt)

        emp_res, proj_res, seat_res, unassigned_res = await asyncio.gather(
            emp_task, proj_task, seat_task, unassigned_task
        )

        emp_row = emp_res.first()
        proj_row = proj_res.first()
        seat_row = seat_res.first()
        unassigned_row = unassigned_res.first()

        total_employees = emp_row[0] if emp_row else 0
        active_employees = emp_row[1] if emp_row else 0

        total_projects = proj_row[0] if proj_row else 0
        active_projects = proj_row[1] if proj_row else 0

        total_seats = seat_row[0] if seat_row else 0
        occupied_seats = seat_row[1] if seat_row else 0
        available_seats = seat_row[2] if seat_row else 0
        unassigned_employees = unassigned_row[0] if unassigned_row else 0

        utilization_percent = (occupied_seats / total_seats * 100) if total_seats > 0 else 0.0

        return {
            "total_employees": total_employees,
            "active_employees": active_employees,
            "total_seats": total_seats,
            "occupied_seats": occupied_seats,
            "allocated_seats": occupied_seats,  # Alias
            "available_seats": available_seats,
            "utilization_percent": round(utilization_percent, 2),
            "utilization_rate": round(utilization_percent, 2),  # Alias
            "total_projects": total_projects,
            "active_projects": active_projects,
            "unassigned_employees": unassigned_employees,
        }

    async def get_utilization(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """
        Fetch seat utilization by building and floor.
        """
        active_assign = select(SeatAssignment.id).where(
            SeatAssignment.seat_id == Seat.id,
            SeatAssignment.released_at == None
        ).exists()

        # Query all floors with building names
        f_stmt = (
            select(
                Floor.id,
                Floor.floor_number,
                Building.name.label("building_name"),
                func.count(Seat.id).label("total_seats"),
                func.count(Seat.id).filter(active_assign).label("occupied_seats")
            )
            .join(Building, Building.id == Floor.building_id)
            .outerjoin(Seat, (Seat.floor_id == Floor.id) & (Seat.is_active == True))
            .where(Floor.is_active == True, Building.is_active == True)
            .group_by(Floor.id, Floor.floor_number, Building.name)
            .order_by(Building.name.asc(), Floor.floor_number.asc())
        )

        res = await db.execute(f_stmt)
        floors = res.all()

        result = []
        for row in floors:
            f_id = row[0]
            f_num = row[1]
            b_name = row[2]
            f_total = row[3]
            f_occupied = row[4]
            f_util = (f_occupied / f_total * 100) if f_total > 0 else 0.0

            result.append({
                "floor_id": f_id,
                "floor_number": f_num,
                "building_name": b_name,
                "total_seats": f_total,
                "occupied_seats": f_occupied,
                "allocated_seats": f_occupied,  # Alias
                "utilization_percent": round(f_util, 2),
                "utilization_rate": round(f_util, 2)  # Alias
            })

        return result

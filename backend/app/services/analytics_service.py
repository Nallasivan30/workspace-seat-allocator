import asyncio
from datetime import date, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, Date, cast

from app.models.employee import Employee
from app.models.employee_project import EmployeeProject
from app.models.project import Project
from app.models.seat_assignment import SeatAssignment
from app.models.seat_release_log import SeatReleaseLog


class AnalyticsService:
    async def get_projects_analytics(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """
        Fetch headcount, average allocation %, and department breakdown per project.
        """
        # Get headcounts and average allocations
        stmt = (
            select(
                Project.id,
                Project.project_code,
                Project.name,
                Project.status,
                func.count(Employee.id).label("headcount"),
                func.avg(EmployeeProject.allocation_percent).label("average_allocation"),
                func.sum(EmployeeProject.allocation_percent).label("total_allocation")
            )
            .outerjoin(EmployeeProject, (EmployeeProject.project_id == Project.id) & (EmployeeProject.end_date == None))
            .outerjoin(Employee, (EmployeeProject.employee_id == Employee.id) & (Employee.is_active == True))
            .where(Project.is_active == True)
            .group_by(Project.id, Project.project_code, Project.name, Project.status)
            .order_by(func.count(Employee.id).desc())
        )

        # Get department breakdowns per project
        dept_stmt = (
            select(
                EmployeeProject.project_id,
                Employee.department,
                func.count(Employee.id).label("count")
            )
            .join(Employee, (EmployeeProject.employee_id == Employee.id) & (Employee.is_active == True))
            .where(EmployeeProject.end_date == None)
            .group_by(EmployeeProject.project_id, Employee.department)
        )

        res, dept_res = await asyncio.gather(db.execute(stmt), db.execute(dept_stmt))
        projects = res.all()
        depts = dept_res.all()

        # Map departments by project id
        depts_by_project: Dict[int, Dict[str, int]] = {}
        for proj_id, dept, count in depts:
            if proj_id not in depts_by_project:
                depts_by_project[proj_id] = {}
            if dept:
                depts_by_project[proj_id][dept] = count

        result = []
        for row in projects:
            p_id = row[0]
            p_code = row[1]
            p_name = row[2]
            p_status = row[3]
            p_headcount = row[4]
            p_avg_alloc = float(row[5]) if row[5] is not None else 0.0
            p_total_alloc = float(row[6]) if row[6] is not None else 0.0

            result.append({
                "project_id": p_id,
                "project_code": p_code,
                "name": p_name,
                "project_name": p_name,  # Alias
                "status": p_status,
                "headcount": p_headcount,
                "total_allocated_employees": p_headcount,  # Alias
                "average_allocation": round(p_avg_alloc, 2),
                "total_allocation_percent": round(p_total_alloc, 2),  # Alias
                "department_breakdown": depts_by_project.get(p_id, {})
            })

        return result

    async def get_departments_analytics(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """
        Fetch headcount and utilization per department.
        """
        active_assignment_exists = select(SeatAssignment.employee_id).where(
            SeatAssignment.released_at == None
        ).subquery()

        stmt = (
            select(
                Employee.department,
                func.count(Employee.id).label("total_employees"),
                func.count(Employee.id).filter(Employee.id.in_(select(active_assignment_exists))).label("allocated_employees")
            )
            .where(Employee.is_active == True, Employee.status == "active")
            .group_by(Employee.department)
            .order_by(func.count(Employee.id).desc())
        )
        res = await db.execute(stmt)
        
        result = []
        for row in res.all():
            dept = row[0]
            if dept is None:
                continue
            total_emp = row[1]
            allocated_emp = row[2]
            util_rate = (allocated_emp / total_emp * 100) if total_emp > 0 else 0.0
            result.append({
                "department": dept,
                "total_employees": total_emp,
                "allocated_employees": allocated_emp,
                "utilization_rate": round(util_rate, 2),
                "count": total_emp  # Backward compatibility
            })
        return result

    async def get_seat_turnover(
        self, db: AsyncSession, start_date: date, end_date: date
    ) -> Dict[str, Any]:
        """
        Calculate daily allocations, releases, and overall occupied seats trend.
        """
        # 1. Allocations query (grouped by date)
        alloc_stmt = (
            select(
                cast(SeatAssignment.assigned_at, Date).label("date"),
                func.count(SeatAssignment.id).label("allocations")
            )
            .where(
                cast(SeatAssignment.assigned_at, Date) >= start_date,
                cast(SeatAssignment.assigned_at, Date) <= end_date
            )
            .group_by(cast(SeatAssignment.assigned_at, Date))
        )

        # 2. Releases query (grouped by date)
        rel_stmt = (
            select(
                cast(SeatReleaseLog.released_at, Date).label("date"),
                func.count(SeatReleaseLog.id).label("releases")
            )
            .where(
                cast(SeatReleaseLog.released_at, Date) >= start_date,
                cast(SeatReleaseLog.released_at, Date) <= end_date
            )
            .group_by(cast(SeatReleaseLog.released_at, Date))
        )

        # 3. Fetch assignments for trend line (overlapping assignments)
        trend_stmt = (
            select(
                SeatAssignment.assigned_at,
                SeatAssignment.released_at
            )
            .where(
                cast(SeatAssignment.assigned_at, Date) <= end_date,
                or_(
                    SeatAssignment.released_at == None,
                    cast(SeatAssignment.released_at, Date) >= start_date
                )
            )
        )

        # 4. Fetch reasons for releases in date range
        reasons_stmt = (
            select(
                SeatReleaseLog.reason,
                func.count(SeatReleaseLog.id).label("count")
            )
            .where(
                cast(SeatReleaseLog.released_at, Date) >= start_date,
                cast(SeatReleaseLog.released_at, Date) <= end_date
            )
            .group_by(SeatReleaseLog.reason)
        )

        alloc_res, rel_res, trend_res, reasons_res = await asyncio.gather(
            db.execute(alloc_stmt), db.execute(rel_stmt), db.execute(trend_stmt), db.execute(reasons_stmt)
        )

        allocations = {row[0]: row[1] for row in alloc_res.all()}
        releases = {row[0]: row[1] for row in rel_res.all()}
        assignments = trend_res.all()
        reasons_dict = {row[0]: row[1] for row in reasons_res.all() if row[0] is not None}

        # Build daily turnover list and occupied seats trend
        turnover_list = []
        trend_list = []

        curr_date = start_date
        while curr_date <= end_date:
            curr_alloc = allocations.get(curr_date, 0)
            curr_rel = releases.get(curr_date, 0)

            turnover_list.append({
                "date": curr_date.isoformat(),
                "allocations": curr_alloc,
                "releases": curr_rel
            })

            # Calculate occupancy for this day
            occupied = 0
            for assigned_at, released_at in assignments:
                # We compare dates
                assign_d = assigned_at.date()
                release_d = released_at.date() if released_at else None

                if assign_d <= curr_date:
                    if release_d is None or release_d > curr_date:
                        occupied += 1

            trend_list.append({
                "date": curr_date.isoformat(),
                "occupied_seats": occupied
            })

            curr_date += timedelta(days=1)

        total_allocated = sum(allocations.values())
        total_released = sum(releases.values())
        turnover_rate = (total_released / total_allocated) if total_allocated > 0 else 0.0

        return {
            "total_allocated": total_allocated,
            "total_released": total_released,
            "turnover_rate": round(turnover_rate, 4),
            "reasons": reasons_dict,
            "turnover": turnover_list,
            "trend": trend_list
        }

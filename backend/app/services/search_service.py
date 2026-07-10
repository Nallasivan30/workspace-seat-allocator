import asyncio
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.models.employee import Employee
from app.models.seat import Seat
from app.models.project import Project


class SearchService:
    async def global_search(
        self, db: AsyncSession, q: str, types: Optional[str] = None, limit: int = 10
    ) -> Dict[str, Any]:
        # Parse types
        type_list = [t.strip().lower() for t in types.split(",")] if types else ["employees", "seats", "projects"]

        tasks = []
        
        # We wrap standard coroutines in task calls to run them in gather.
        # If a type is excluded, we return an empty list immediately.
        if "employees" in type_list:
            tasks.append(self._search_employees(db, q, limit))
        else:
            tasks.append(self._return_empty())

        if "seats" in type_list:
            tasks.append(self._search_seats(db, q, limit))
        else:
            tasks.append(self._return_empty())

        if "projects" in type_list:
            tasks.append(self._search_projects(db, q, limit))
        else:
            tasks.append(self._return_empty())

        emp_res, seat_res, proj_res = await asyncio.gather(*tasks)

        return {
            "employees": emp_res,
            "seats": seat_res,
            "projects": proj_res,
        }

    async def _return_empty(self) -> List[Any]:
        return []

    async def _search_employees(self, db: AsyncSession, q: str, limit: int) -> List[Dict[str, Any]]:
        stmt = select(Employee).where(
            Employee.is_active == True,
            or_(
                (Employee.first_name + " " + Employee.last_name).ilike(f"%{q}%"),
                Employee.employee_code.ilike(f"%{q}%"),
                Employee.email.ilike(f"%{q}%"),
            )
        ).limit(limit)
        res = await db.execute(stmt)
        employees = res.scalars().all()
        return [
            {
                "id": e.id,
                "employee_code": e.employee_code,
                "first_name": e.first_name,
                "last_name": e.last_name,
                "email": e.email,
                "department": e.department,
                "designation": e.designation,
                "status": e.status,
            }
            for e in employees
        ]

    async def _search_seats(self, db: AsyncSession, q: str, limit: int) -> List[Dict[str, Any]]:
        from sqlalchemy.orm import joinedload
        from app.models.floor import Floor
        
        stmt = (
            select(Seat)
            .options(joinedload(Seat.floor).joinedload(Floor.building))
            .where(
                Seat.is_active == True,
                Seat.seat_code.ilike(f"%{q}%")
            )
            .limit(limit)
        )
        res = await db.execute(stmt)
        seats = res.scalars().all()
        return [
            {
                "id": s.id,
                "seat_code": s.seat_code,
                "seat_type": s.seat_type,
                "status": s.status,
                "floor_id": s.floor_id,
                "floor_number": s.floor.floor_number if s.floor else None,
                "building_name": s.floor.building.name if s.floor and s.floor.building else None,
            }
            for s in seats
        ]

    async def _search_projects(self, db: AsyncSession, q: str, limit: int) -> List[Dict[str, Any]]:
        stmt = select(Project).where(
            Project.is_active == True,
            or_(
                Project.name.ilike(f"%{q}%"),
                Project.project_code.ilike(f"%{q}%")
            )
        ).limit(limit)
        res = await db.execute(stmt)
        projects = res.scalars().all()
        return [
            {
                "id": p.id,
                "project_code": p.project_code,
                "name": p.name,
                "project_name": p.name,
                "status": p.status,
                "client_name": p.client_name,
            }
            for p in projects
        ]

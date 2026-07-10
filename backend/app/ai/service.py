import json
import logging
from typing import Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from datetime import datetime

from app.ai.llm_client import get_llm_client
from app.ai.intent_schema import AiIntentResponse
from app.ai.prompt_builder import SYSTEM_INTENT_PROMPT, build_intent_prompt, build_summary_prompt
from app.models.employee import Employee
from app.models.employee_project import EmployeeProject
from app.models.project import Project
from app.models.building import Building
from app.models.floor import Floor
from app.models.seat import Seat
from app.models.seat_assignment import SeatAssignment

logger = logging.getLogger(__name__)


class AiService:
    def __init__(self):
        self.llm_client = get_llm_client()

    async def query(self, db: AsyncSession, question: str) -> Dict[str, Any]:
        """
        Process a user question:
        1. Classify intent and extract parameters using LLM.
        2. Run corresponding whitelisted database query.
        3. Summarize results using LLM.
        """
        try:
            intent_json_str = await self.llm_client.complete(SYSTEM_INTENT_PROMPT, question)
            # Extract JSON block if wrapped in markdown
            if "```json" in intent_json_str:
                intent_json_str = intent_json_str.split("```json")[1].split("```")[0].strip()
            elif "```" in intent_json_str:
                intent_json_str = intent_json_str.split("```")[1].split("```")[0].strip()
            
            intent_data = json.loads(intent_json_str.strip())
            intent_response = AiIntentResponse(**intent_data)
        except Exception as e:
            logger.error(f"Error parsing intent classification: {e}")
            intent_response = AiIntentResponse(intent="unrecognized", parameters={})

        intent = intent_response.intent
        params = intent_response.parameters
        data = None
        summary = ""
        confidence = 0.9 if intent != "unrecognized" else 0.0

        if intent == "count_available_seats":
            data = await self._exec_count_available_seats(db, params)
        elif intent == "list_employees_by_project":
            data = await self._exec_list_employees_by_project(db, params)
        elif intent == "utilization_by_building":
            data = await self._exec_utilization_by_building(db, params)
        elif intent == "employees_joined_in_period":
            data = await self._exec_employees_joined_in_period(db, params)
        elif intent == "unassigned_employees":
            data = await self._exec_unassigned_employees(db, params)
        else:
            intent = "unrecognized"
            data = {}
            summary = "I couldn't quite understand that - try one of the suggested prompts, or use Search/Filters for now."

        # If we successfully retrieved data, generate a summary
        if intent != "unrecognized" and data is not None:
            try:
                summary_prompt = build_summary_prompt(intent, params, data)
                summary = await self.llm_client.complete(summary_prompt, f"Here is the user query again for context: {question}")
                summary = summary.strip()
            except Exception as e:
                logger.error(f"Error generating summary: {e}")
                summary = "Here is the data found for your request."

        return {
            "intent": intent,
            "parameters": params,
            "data": data,
            "summary": summary,
            "confidence": confidence
        }

    async def _exec_count_available_seats(self, db: AsyncSession, params: Dict[str, Any]) -> Dict[str, Any]:
        building_code = params.get("building_code")
        floor_number = params.get("floor_number")

        stmt = select(func.count(Seat.id)).where(Seat.is_active == True)
        active_assignment_exists = select(SeatAssignment.id).where(
            SeatAssignment.seat_id == Seat.id,
            SeatAssignment.released_at == None
        ).exists()
        stmt = stmt.where(~active_assignment_exists)

        if building_code or floor_number is not None:
            stmt = stmt.join(Floor, Seat.floor_id == Floor.id)
            if building_code:
                stmt = stmt.join(Building, Floor.building_id == Building.id)
                stmt = stmt.where(or_(
                    Building.building_code.ilike(str(building_code).strip()),
                    Building.name.ilike(f"%{str(building_code).strip()}%")
                ))
            if floor_number is not None:
                stmt = stmt.where(Floor.floor_number == int(floor_number))

        count = await db.scalar(stmt) or 0
        return {
            "count": count,
            "building_code": building_code,
            "floor_number": floor_number
        }

    async def _exec_list_employees_by_project(self, db: AsyncSession, params: Dict[str, Any]) -> Dict[str, Any]:
        project_name = params.get("project_name")
        if not project_name:
            return {"employees": [], "project_name": None}

        stmt = (
            select(Employee)
            .join(EmployeeProject, Employee.id == EmployeeProject.employee_id)
            .join(Project, EmployeeProject.project_id == Project.id)
        )
        stmt = stmt.where(
            Employee.is_active == True,
            EmployeeProject.end_date == None,
            or_(
                Project.name.ilike(f"%{str(project_name).strip()}%"),
                Project.project_code.ilike(str(project_name).strip())
            )
        ).limit(50)

        res = await db.execute(stmt)
        employees = res.scalars().all()
        return {
            "project_name": project_name,
            "employees": [
                {
                    "employee_code": e.employee_code,
                    "first_name": e.first_name,
                    "last_name": e.last_name,
                    "email": e.email,
                    "department": e.department,
                    "designation": e.designation
                }
                for e in employees
            ]
        }

    async def _exec_utilization_by_building(self, db: AsyncSession, params: Dict[str, Any]) -> Dict[str, Any]:
        building_code = params.get("building_code")

        seats_stmt = select(func.count(Seat.id)).where(Seat.is_active == True)
        active_assignment_exists = select(SeatAssignment.id).where(
            SeatAssignment.seat_id == Seat.id,
            SeatAssignment.released_at == None
        ).exists()
        occupied_stmt = select(func.count(Seat.id)).where(
            Seat.is_active == True,
            active_assignment_exists
        )

        if building_code:
            seats_stmt = seats_stmt.join(Floor, Seat.floor_id == Floor.id).join(Building, Floor.building_id == Building.id).where(
                or_(
                    Building.building_code.ilike(str(building_code).strip()),
                    Building.name.ilike(f"%{str(building_code).strip()}%")
                )
            )
            occupied_stmt = occupied_stmt.join(Floor, Seat.floor_id == Floor.id).join(Building, Floor.building_id == Building.id).where(
                or_(
                    Building.building_code.ilike(str(building_code).strip()),
                    Building.name.ilike(f"%{str(building_code).strip()}%")
                )
            )

        total_seats = await db.scalar(seats_stmt) or 0
        occupied_seats = await db.scalar(occupied_stmt) or 0
        util_pct = (occupied_seats / total_seats * 100) if total_seats > 0 else 0.0

        return {
            "building_code": building_code,
            "total_seats": total_seats,
            "occupied_seats": occupied_seats,
            "utilization_percent": round(util_pct, 2)
        }

    async def _exec_employees_joined_in_period(self, db: AsyncSession, params: Dict[str, Any]) -> Dict[str, Any]:
        department = params.get("department")
        start_date_str = params.get("start_date")
        end_date_str = params.get("end_date")

        stmt = select(Employee).where(Employee.is_active == True)

        if department:
            stmt = stmt.where(Employee.department.ilike(str(department).strip()))
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
                stmt = stmt.where(Employee.joining_date >= start_date)
            except ValueError:
                pass
        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
                stmt = stmt.where(Employee.joining_date <= end_date)
            except ValueError:
                pass

        stmt = stmt.limit(50)
        res = await db.execute(stmt)
        employees = res.scalars().all()

        return {
            "department": department,
            "start_date": start_date_str,
            "end_date": end_date_str,
            "count": len(employees),
            "employees": [
                {
                    "employee_code": e.employee_code,
                    "first_name": e.first_name,
                    "last_name": e.last_name,
                    "department": e.department,
                    "joining_date": str(e.joining_date)
                }
                for e in employees
            ]
        }

    async def _exec_unassigned_employees(self, db: AsyncSession, params: Dict[str, Any]) -> Dict[str, Any]:
        department = params.get("department")

        active_assignment_exists = select(SeatAssignment.id).where(
            SeatAssignment.employee_id == Employee.id,
            SeatAssignment.released_at == None,
        ).exists()
        
        stmt = select(Employee).where(
            Employee.is_active == True,
            Employee.status == "active",
            ~active_assignment_exists
        )

        if department:
            stmt = stmt.where(Employee.department.ilike(str(department).strip()))

        stmt = stmt.limit(50)
        res = await db.execute(stmt)
        employees = res.scalars().all()

        return {
            "department": department,
            "count": len(employees),
            "employees": [
                {
                    "employee_code": e.employee_code,
                    "first_name": e.first_name,
                    "last_name": e.last_name,
                    "department": e.department,
                    "designation": e.designation
                }
                for e in employees
            ]
        }

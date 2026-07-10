import abc
import json
import logging
import re
from typing import Any, Dict
from openai import AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)


class LlmClient(abc.ABC):
    @abc.abstractmethod
    async def complete(self, system_prompt: str, user_message: str) -> str:
        """Execute a text completion prompt."""
        pass


class MockLlmClient(LlmClient):
    """
    Mock LLM client to ensure the application works without an OpenAI key
    using basic regex pattern matching for both intents and summaries.
    """
    async def complete(self, system_prompt: str, user_message: str) -> str:
        user_message_lower = user_message.lower()

        # Check if this is an intent classification prompt
        if "whitelisted intents" in system_prompt or "count_available_seats" in system_prompt:
            return self._classify_intent(user_message_lower)
        else:
            return self._generate_summary(system_prompt)

    def _classify_intent(self, message: str) -> str:
        # Extract potential building
        building_match = re.search(r'(?:building|tower)\s+([a-zA-Z0-9]+)', message)
        building_code = building_match.group(1).upper() if building_match else None
        if not building_code:
            # Check individual letters/numbers if query is like "in Tower A" -> "A"
            for code in ["A", "B", "C", "D", "E", "F"]:
                if f"tower {code.lower()}" in message or f"building {code.lower()}" in message:
                    building_code = code
                    break

        # Extract potential floor
        floor_match = re.search(r'(?:floor|level)\s+(\d+)', message)
        floor_number = int(floor_match.group(1)) if floor_match else None

        # Extract department
        departments = ['engineering', 'qa', 'design', 'product', 'hr', 'finance', 'sales', 'operations']
        department = None
        for dept in departments:
            if dept in message:
                department = dept.capitalize()
                break

        # Extract project
        project_name = None
        # Look for "project X" or "on project X"
        project_match = re.search(r'project\s+([a-zA-Z0-9_\-\s]+)', message)
        if project_match:
            project_name = project_match.group(1).strip()
            # Clean up trailing punctuation or words
            project_name = re.split(r'\s+(?:in|on|at|for|joined|who|with|is)\s+', project_name)[0]
            project_name = project_name.rstrip('?.! ')
        elif "phoenix" in message:
            project_name = "Project Phoenix"
        elif "alpha" in message:
            project_name = "Project Alpha"

        # Determine Intent
        # 1. count_available_seats
        if any(w in message for w in ["available", "empty", "vacant", "how many seats"]) and "utilization" not in message:
            return json.dumps({
                "intent": "count_available_seats",
                "parameters": {
                    "building_code": building_code,
                    "floor_number": floor_number
                }
            })

        # 2. list_employees_by_project
        if "project" in message or project_name:
            return json.dumps({
                "intent": "list_employees_by_project",
                "parameters": {
                    "project_name": project_name or "Project Phoenix"
                }
            })

        # 3. utilization_by_building
        if any(w in message for w in ["utilization", "percentage", "occupancy"]):
            return json.dumps({
                "intent": "utilization_by_building",
                "parameters": {
                    "building_code": building_code
                }
            })

        # 4. employees_joined_in_period
        if any(w in message for w in ["joined", "new hire", "started"]):
            return json.dumps({
                "intent": "employees_joined_in_period",
                "parameters": {
                    "department": department,
                    "start_date": "2026-07-01",
                    "end_date": "2026-07-31"
                }
            })

        # 5. unassigned_employees
        if any(w in message for w in ["unassigned", "no seat", "without seat", "free employee"]):
            return json.dumps({
                "intent": "unassigned_employees",
                "parameters": {
                    "department": department
                }
            })

        return json.dumps({
            "intent": "unrecognized",
            "parameters": {}
        })

    def _generate_summary(self, system_prompt: str) -> str:
        # System prompt contains the database query result data. We can parse it and formulate a message.
        # Let's search for keywords in the prompt to understand the context.
        prompt_lower = system_prompt.lower()

        if "count_available_seats" in prompt_lower:
            # Try to extract the count of seats
            match = re.search(r"'count':\s*(\d+)", prompt_lower)
            count = match.group(1) if match else "some"
            
            # Floor / building details
            floor_match = re.search(r"'floor_number':\s*(\d+|None)", prompt_lower)
            building_match = re.search(r"'building_code':\s*'([^']+)'", prompt_lower)
            
            floor_str = f" Floor {floor_match.group(1)}" if floor_match and floor_match.group(1) != "None" else ""
            building_str = f" Building {building_match.group(1)}" if building_match else ""
            loc = f"in{building_str}{' on' if floor_str else ''}{floor_str}" if (building_str or floor_str) else "across the office"
            
            return f"I found {count} available seats {loc}."

        if "list_employees_by_project" in prompt_lower:
            proj_match = re.search(r"'project_name':\s*'([^']+)'", prompt_lower)
            proj = proj_match.group(1) if proj_match else "the project"
            
            # Count the list items
            # We can count instances of 'employee_code' or similar
            items_count = len(re.findall(r"'employee_code'", prompt_lower))
            return f"There are {items_count} active employees mapped to {proj}."

        if "utilization_by_building" in prompt_lower:
            b_match = re.search(r"'building_code':\s*'([^']+)'", prompt_lower)
            bld = b_match.group(1) if b_match else "all buildings"
            
            util_match = re.search(r"'utilization_percent':\s*([\d\.]+)", prompt_lower)
            util = f"{float(util_match.group(1)):.1f}%" if util_match else "0.0%"
            return f"The current seat utilization for Building {bld} is {util}."

        if "employees_joined_in_period" in prompt_lower:
            dept_match = re.search(r"'department':\s*'([^']+)'", prompt_lower)
            dept = f"in the {dept_match.group(1)} department" if dept_match and dept_match.group(1) != "None" else "across all departments"
            
            items_count = len(re.findall(r"'id'", prompt_lower))
            return f"I found {items_count} employees who joined {dept} during the specified period."

        if "unassigned_employees" in prompt_lower:
            dept_match = re.search(r"'department':\s*'([^']+)'", prompt_lower)
            dept = f"in the {dept_match.group(1)} department" if dept_match and dept_match.group(1) != "None" else "across the organization"
            
            items_count = len(re.findall(r"'id'", prompt_lower))
            return f"There are currently {items_count} unassigned employees {dept}."

        return "I could not retrieve a structured response. Please verify the query and try again."


class OpenAiClient(LlmClient):
    def __init__(self):
        self.api_key = settings.AI_API_KEY
        self.model = settings.AI_MODEL
        if self.api_key and self.api_key.strip() != "" and self.api_key != "your-openai-api-key-here":
            self.client = AsyncOpenAI(api_key=self.api_key)
        else:
            self.client = None

    async def complete(self, system_prompt: str, user_message: str) -> str:
        if not self.client:
            logger.warning("OpenAI client not configured or API key is placeholder. Falling back to MockLlmClient.")
            return await MockLlmClient().complete(system_prompt, user_message)

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.0,
                response_format={"type": "json_object"} if "JSON" in system_prompt else None
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"OpenAI error: {e}. Falling back to MockLlmClient.")
            return await MockLlmClient().complete(system_prompt, user_message)


def get_llm_client() -> LlmClient:
    if settings.AI_PROVIDER == "openai":
        return OpenAiClient()
    return MockLlmClient()

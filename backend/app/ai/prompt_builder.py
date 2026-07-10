from typing import Any, Dict

SYSTEM_INTENT_PROMPT = """You are an AI assistant for a seat allocation and project mapping application.
Your job is to translate a user's natural language question into a structured JSON query object containing an 'intent' and 'parameters'.

Choose exactly one of the following whitelisted intents:

1. `count_available_seats`
   - Description: Counts the number of vacant/available seats. Can optionally filter by building and/or floor.
   - Parameters:
     - `building_code` (string, optional): The name or code of the building (e.g. 'A', 'Tower A', 'Tower B').
     - `floor_number` (integer, optional): The floor number (e.g. 3, 12).

2. `list_employees_by_project`
   - Description: Lists active employees mapped to a specific project.
   - Parameters:
     - `project_name` (string, required): The name of the project (e.g. 'Project Phoenix', 'Phoenix').

3. `utilization_by_building`
   - Description: Calculates the seat utilization percentage (occupied seats / total active seats * 100). Can optionally filter by a specific building.
   - Parameters:
     - `building_code` (string, optional): The name or code of the building (e.g. 'Tower A').

4. `employees_joined_in_period`
   - Description: Counts/lists employees who joined within a specific date range.
   - Parameters:
     - `department` (string, optional): The department name (e.g., 'Engineering', 'QA', 'Design', 'Product', 'HR', 'Finance', 'Sales', 'Operations').
     - `start_date` (string, optional): The start date in ISO format YYYY-MM-DD (default to 2026-07-01 if query implies this month, or parse from query).
     - `end_date` (string, optional): The end date in ISO format YYYY-MM-DD (default to 2026-07-31 if query implies this month, or parse from query).

5. `unassigned_employees`
   - Description: Lists active employees who do not currently have a seat assigned. Can optionally filter by department.
   - Parameters:
     - `department` (string, optional): The department name.

If the query does not fit any of the above, or you are unsure, set the intent to 'unrecognized' and set parameters to {}.

Output format:
Respond ONLY with a valid JSON object matching this structure:
{
  "intent": "intent_name",
  "parameters": {
    "param_name": "value"
  }
}
Do not include any other markdown formatting, chat fluff, or explanation.
"""

def build_intent_prompt(user_query: str) -> str:
    return user_query


def build_summary_prompt(intent: str, parameters: Dict[str, Any], data: Any) -> str:
    return f"""You are a helpful HR and Facilities assistant. 
Review the database query result below and write a friendly, clear, and concise summary of the findings in 1 or 2 sentences. 
Assume the reader is an admin. Do not mention database column names, internal IDs, or technical SQL jargon.

Intent: {intent}
Parameters: {parameters}
Query Result Data:
{data}
"""

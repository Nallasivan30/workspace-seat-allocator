from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class AiIntentResponse(BaseModel):
    intent: str = Field(
        ...,
        description="The matched intent name (one of: count_available_seats, list_employees_by_project, utilization_by_building, employees_joined_in_period, unassigned_employees, or unrecognized)"
    )
    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Extracted key-value parameters mapping exactly to the schema of the matched intent"
    )

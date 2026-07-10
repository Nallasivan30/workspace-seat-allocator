from typing import Any, Dict, List
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.limiter import limiter
from app.deps import get_db, get_current_user
from app.models.user import User
from app.ai.service import AiService

router = APIRouter()
ai_service = AiService()


class AiQueryRequest(BaseModel):
    question: str = Field(..., min_length=2, description="The natural language question from the user")


class AiQueryResponse(BaseModel):
    intent: str
    parameters: Dict[str, Any]
    data: Any
    summary: str
    confidence: float


SUGGESTED_PROMPTS = [
    "How many seats are available on Floor 3 of Tower A?",
    "Which employees are on Project Phoenix?",
    "What is the seat utilization in Tower B?",
    "How many employees joined this month in Engineering?",
    "Show me unassigned employees in the Design department."
]


@router.post("/query", response_model=AiQueryResponse)
@limiter.limit("20/minute")
async def query_ai(
    request: Request,
    payload: AiQueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await ai_service.query(db, payload.question)
    return AiQueryResponse(**result)


@router.get("/suggested-prompts", response_model=List[str])
async def get_suggested_prompts(
    current_user: User = Depends(get_current_user)
):
    return SUGGESTED_PROMPTS

from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, get_current_user
from app.models.user import User
from app.services.dashboard_service import DashboardService

router = APIRouter()
dashboard_service = DashboardService()


@router.get("/summary", response_model=Dict[str, Any])
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await dashboard_service.get_summary(db)


@router.get("/utilization", response_model=List[Dict[str, Any]])
async def get_dashboard_utilization(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await dashboard_service.get_utilization(db)

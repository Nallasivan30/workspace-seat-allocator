from datetime import date, timedelta
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, get_current_user
from app.models.user import User
from app.services.analytics_service import AnalyticsService

router = APIRouter()
analytics_service = AnalyticsService()


@router.get("/projects", response_model=List[Dict[str, Any]])
async def get_projects_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await analytics_service.get_projects_analytics(db)


@router.get("/departments", response_model=List[Dict[str, Any]])
async def get_departments_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await analytics_service.get_departments_analytics(db)


@router.get("/seat-turnover", response_model=Dict[str, Any])
async def get_seat_turnover_analytics(
    start_date: Optional[date] = Query(None, description="Start date for analysis window (default: 30 days ago)"),
    end_date: Optional[date] = Query(None, description="End date for analysis window (default: today)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    return await analytics_service.get_seat_turnover(db, start_date, end_date)

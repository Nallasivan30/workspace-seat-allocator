from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, get_current_user
from app.models.user import User
from app.services.search_service import SearchService

router = APIRouter()
search_service = SearchService()


@router.get("")
async def search_global(
    q: str = Query(..., min_length=2, description="Search term, min 2 characters"),
    types: Optional[str] = Query(None, description="Comma-separated list of types to search: employees, seats, projects"),
    limit: int = Query(10, ge=1, le=100, description="Max results per entity type"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if len(q.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Search query 'q' must be at least 2 characters long."
        )
    return await search_service.global_search(db, q.strip(), types, limit)

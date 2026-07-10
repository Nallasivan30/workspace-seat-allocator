from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, require_viewer, require_admin
from app.schemas.building import BuildingCreate, BuildingUpdate, BuildingRead
from app.schemas.floor import FloorRead
from app.services.building_service import BuildingService
from app.services.floor_service import FloorService

router = APIRouter()
building_service = BuildingService()
floor_service = FloorService()


@router.get("", response_model=List[BuildingRead])
async def list_buildings(
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_viewer),
):
    return await building_service.list_buildings(db)


@router.get("/{id}/floors", response_model=List[FloorRead])
async def list_building_floors(
    id: int,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_viewer),
):
    return await floor_service.list_by_building(db, id)


@router.post("", response_model=BuildingRead, status_code=status.HTTP_201_CREATED)
async def create_building(
    data: BuildingCreate,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_admin),
):
    return await building_service.create_building(db, data)


@router.patch("/{id}", response_model=BuildingRead)
async def update_building(
    id: int,
    data: BuildingUpdate,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_admin),
):
    return await building_service.update_building(db, id, data)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_building(
    id: int,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_admin),
):
    await building_service.delete_building(db, id)

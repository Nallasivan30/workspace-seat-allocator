from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import jwt

from app.core.config import settings
from app.core.db import SessionLocal
from app.core.security import decode_token, ALGORITHM
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_user_token_payload(
    token: str = Depends(oauth2_scheme),
) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise credentials_exception
    return payload


async def get_current_active_user_payload(
    payload: dict = Depends(get_current_user_token_payload)
) -> dict:
    return payload


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(get_current_active_user_payload)
) -> User:
    stmt = select(User).where(User.email == payload.get("sub"), User.is_active == True)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or deactivated"
        )
    return user


class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(
        self,
        payload: dict = Depends(get_current_active_user_payload)
    ) -> dict:
        role = payload.get("role")
        if role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The user doesn't have enough privileges",
            )
        return payload


require_admin = RoleChecker(["admin"])
require_viewer = RoleChecker(["admin", "viewer"])

from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.core.security import verify_password, create_access_token


class AuthService:
    async def authenticate(
        self, db: AsyncSession, email: str, password: str
    ) -> Optional[User]:
        stmt = select(User).where(User.email == email, User.is_active == True)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def create_token(self, user: User) -> str:
        return create_access_token(subject=user.email, role=user.role)

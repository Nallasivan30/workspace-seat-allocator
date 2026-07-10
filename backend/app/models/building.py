from datetime import datetime
from typing import List
from sqlalchemy import BigInteger, String, Boolean, DateTime, Text, Integer, func, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class Building(Base):
    __tablename__ = "buildings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    code: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        index=True,
        nullable=False,
    )
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_floors: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    floors: Mapped[List["Floor"]] = relationship(
        "Floor", back_populates="building", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint(
            "code ~ '^[A-Z0-9-]+$'",
            name="building_code_check",
        ),
    )

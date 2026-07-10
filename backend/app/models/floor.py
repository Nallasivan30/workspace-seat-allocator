from datetime import datetime
from typing import List
from sqlalchemy import BigInteger, String, Boolean, DateTime, Integer, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class Floor(Base):
    __tablename__ = "floors"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    building_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("buildings.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    floor_number: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    total_seats: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
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
    building: Mapped["Building"] = relationship("Building", back_populates="floors")
    seats: Mapped[List["Seat"]] = relationship(
        "Seat", back_populates="floor", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("building_id", "floor_number", name="uq_building_floor"),
    )

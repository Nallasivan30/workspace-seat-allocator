from datetime import datetime
from typing import List, Optional
from sqlalchemy import BigInteger, String, Boolean, DateTime, ForeignKey, UniqueConstraint, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class Seat(Base):
    __tablename__ = "seats"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    floor_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("floors.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    seat_code: Mapped[str] = mapped_column(String(30), nullable=False)
    seat_type: Mapped[str] = mapped_column(String(20), default="standard", nullable=False)  # standard / workstation / cabin / hotdesk
    status: Mapped[str] = mapped_column(String(20), default="available", nullable=False, index=True)  # available / occupied / reserved / maintenance
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
    floor: Mapped["Floor"] = relationship("Floor", back_populates="seats")
    assignments: Mapped[List["SeatAssignment"]] = relationship(
        "SeatAssignment", back_populates="seat", cascade="all, delete"
    )

    @property
    def current_assignment(self):
        for a in self.assignments:
            if a.released_at is None:
                return a
        return None

    __table_args__ = (
        UniqueConstraint("floor_id", "seat_code", name="uq_floor_seat_code"),
        CheckConstraint(
            "status IN ('available', 'occupied', 'reserved', 'maintenance')",
            name="seat_status_check",
        ),
    )

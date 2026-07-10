from datetime import datetime
from sqlalchemy import BigInteger, DateTime, ForeignKey, Text, Index, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class SeatAssignment(Base):
    __tablename__ = "seat_assignments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    seat_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("seats.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    released_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    assigned_by_user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    seat: Mapped["Seat"] = relationship("Seat", back_populates="assignments")
    employee: Mapped["Employee"] = relationship("Employee", back_populates="assignments")
    assigned_by: Mapped["User"] = relationship("User")
    release_log: Mapped["SeatReleaseLog"] = relationship(
        "SeatReleaseLog", back_populates="assignment", uselist=False, cascade="all, delete-orphan"
    )

    @property
    def seat_code(self) -> str | None:
        return self.seat.seat_code if self.seat else None

    @property
    def building_name(self) -> str | None:
        return self.seat.floor.building.name if self.seat and self.seat.floor and self.seat.floor.building else None

    @property
    def floor_number(self) -> int | None:
        return self.seat.floor.floor_number if self.seat and self.seat.floor else None

    @property
    def allocated_at(self) -> datetime:
        return self.assigned_at

    @property
    def release_reason(self) -> str | None:
        return self.release_log.reason if self.release_log else None

    @property
    def release_notes(self) -> str | None:
        return self.release_log.notes if self.release_log else None

    __table_args__ = (
        # Enforce at most one active occupant per seat
        Index(
            "uq_active_seat_occupant",
            "seat_id",
            unique=True,
            postgresql_where=text("released_at IS NULL"),
        ),
        # Enforce at most one active seat per employee
        Index(
            "uq_active_employee_seat",
            "employee_id",
            unique=True,
            postgresql_where=text("released_at IS NULL"),
        ),
    )

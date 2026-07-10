from datetime import datetime
from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class SeatReleaseLog(Base):
    __tablename__ = "seat_release_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    seat_assignment_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("seat_assignments.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    released_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    released_by_user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reason: Mapped[str] = mapped_column(String(50), nullable=False)  # resigned / relocated / project_change / other
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    assignment: Mapped["SeatAssignment"] = relationship(
        "SeatAssignment", back_populates="release_log"
    )
    released_by: Mapped["User"] = relationship("User")

    __table_args__ = (
        CheckConstraint(
            "reason IN ('resigned', 'relocated', 'project_change', 'other')",
            name="seat_release_reason_check",
        ),
    )

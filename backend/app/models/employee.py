from datetime import datetime, date
from typing import List, Optional
from sqlalchemy import BigInteger, String, Boolean, DateTime, Date, ForeignKey, UniqueConstraint, CheckConstraint, Index, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    employee_code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    department: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    designation: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False, index=True)  # active / on_leave / exited
    joining_date: Mapped[date] = mapped_column(Date, nullable=False)
    exit_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    reporting_manager_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )
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
    reporting_manager: Mapped[Optional["Employee"]] = relationship(
        "Employee",
        remote_side=[id],
        back_populates="direct_reports",
    )
    direct_reports: Mapped[List["Employee"]] = relationship(
        "Employee",
        back_populates="reporting_manager",
    )
    projects: Mapped[List["EmployeeProject"]] = relationship(
        "EmployeeProject", back_populates="employee", cascade="all, delete-orphan"
    )
    assignments: Mapped[List["SeatAssignment"]] = relationship(
        "SeatAssignment", back_populates="employee", cascade="all, delete-orphan"
    )

    @property
    def current_seat(self):
        for a in self.assignments:
            if a.released_at is None:
                return a.seat
        return None

    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'on_leave', 'exited')",
            name="employee_status_check",
        ),
        # Trigram index for search on full name
        Index(
            "ix_employee_full_name_trgm",
            text("(first_name || ' ' || last_name)"),
            postgresql_using="gin",
            postgresql_ops={None: "gin_trgm_ops"},
        ),
    )

from datetime import datetime, date
from sqlalchemy import BigInteger, SmallInteger, String, DateTime, Date, ForeignKey, UniqueConstraint, CheckConstraint, Index, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class EmployeeProject(Base):
    __tablename__ = "employee_projects"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role_on_project: Mapped[str] = mapped_column(String(80), nullable=False)
    allocation_percent: Mapped[int] = mapped_column(
        SmallInteger, default=100, nullable=False
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

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
    employee: Mapped["Employee"] = relationship("Employee", back_populates="projects")
    project: Mapped["Project"] = relationship("Project", back_populates="employees")

    __table_args__ = (
        UniqueConstraint(
            "employee_id", "project_id", "start_date", name="uq_employee_project_start"
        ),
        CheckConstraint(
            "allocation_percent BETWEEN 1 AND 100",
            name="employee_project_allocation_check",
        ),
        # Partial index on employee_id for active projects (end_date IS NULL)
        Index(
            "ix_employee_projects_active_employee",
            "employee_id",
            postgresql_where=text("end_date IS NULL"),
        ),
    )

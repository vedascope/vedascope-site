from __future__ import annotations

import uuid
from datetime import date, datetime, time

from sqlalchemy import Date, DateTime, Float, ForeignKey, Index, String, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import GUID


class BirthChart(Base):
    __tablename__ = "birth_charts"
    __table_args__ = (Index("ix_birth_charts_user_id", "user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    chart_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    person_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)
    birth_time: Mapped[time] = mapped_column(Time, nullable=False)
    birth_datetime_utc: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    birth_timezone: Mapped[str] = mapped_column(String(128), nullable=False)
    birth_place_name: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    ayanamsa: Mapped[str] = mapped_column(String(64), default="lahiri", server_default="lahiri", nullable=False)
    house_system: Mapped[str | None] = mapped_column(String(64), nullable=True)
    node_type: Mapped[str] = mapped_column(String(32), default="mean", server_default="mean", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="birth_charts")
    astro_calculations: Mapped[list["AstroCalculation"]] = relationship(back_populates="chart")

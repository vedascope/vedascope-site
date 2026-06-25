from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AstroCalculation(Base):
    __tablename__ = "astro_calculations"
    __table_args__ = (
        Index("ix_astro_calculations_user_id", "user_id"),
        Index("ix_astro_calculations_chart_id", "chart_id"),
        Index("ix_astro_calculations_input_hash", "input_hash"),
        Index("ix_astro_calculations_type_key", "calculation_type", "calculation_key"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    chart_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("birth_charts.id", ondelete="SET NULL"), nullable=True)
    calculation_type: Mapped[str] = mapped_column(String(64), nullable=False)
    calculation_key: Mapped[str] = mapped_column(String(255), nullable=False)
    input_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    settings_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    result_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    engine_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    algorithm_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    input_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship(back_populates="astro_calculations")
    chart: Mapped["BirthChart | None"] = relationship(back_populates="astro_calculations")

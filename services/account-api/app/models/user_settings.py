from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import GUID, JSONBType


class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    language: Mapped[str] = mapped_column(String(16), default="ru", server_default="ru", nullable=False)
    timezone: Mapped[str | None] = mapped_column(String(128), nullable=True)
    default_ayanamsa: Mapped[str] = mapped_column(String(64), default="lahiri", server_default="lahiri", nullable=False)
    default_house_system: Mapped[str | None] = mapped_column(String(64), nullable=True)
    default_node_type: Mapped[str] = mapped_column(String(32), default="mean", server_default="mean", nullable=False)
    calculation_preferences_json: Mapped[dict[str, Any] | None] = mapped_column(JSONBType, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="settings")

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class UserSettingsUpdate(BaseModel):
    language: str | None = None
    timezone: str | None = None
    default_ayanamsa: str | None = None
    default_house_system: str | None = None
    default_node_type: str | None = None
    calculation_preferences_json: dict[str, Any] | None = None


class UserSettingsRead(BaseModel):
    id: UUID
    user_id: UUID
    language: str
    timezone: str | None
    default_ayanamsa: str
    default_house_system: str | None
    default_node_type: str
    calculation_preferences_json: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

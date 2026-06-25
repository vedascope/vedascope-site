from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class UserProfileRead(BaseModel):
    id: UUID
    email: str | None
    phone: str | None
    display_name: str | None
    created_at: datetime
    updated_at: datetime
    last_login_at: datetime | None

    model_config = ConfigDict(from_attributes=True)

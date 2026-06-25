from datetime import date, datetime, time
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BirthChartBase(BaseModel):
    chart_name: str | None = None
    person_name: str | None = None
    birth_date: date
    birth_time: time
    birth_timezone: str
    birth_place_name: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    ayanamsa: str = "lahiri"
    house_system: str | None = None
    node_type: Literal["mean", "true"] = "mean"


class BirthChartCreate(BirthChartBase):
    pass


class BirthChartUpdate(BaseModel):
    chart_name: str | None = None
    person_name: str | None = None
    birth_date: date | None = None
    birth_time: time | None = None
    birth_timezone: str | None = None
    birth_place_name: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    ayanamsa: str | None = None
    house_system: str | None = None
    node_type: Literal["mean", "true"] | None = None


class BirthChartRead(BirthChartBase):
    id: UUID
    user_id: UUID
    birth_datetime_utc: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BirthChartDeleteResponse(BaseModel):
    status: str
    id: UUID

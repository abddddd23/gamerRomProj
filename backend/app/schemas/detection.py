from datetime import datetime

from pydantic import BaseModel, Field

from app.models import DetectionEventType
from app.schemas.common import ORMModel
from app.schemas.session import SessionRead


class DetectionEventCreate(BaseModel):
    post_id: int
    session_id: int | None = None
    detected_game: str | None = Field(default=None, max_length=160)
    game_type: str | None = Field(default=None, max_length=120)
    event_type: DetectionEventType
    duration_seconds: float | None = Field(default=None, ge=0)
    billed_hours: int | None = Field(default=None, ge=1)
    session_start_time: datetime | None = None
    session_end_time: datetime | None = None


class DetectionEventRead(ORMModel):
    id: int
    post_id: int
    session_id: int | None
    detected_game: str | None
    game_type: str | None
    event_type: DetectionEventType
    duration_seconds: float | None
    billed_hours: int | None
    session_start_time: datetime | None
    session_end_time: datetime | None
    created_at: datetime


class DetectionEventResult(BaseModel):
    event: DetectionEventRead
    session: SessionRead | None = None

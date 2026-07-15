from datetime import datetime

from pydantic import BaseModel, Field

from app.models import PaymentStatus, SessionStatus
from app.schemas.common import ORMModel
from app.schemas.game import GameRead
from app.schemas.post import PostRead
from app.schemas.worker import WorkerRead


class SessionStart(BaseModel):
    post_id: int
    game_id: int | None = None
    client_name: str | None = Field(default=None, max_length=160)


class SessionGameUpdate(BaseModel):
    game_id: int


class SessionCancel(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


class SessionRead(ORMModel):
    id: int
    post_id: int
    game_id: int | None
    worker_id: int
    client_name: str | None
    start_time: datetime
    end_time: datetime | None
    status: SessionStatus
    declared_match_count: int
    detected_match_count: int
    manual_adjustment_count: int
    price_per_unit: float
    expected_amount: float
    paid_amount: float
    difference_amount: float
    payment_status: PaymentStatus
    notes: str | None
    created_at: datetime
    post: PostRead | None = None
    game: GameRead | None = None
    worker: WorkerRead | None = None

from datetime import datetime

from pydantic import BaseModel, Field

from app.models import AlertStatus, AlertType
from app.schemas.common import ORMModel


class AlertUpdate(BaseModel):
    status: AlertStatus | None = None
    note: str | None = Field(default=None, max_length=1000)


class AlertRead(ORMModel):
    id: int
    session_id: int
    post_id: int
    worker_id: int | None = None
    alert_type: AlertType
    expected_amount: float
    paid_amount: float
    difference_amount: float
    status: AlertStatus
    note: str | None
    created_at: datetime
    resolved_at: datetime | None

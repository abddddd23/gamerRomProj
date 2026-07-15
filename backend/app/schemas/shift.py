from datetime import datetime

from pydantic import BaseModel, Field

from app.models import ShiftStatus
from app.schemas.common import ORMModel


class ShiftClose(BaseModel):
    declared_cash: float = Field(ge=0)


class ShiftRead(ORMModel):
    id: int
    worker_id: int
    start_time: datetime
    end_time: datetime | None
    expected_revenue: float
    declared_cash: float
    actual_paid_revenue: float
    difference_amount: float
    status: ShiftStatus

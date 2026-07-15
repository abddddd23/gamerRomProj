from datetime import datetime

from pydantic import BaseModel, Field

from app.models import PaymentMethod
from app.schemas.common import ORMModel


class PaymentCreate(BaseModel):
    session_id: int
    amount: float = Field(gt=0)
    method: PaymentMethod = PaymentMethod.cash
    reason: str | None = Field(default=None, max_length=255)


class PaymentRead(ORMModel):
    id: int
    session_id: int
    worker_id: int
    amount: float
    method: PaymentMethod
    reason: str | None
    created_at: datetime

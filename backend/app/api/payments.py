from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import require_worker_or_admin
from app.db.session import get_db
from app.models import Payment, Worker
from app.schemas import PaymentCreate, PaymentRead
from app.services.payment_service import add_payment


router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
def create_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: Worker = Depends(require_worker_or_admin),
) -> Payment:
    return add_payment(db, current_user, payload)


@router.get("/session/{session_id}", response_model=list[PaymentRead])
def list_session_payments(
    session_id: int,
    db: Session = Depends(get_db),
    _: Worker = Depends(require_worker_or_admin),
) -> list[Payment]:
    return list(db.scalars(select(Payment).where(Payment.session_id == session_id).order_by(Payment.created_at.desc())))

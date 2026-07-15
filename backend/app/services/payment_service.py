from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Payment, SessionStatus, Worker
from app.schemas import PaymentCreate
from app.services.session_service import evaluate_session_alerts, get_session_or_404, recalculate_session


def add_payment(db: Session, current_user: Worker, payload: PaymentCreate) -> Payment:
    session = get_session_or_404(db, payload.session_id)
    if session.status == SessionStatus.cancelled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot add payment to cancelled session")

    payment = Payment(
        session_id=session.id,
        worker_id=current_user.id,
        amount=payload.amount,
        method=payload.method,
        reason=payload.reason,
    )
    session.paid_amount = round((session.paid_amount or 0) + payload.amount, 2)
    recalculate_session(session)
    evaluate_session_alerts(db, session)
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment

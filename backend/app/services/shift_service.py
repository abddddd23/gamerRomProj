from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import GamingSession, Role, SessionStatus, Shift, ShiftStatus, Worker
from app.schemas import ShiftClose


def get_open_shift(db: Session, worker_id: int) -> Shift | None:
    return db.scalar(select(Shift).where(Shift.worker_id == worker_id, Shift.status == ShiftStatus.open))


def open_shift(db: Session, current_user: Worker) -> Shift:
    existing = get_open_shift(db, current_user.id)
    if existing:
        return existing

    shift = Shift(worker_id=current_user.id)
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return shift


def close_shift(db: Session, current_user: Worker, shift_id: int, payload: ShiftClose) -> Shift:
    shift = db.get(Shift, shift_id)
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
    if shift.worker_id != current_user.id and current_user.role != Role.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot close another worker shift")
    if shift.status == ShiftStatus.closed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot close shift twice")

    end_time = datetime.utcnow()
    revenue = db.execute(
        select(
            func.coalesce(func.sum(GamingSession.expected_amount), 0),
            func.coalesce(func.sum(GamingSession.paid_amount), 0),
        ).where(
            GamingSession.worker_id == shift.worker_id,
            GamingSession.start_time >= shift.start_time,
            GamingSession.start_time <= end_time,
            GamingSession.status != SessionStatus.cancelled,
        )
    ).one()

    expected_revenue = float(revenue[0] or 0)
    paid_revenue = float(revenue[1] or 0)
    shift.end_time = end_time
    shift.expected_revenue = round(expected_revenue, 2)
    shift.actual_paid_revenue = round(paid_revenue, 2)
    shift.declared_cash = round(payload.declared_cash, 2)
    shift.difference_amount = round(shift.declared_cash - shift.expected_revenue, 2)
    shift.status = ShiftStatus.closed
    db.commit()
    db.refresh(shift)
    return shift

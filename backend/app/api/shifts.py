from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import require_worker_or_admin
from app.db.session import get_db
from app.models import Shift, Worker
from app.schemas import ShiftClose, ShiftRead
from app.services.shift_service import close_shift, get_open_shift, open_shift


router = APIRouter(prefix="/shifts", tags=["shifts"])


@router.post("/open", response_model=ShiftRead)
def open_worker_shift(
    db: Session = Depends(get_db),
    current_user: Worker = Depends(require_worker_or_admin),
) -> Shift:
    return open_shift(db, current_user)


@router.get("/current", response_model=ShiftRead | None)
def current_shift(
    db: Session = Depends(get_db),
    current_user: Worker = Depends(require_worker_or_admin),
) -> Shift | None:
    return get_open_shift(db, current_user.id)


@router.post("/{shift_id}/close", response_model=ShiftRead)
def close_worker_shift(
    shift_id: int,
    payload: ShiftClose,
    db: Session = Depends(get_db),
    current_user: Worker = Depends(require_worker_or_admin),
) -> Shift:
    return close_shift(db, current_user, shift_id, payload)


@router.get("", response_model=list[ShiftRead])
def list_shifts(db: Session = Depends(get_db), current_user: Worker = Depends(require_worker_or_admin)) -> list[Shift]:
    stmt = select(Shift).order_by(Shift.start_time.desc())
    if current_user.role.value != "admin":
        stmt = stmt.where(Shift.worker_id == current_user.id)
    return list(db.scalars(stmt))

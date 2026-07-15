from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_worker_or_admin
from app.db.session import get_db
from app.models import Worker
from app.schemas import SessionCancel, SessionGameUpdate, SessionRead, SessionStart
from app.services import session_service


router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/start", response_model=SessionRead)
def start_session(
    payload: SessionStart,
    db: Session = Depends(get_db),
    current_user: Worker = Depends(require_worker_or_admin),
):
    return session_service.start_session(db, current_user, payload)


@router.patch("/{session_id}/game", response_model=SessionRead)
def assign_game(
    session_id: int,
    payload: SessionGameUpdate,
    db: Session = Depends(get_db),
    _: Worker = Depends(require_worker_or_admin),
):
    return session_service.assign_game(db, session_id, payload)


@router.post("/{session_id}/declared-match", response_model=SessionRead)
def increment_declared_match(
    session_id: int,
    db: Session = Depends(get_db),
    _: Worker = Depends(require_worker_or_admin),
):
    return session_service.increment_declared_match(db, session_id)


@router.post("/{session_id}/finish", response_model=SessionRead)
def finish_session(
    session_id: int,
    db: Session = Depends(get_db),
    _: Worker = Depends(require_worker_or_admin),
):
    return session_service.finish_session(db, session_id)


@router.post("/{session_id}/cancel", response_model=SessionRead)
def cancel_session(
    session_id: int,
    payload: SessionCancel,
    db: Session = Depends(get_db),
    _: Worker = Depends(require_worker_or_admin),
):
    return session_service.cancel_session(db, session_id, payload)


@router.get("/active", response_model=list[SessionRead])
def list_active_sessions(db: Session = Depends(get_db), _: Worker = Depends(require_worker_or_admin)):
    return session_service.active_sessions(db)


@router.get("", response_model=list[SessionRead])
def list_session_history(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    worker_id: int | None = None,
    post_id: int | None = None,
    game_id: int | None = None,
    db: Session = Depends(get_db),
    _: Worker = Depends(require_worker_or_admin),
):
    return session_service.session_history(db, start_date, end_date, worker_id, post_id, game_id)

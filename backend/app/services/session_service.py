from datetime import datetime
from math import ceil

from fastapi import HTTPException, status
from sqlalchemy import Select, select
from sqlalchemy.orm import Session, joinedload

from app.models import (
    AlertType,
    Game,
    GamingSession,
    PaymentStatus,
    Post,
    PostStatus,
    PricingMode,
    SessionStatus,
    Worker,
)
from app.schemas import SessionCancel, SessionGameUpdate, SessionStart
from app.services.alert_service import create_alert_if_missing


DEFAULT_BILLING_UNIT_MINUTES = 20


def get_session_or_404(db: Session, session_id: int) -> GamingSession:
    session = db.scalar(
        select(GamingSession)
        .options(joinedload(GamingSession.post), joinedload(GamingSession.game), joinedload(GamingSession.worker))
        .where(GamingSession.id == session_id)
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


def get_active_session_for_post(db: Session, post_id: int) -> GamingSession | None:
    return db.scalar(
        select(GamingSession)
        .where(GamingSession.post_id == post_id, GamingSession.status == SessionStatus.active)
        .order_by(GamingSession.start_time.desc())
    )


def get_time_billing_unit_minutes(game: Game) -> int:
    return game.billing_unit_minutes or DEFAULT_BILLING_UNIT_MINUTES


def get_price_per_time_unit(game: Game) -> float:
    if game.price_per_time_unit is not None:
        return game.price_per_time_unit
    if game.price_per_hour is not None:
        return game.price_per_hour / 3
    return 0.0


def calculate_billed_units(duration_seconds: float | None, billing_unit_minutes: int | None = None) -> int:
    unit_minutes = billing_unit_minutes or DEFAULT_BILLING_UNIT_MINUTES
    duration_minutes = max((duration_seconds or 0) / 60, 0)
    return max(1, ceil(duration_minutes / unit_minutes))


def recalculate_session(session: GamingSession) -> GamingSession:
    expected_amount = 0.0
    price_per_unit = 0.0
    declared_count = session.declared_match_count or 0
    detected_count = session.detected_match_count or 0
    paid_amount = session.paid_amount or 0.0

    session.declared_match_count = declared_count
    session.detected_match_count = detected_count
    session.manual_adjustment_count = session.manual_adjustment_count or 0
    session.paid_amount = round(paid_amount, 2)

    if session.game:
        if session.game.pricing_mode == PricingMode.per_match:
            price_per_unit = session.game.price_per_match or 0.0
            count = detected_count if detected_count > 0 else declared_count
            expected_amount = count * price_per_unit
        elif session.game.pricing_mode == PricingMode.per_time:
            price_per_unit = get_price_per_time_unit(session.game)
            session.start_time = session.start_time or datetime.utcnow()
            end_time = session.end_time or datetime.utcnow()
            duration_seconds = max((end_time - session.start_time).total_seconds(), 0)
            billed_units = calculate_billed_units(duration_seconds, get_time_billing_unit_minutes(session.game))
            expected_amount = billed_units * price_per_unit

    session.price_per_unit = round(price_per_unit, 2)
    session.expected_amount = round(expected_amount, 2)
    session.difference_amount = round(paid_amount - session.expected_amount, 2)

    if session.expected_amount <= 0:
        session.payment_status = PaymentStatus.paid if paid_amount > 0 else PaymentStatus.unpaid
    elif paid_amount <= 0:
        session.payment_status = PaymentStatus.unpaid
    elif paid_amount < session.expected_amount:
        session.payment_status = PaymentStatus.partial
    else:
        session.payment_status = PaymentStatus.paid

    return session


def evaluate_session_alerts(db: Session, session: GamingSession) -> None:
    if session.detected_match_count > session.declared_match_count:
        create_alert_if_missing(db, session, AlertType.count_mismatch)
    if session.manual_adjustment_count != 0:
        create_alert_if_missing(db, session, AlertType.manual_override)
    if session.status == SessionStatus.finished:
        if session.paid_amount < session.expected_amount:
            create_alert_if_missing(db, session, AlertType.underpaid)
        elif session.paid_amount > session.expected_amount and session.expected_amount > 0:
            create_alert_if_missing(db, session, AlertType.overpaid)


def start_session(db: Session, current_user: Worker | None, payload: SessionStart) -> GamingSession:
    post = db.get(Post, payload.post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.status in {PostStatus.playing, PostStatus.maintenance} or get_active_session_for_post(db, post.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Post is not available")

    game = db.get(Game, payload.game_id) if payload.game_id else None
    if payload.game_id and (not game or not game.is_active):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active game not found")

    session = GamingSession(
        post_id=post.id,
        game_id=game.id if game else None,
        worker_id=current_user.id if current_user else None,
        client_name=payload.client_name,
        game=game,
    )
    post.status = PostStatus.playing
    recalculate_session(session)
    db.add(session)
    db.commit()
    db.refresh(session)
    return get_session_or_404(db, session.id)


def assign_game(db: Session, session_id: int, payload: SessionGameUpdate) -> GamingSession:
    session = get_session_or_404(db, session_id)
    if session.status == SessionStatus.cancelled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change a cancelled session")
    game = db.get(Game, payload.game_id)
    if not game or not game.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active game not found")
    session.game = game
    session.game_id = game.id
    recalculate_session(session)
    evaluate_session_alerts(db, session)
    db.commit()
    db.refresh(session)
    return get_session_or_404(db, session.id)


def increment_declared_match(db: Session, session_id: int) -> GamingSession:
    session = get_session_or_404(db, session_id)
    if session.status != SessionStatus.active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only active sessions can be updated")
    session.declared_match_count += 1
    recalculate_session(session)
    evaluate_session_alerts(db, session)
    db.commit()
    db.refresh(session)
    return get_session_or_404(db, session.id)


def finish_session(db: Session, session_id: int) -> GamingSession:
    session = get_session_or_404(db, session_id)
    if session.status == SessionStatus.finished:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is already finished")
    if session.status == SessionStatus.cancelled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot finish a cancelled session")

    session.status = SessionStatus.finished
    session.end_time = datetime.utcnow()
    if session.post:
        session.post.status = PostStatus.free
    recalculate_session(session)
    evaluate_session_alerts(db, session)
    db.commit()
    db.refresh(session)
    return get_session_or_404(db, session.id)


def cancel_session(db: Session, session_id: int, payload: SessionCancel) -> GamingSession:
    session = get_session_or_404(db, session_id)
    if session.status != SessionStatus.active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only active sessions can be cancelled")
    session.status = SessionStatus.cancelled
    session.end_time = datetime.utcnow()
    session.notes = f"Cancelled: {payload.reason}" if not session.notes else f"{session.notes}\nCancelled: {payload.reason}"
    if session.post:
        session.post.status = PostStatus.free
    recalculate_session(session)
    db.commit()
    db.refresh(session)
    return get_session_or_404(db, session.id)


def active_sessions(db: Session) -> list[GamingSession]:
    return list(
        db.scalars(
            select(GamingSession)
            .options(joinedload(GamingSession.post), joinedload(GamingSession.game), joinedload(GamingSession.worker))
            .where(GamingSession.status == SessionStatus.active)
            .order_by(GamingSession.start_time.desc())
        )
    )


def session_history(
    db: Session,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    worker_id: int | None = None,
    post_id: int | None = None,
    game_id: int | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[GamingSession]:
    stmt: Select[tuple[GamingSession]] = (
        select(GamingSession)
        .options(joinedload(GamingSession.post), joinedload(GamingSession.game), joinedload(GamingSession.worker))
        .order_by(GamingSession.start_time.desc())
    )
    if start_date:
        stmt = stmt.where(GamingSession.start_time >= start_date)
    if end_date:
        stmt = stmt.where(GamingSession.start_time <= end_date)
    if worker_id:
        stmt = stmt.where(GamingSession.worker_id == worker_id)
    if post_id:
        stmt = stmt.where(GamingSession.post_id == post_id)
    if game_id:
        stmt = stmt.where(GamingSession.game_id == game_id)
    return list(db.scalars(stmt.offset(max(offset, 0)).limit(max(limit, 1))))

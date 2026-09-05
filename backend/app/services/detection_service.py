from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    AlertType,
    DetectionEvent,
    DetectionEventType,
    Game,
    GamingSession,
    PaymentStatus,
    PostStatus,
    PricingMode,
    SessionStatus,
)
from app.schemas import DetectionEventCreate, SessionStart
from app.services.alert_service import create_alert_if_missing
from app.services.session_service import (
    calculate_billed_units,
    evaluate_session_alerts,
    get_active_session_for_post,
    get_price_per_time_unit,
    get_session_or_404,
    get_time_billing_unit_minutes,
    recalculate_session,
    start_session,
)


AI_GAME_LABELS = {
    "FC": "FIFA",
    "eFootball": "eFootball",
    "GTA": "GTA",
    "MK": "Mortal Kombat",
}


def resolve_ai_game(db: Session, game_label: str | None) -> Game | None:
    if not game_label:
        return None

    candidates = [game_label]
    mapped_name = AI_GAME_LABELS.get(game_label)
    if mapped_name and mapped_name not in candidates:
        candidates.append(mapped_name)

    for candidate in candidates:
        game = db.scalar(select(Game).where(Game.ai_label == candidate))
        if game:
            return game

    for candidate in candidates:
        game = db.scalar(select(Game).where(Game.name == candidate))
        if game:
            return game

    return None


def _target_session(db: Session, payload: DetectionEventCreate) -> GamingSession | None:
    if payload.session_id:
        return get_session_or_404(db, payload.session_id)
    return get_active_session_for_post(db, payload.post_id)


def _attach_game_if_missing(session: GamingSession | None, game: Game | None) -> None:
    if session and game and not session.game_id:
        session.game = game
        session.game_id = game.id
        recalculate_session(session)


def _duration_from_payload(payload: DetectionEventCreate) -> float | None:
    if payload.duration_seconds is not None:
        return payload.duration_seconds
    if payload.session_start_time and payload.session_end_time:
        return max((payload.session_end_time - payload.session_start_time).total_seconds(), 0)
    return None


def _apply_payment_status(session: GamingSession) -> None:
    paid_amount = session.paid_amount or 0.0
    if session.expected_amount <= 0:
        session.payment_status = PaymentStatus.paid if paid_amount > 0 else PaymentStatus.unpaid
    elif paid_amount <= 0:
        session.payment_status = PaymentStatus.unpaid
    elif paid_amount < session.expected_amount:
        session.payment_status = PaymentStatus.partial
    else:
        session.payment_status = PaymentStatus.paid


def _update_time_based_amount(session: GamingSession, duration_seconds: float | None) -> None:
    if not session.game or session.game.pricing_mode != PricingMode.per_time:
        recalculate_session(session)
        return

    if duration_seconds is None:
        if not session.start_time or not session.end_time:
            recalculate_session(session)
            return
        duration_seconds = max((session.end_time - session.start_time).total_seconds(), 0)

    billing_unit_minutes = get_time_billing_unit_minutes(session.game)
    billed_units = calculate_billed_units(duration_seconds, billing_unit_minutes)
    price_per_time_unit = get_price_per_time_unit(session.game)
    session.price_per_unit = round(price_per_time_unit, 2)
    session.expected_amount = round(billed_units * price_per_time_unit, 2)
    session.paid_amount = round(session.paid_amount or 0.0, 2)
    session.difference_amount = round(session.paid_amount - session.expected_amount, 2)
    _apply_payment_status(session)


def create_detection_event(db: Session, payload: DetectionEventCreate) -> tuple[DetectionEvent, object | None]:
    session = _target_session(db, payload)
    game = resolve_ai_game(db, payload.detected_game) or resolve_ai_game(db, payload.game_type)

    if payload.event_type == DetectionEventType.session_started:
        if not session:
            session_payload = SessionStart(
                post_id=payload.post_id,
                game_id=game.id if game else None,
                client_name=None,
            )
            session = start_session(db, None, session_payload)
        elif game and not session.game_id:
            session.game = game
            session.game_id = game.id
            recalculate_session(session)

    if payload.event_type == DetectionEventType.match_ended and not session:
        session_payload = SessionStart(
            post_id=payload.post_id,
            game_id=game.id if game else None,
            client_name=None,
        )
        session = start_session(db, None, session_payload)

    _attach_game_if_missing(session, game)
    duration_seconds = _duration_from_payload(payload)

    # Camera workers often retry the same frame.  Ignore a repeated match-ending
    # signal for the same session during the configured cooldown, while retaining
    # the original audit event.
    if payload.event_type == DetectionEventType.match_ended and session:
        from app.core.config import get_settings
        since = datetime.utcnow() - timedelta(seconds=get_settings().ai_event_cooldown_seconds)
        recent = db.scalar(select(DetectionEvent.id).where(
            DetectionEvent.session_id == session.id,
            DetectionEvent.event_type == DetectionEventType.match_ended,
            DetectionEvent.game_type == payload.game_type,
            DetectionEvent.created_at >= since,
        ).limit(1))
        if recent:
            return db.get(DetectionEvent, recent), get_session_or_404(db, session.id)

    event = DetectionEvent(
        post_id=payload.post_id,
        session_id=session.id if session else payload.session_id,
        detected_game=payload.detected_game,
        game_type=payload.game_type,
        event_type=payload.event_type,
        duration_seconds=duration_seconds,
        billed_hours=payload.billed_hours,
        session_start_time=payload.session_start_time,
        session_end_time=payload.session_end_time,
    )
    db.add(event)

    if (
        session
        and session.game
        and session.game.pricing_mode == PricingMode.per_match
        and payload.event_type == DetectionEventType.match_ended
    ):
        session.detected_match_count += 1
        recalculate_session(session)
        evaluate_session_alerts(db, session)

    if session and payload.event_type == DetectionEventType.session_ended:
        end_time = payload.session_end_time or datetime.utcnow()
        session.status = SessionStatus.finished
        session.end_time = end_time
        if session.post:
            session.post.status = PostStatus.free
        _update_time_based_amount(session, duration_seconds)
        evaluate_session_alerts(db, session)

    db.commit()
    db.refresh(event)
    if session:
        db.refresh(session)
    return event, session

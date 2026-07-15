from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AlertStatus, AlertType, GamingSession, MismatchAlert


def create_alert_if_missing(db: Session, session: GamingSession, alert_type: AlertType) -> MismatchAlert:
    alert = db.scalar(
        select(MismatchAlert).where(
            MismatchAlert.session_id == session.id,
            MismatchAlert.alert_type == alert_type,
            MismatchAlert.status != AlertStatus.resolved,
        )
    )
    if alert:
        alert.expected_amount = session.expected_amount
        alert.paid_amount = session.paid_amount
        alert.difference_amount = session.difference_amount
        return alert

    alert = MismatchAlert(
        session_id=session.id,
        post_id=session.post_id,
        worker_id=session.worker_id,
        alert_type=alert_type,
        expected_amount=session.expected_amount,
        paid_amount=session.paid_amount,
        difference_amount=session.difference_amount,
    )
    db.add(alert)
    return alert


def update_alert_status(db: Session, alert: MismatchAlert, status: AlertStatus | None, note: str | None) -> MismatchAlert:
    if status is not None:
        alert.status = status
        alert.resolved_at = datetime.utcnow() if status == AlertStatus.resolved else None
    if note is not None:
        alert.note = note
    db.commit()
    db.refresh(alert)
    return alert

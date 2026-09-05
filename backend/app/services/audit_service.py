from sqlalchemy.orm import Session

from app.models import Worker


def log_audit_event(db: Session, actor: Worker | None, action: str, target_worker_id: int | None = None) -> None:
    # TODO: Persist audit events here if/when an audit_logs table is added.
    _ = (db, actor, action, target_worker_id)

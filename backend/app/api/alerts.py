from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.db.session import get_db
from app.models import AlertStatus, MismatchAlert, Worker
from app.schemas import AlertRead, AlertUpdate
from app.services.alert_service import update_alert_status


router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertRead])
def list_alerts(
    status_filter: AlertStatus | None = None,
    db: Session = Depends(get_db),
    _: Worker = Depends(require_admin),
) -> list[MismatchAlert]:
    stmt = select(MismatchAlert).order_by(MismatchAlert.created_at.desc())
    if status_filter:
        stmt = stmt.where(MismatchAlert.status == status_filter)
    return list(db.scalars(stmt))


@router.patch("/{alert_id}", response_model=AlertRead)
def update_alert(
    alert_id: int,
    payload: AlertUpdate,
    db: Session = Depends(get_db),
    _: Worker = Depends(require_admin),
) -> MismatchAlert:
    alert = db.get(MismatchAlert, alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return update_alert_status(db, alert, payload.status, payload.note)

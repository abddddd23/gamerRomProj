from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.auth.security import get_password_hash
from app.db.session import get_db
from app.models import Worker
from app.schemas import ResetPasswordRequest, WorkerCreate, WorkerRead, WorkerUpdate
from app.services.audit_service import log_audit_event


router = APIRouter(prefix="/workers", tags=["workers"])


@router.get("", response_model=list[WorkerRead])
def list_workers(db: Session = Depends(get_db), _: Worker = Depends(require_admin)) -> list[Worker]:
    return list(db.scalars(select(Worker).order_by(Worker.created_at.desc())))


@router.post("", response_model=WorkerRead, status_code=status.HTTP_201_CREATED)
def create_worker(payload: WorkerCreate, db: Session = Depends(get_db), current_user: Worker = Depends(require_admin)) -> Worker:
    existing_username = db.scalar(select(Worker).where(Worker.username == payload.username))
    if existing_username:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    existing_email = db.scalar(select(Worker).where(Worker.email == payload.email))
    if existing_email:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    worker = Worker(
        name=payload.name,
        username=payload.username,
        email=payload.email,
        phone_number=payload.phone_number,
        hashed_password=get_password_hash(payload.temporary_password),
        role=payload.role,
        is_active=payload.is_active,
        must_change_password=True,
    )
    db.add(worker)
    db.flush()
    log_audit_event(db, current_user, "create_worker", worker.id)
    db.commit()
    db.refresh(worker)
    return worker


@router.patch("/{worker_id}", response_model=WorkerRead)
def update_worker(
    worker_id: int,
    payload: WorkerUpdate,
    db: Session = Depends(get_db),
    current_user: Worker = Depends(require_admin),
) -> Worker:
    worker = db.get(Worker, worker_id)
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    data = payload.model_dump(exclude_unset=True)
    if "username" in data:
        existing = db.scalar(select(Worker).where(Worker.username == data["username"], Worker.id != worker_id))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    if "email" in data:
        existing = db.scalar(select(Worker).where(Worker.email == data["email"], Worker.id != worker_id))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    for key, value in data.items():
        setattr(worker, key, value)
    log_audit_event(db, current_user, "update_worker", worker.id)
    db.commit()
    db.refresh(worker)
    return worker


@router.post("/{worker_id}/reset-password", response_model=WorkerRead)
def reset_worker_password(
    worker_id: int,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
    current_user: Worker = Depends(require_admin),
) -> Worker:
    worker = db.get(Worker, worker_id)
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    worker.hashed_password = get_password_hash(payload.new_password)
    worker.must_change_password = True
    log_audit_event(db, current_user, "admin_reset_password", worker.id)
    db.commit()
    db.refresh(worker)
    return worker

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.security import create_access_token, verify_password
from app.auth.security import get_password_hash
from app.db.session import get_db
from app.models import Worker
from app.schemas import ChangePasswordRequest, LoginRequest, TokenResponse, WorkerRead
from app.services.audit_service import log_audit_event


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(Worker).where(Worker.username == payload.username))
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")

    token = create_access_token(str(user.id), {"role": user.role.value})
    return TokenResponse(access_token=token, user=user)


@router.post("/change-password", response_model=WorkerRead)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: Worker = Depends(get_current_user),
) -> Worker:
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Old password is incorrect")

    current_user.hashed_password = get_password_hash(payload.new_password)
    current_user.must_change_password = False
    log_audit_event(db, current_user, "change_password", current_user.id)
    db.commit()
    db.refresh(current_user)
    return current_user

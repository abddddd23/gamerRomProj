from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import decode_access_token
from app.db.session import get_db
from app.models import Role, Worker


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user_optional(token: str | None = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)) -> Worker | None:
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        return None
    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        return None
    return db.scalar(select(Worker).where(Worker.id == user_id, Worker.is_active == True))


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Worker:
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")

    worker = db.scalar(select(Worker).where(Worker.id == int(payload["sub"])))
    if not worker or not worker.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive or missing user")
    return worker


def require_admin(current_user: Worker = Depends(get_current_user)) -> Worker:
    if current_user.role != Role.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return current_user


def require_worker_or_admin(current_user: Worker = Depends(get_current_user)) -> Worker:
    if current_user.role not in {Role.admin, Role.worker}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Worker role required")
    return current_user

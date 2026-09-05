import shutil
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.auth.security import get_password_hash
from app.core.config import get_settings
from app.core.paths import ensure_app_directories
from app.db.session import get_db
from app.models import Role, Worker
from app.seed import seed
from app.version import VERSION

router = APIRouter(tags=["system"])


class SetupRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    username: str = Field(min_length=3, max_length=80, pattern=r"^[A-Za-z0-9_.-]+$")
    email: str = Field(min_length=3, max_length=255)
    phone_number: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok", "version": VERSION}


@router.get("/ready")
def ready(db: Session = Depends(get_db)) -> dict[str, bool]:
    db.execute(text("SELECT 1"))
    return {"ready": True}


@router.get("/setup-status")
def setup_status(db: Session = Depends(get_db)) -> dict[str, bool]:
    return {"setup_required": db.scalar(select(Worker.id).limit(1)) is None}


@router.post("/setup", status_code=status.HTTP_201_CREATED)
def setup_first_admin(payload: SetupRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=422, detail="Passwords do not match")
    if db.scalar(select(Worker.id).limit(1)) is not None:
        raise HTTPException(status_code=409, detail="Initial setup has already been completed")
    db.add(Worker(name=payload.name, username=payload.username, email=payload.email, phone_number=payload.phone_number,
                  hashed_password=get_password_hash(payload.password), role=Role.admin, must_change_password=False))
    db.commit()
    seed()
    return {"message": "Administrator account created"}


@router.get("/about")
def about() -> dict[str, str]:
    settings = get_settings()
    paths = ensure_app_directories()
    return {"name": "Gaming Room Manager", "version": VERSION, "database_mode": settings.database_mode,
            "data_folder": str(paths["root"]), "logs_folder": str(paths["logs"])}


@router.post("/backup")
def backup_database(db: Session = Depends(get_db)) -> dict[str, str]:
    settings = get_settings()
    if settings.database_mode != "sqlite":
        raise HTTPException(status_code=400, detail="Local backup is available only in SQLite mode")
    db.commit()
    source = Path(settings.database_url.removeprefix("sqlite:///"))
    if not source.exists():
        raise HTTPException(status_code=404, detail="Database file was not found")
    destination = ensure_app_directories()["backups"] / f"gaming_room_{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}.db"
    shutil.copy2(source, destination)
    return {"backup_path": str(destination)}

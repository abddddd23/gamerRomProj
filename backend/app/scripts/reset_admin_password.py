import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import get_password_hash
from app.db.session import SessionLocal
from app.models import Worker
from app.services.audit_service import log_audit_event


def reset_admin_password(db: Session, username: str, new_password: str) -> str:
    if len(new_password) < 8:
        raise ValueError("New password must be at least 8 characters")

    user = db.scalar(select(Worker).where(Worker.username == username))
    if not user:
        raise ValueError("User not found")

    role_value = user.role.value if hasattr(user.role, "value") else str(user.role)
    if role_value not in {"admin", "owner"}:
        raise PermissionError("Emergency password reset is only allowed for admin or owner users")

    user.hashed_password = get_password_hash(new_password)
    user.must_change_password = True
    log_audit_event(db, None, "emergency_reset_password", user.id)
    db.commit()
    return f"Password reset for {username}. User must change password on next login."


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: python -m app.scripts.reset_admin_password <username> <new_password>")
        return 2

    username = sys.argv[1]
    new_password = sys.argv[2]
    db = SessionLocal()
    try:
        print(reset_admin_password(db, username, new_password))
        return 0
    except (ValueError, PermissionError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())

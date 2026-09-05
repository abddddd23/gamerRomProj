from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import verify_password
from app.models import Worker
from app.scripts.reset_admin_password import reset_admin_password
from tests.conftest import auth_header


def worker_payload(**overrides):
    payload = {
        "name": "New Worker",
        "username": "newworker",
        "email": "newworker@gaming-room.local",
        "phone_number": "0551111111",
        "role": "worker",
        "is_active": True,
        "temporary_password": "TempPass123",
        "confirm_password": "TempPass123",
    }
    payload.update(overrides)
    return payload


def test_create_worker_requires_email_and_phone(client: TestClient, admin_token: str) -> None:
    missing_email = worker_payload()
    missing_email.pop("email")
    response = client.post("/api/workers", json=missing_email, headers=auth_header(admin_token))
    assert response.status_code == 422

    missing_phone = worker_payload(email="another@gaming-room.local", username="another")
    missing_phone.pop("phone_number")
    response = client.post("/api/workers", json=missing_phone, headers=auth_header(admin_token))
    assert response.status_code == 422


def test_duplicate_email_rejected(client: TestClient, admin_token: str) -> None:
    first = client.post("/api/workers", json=worker_payload(), headers=auth_header(admin_token))
    assert first.status_code == 201

    duplicate = client.post(
        "/api/workers",
        json=worker_payload(username="different", email="newworker@gaming-room.local"),
        headers=auth_header(admin_token),
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "Email already exists"


def test_login_response_safe_user_includes_must_change_and_excludes_hash(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert response.status_code == 200
    user = response.json()["user"]
    assert user["must_change_password"] is False
    assert user["email"] == "admin@gaming-room.local"
    assert user["phone_number"] == "0000000000"
    assert "hashed_password" not in user
    assert "password_hash" not in user


def test_change_password_clears_must_change_password(
    client: TestClient,
    admin_token: str,
    db_session: Session,
) -> None:
    created = client.post("/api/workers", json=worker_payload(), headers=auth_header(admin_token))
    assert created.status_code == 201
    assert created.json()["must_change_password"] is True

    login = client.post("/api/auth/login", json={"username": "newworker", "password": "TempPass123"})
    token = login.json()["access_token"]

    response = client.post(
        "/api/auth/change-password",
        json={
            "old_password": "TempPass123",
            "new_password": "Permanent123",
            "confirm_password": "Permanent123",
        },
        headers=auth_header(token),
    )
    assert response.status_code == 200
    assert response.json()["must_change_password"] is False

    worker = db_session.scalar(select(Worker).where(Worker.username == "newworker"))
    assert worker is not None
    assert verify_password("Permanent123", worker.hashed_password)
    assert worker.must_change_password is False


def test_admin_reset_password_sets_must_change_password(client: TestClient, admin_token: str) -> None:
    response = client.post(
        "/api/workers/2/reset-password",
        json={"new_password": "ResetPass123", "confirm_password": "ResetPass123"},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200
    assert response.json()["must_change_password"] is True
    assert "hashed_password" not in response.json()

    login = client.post("/api/auth/login", json={"username": "worker1", "password": "ResetPass123"})
    assert login.status_code == 200
    assert login.json()["user"]["must_change_password"] is True


def test_worker_cannot_reset_another_users_password(client: TestClient, worker_token: str) -> None:
    response = client.post(
        "/api/workers/1/reset-password",
        json={"new_password": "ResetPass123", "confirm_password": "ResetPass123"},
        headers=auth_header(worker_token),
    )
    assert response.status_code == 403


def test_emergency_reset_script_works_for_admin(db_session: Session) -> None:
    message = reset_admin_password(db_session, "admin", "Emergency123")
    assert "Password reset for admin" in message
    assert "hash" not in message.lower()

    admin = db_session.scalar(select(Worker).where(Worker.username == "admin"))
    assert admin is not None
    assert admin.must_change_password is True
    assert verify_password("Emergency123", admin.hashed_password)


def test_emergency_reset_script_rejects_worker(db_session: Session) -> None:
    try:
        reset_admin_password(db_session, "worker1", "Emergency123")
    except PermissionError as exc:
        assert "admin or owner" in str(exc)
    else:
        raise AssertionError("Expected PermissionError")

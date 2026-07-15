from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth.security import get_password_hash
from app.db.session import Base, get_db
from app.main import app
from app.models import Game, GameCategory, Post, PricingMode, Role, Worker


SQLALCHEMY_DATABASE_URL = "sqlite://"


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_test_data(db)

    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def seed_test_data(db: Session) -> None:
    admin = Worker(
        name="Admin",
        username="admin",
        email="admin@gaming-room.local",
        phone_number="0000000000",
        hashed_password=get_password_hash("admin123"),
        role=Role.admin,
    )
    worker = Worker(
        name="Worker One",
        username="worker1",
        email="worker1@gaming-room.local",
        phone_number="0550000000",
        hashed_password=get_password_hash("worker123"),
        role=Role.worker,
    )
    post = Post(name="Post 1")
    game = Game(
        name="FIFA",
        ai_label="FC",
        category=GameCategory.football,
        pricing_mode=PricingMode.per_match,
        price_per_match=100,
    )
    gta = Game(
        name="GTA",
        ai_label="GTA",
        category=GameCategory.other,
        pricing_mode=PricingMode.per_time,
        price_per_hour=200,
        billing_unit_minutes=20,
        price_per_time_unit=100,
    )
    db.add_all([admin, worker, post, game, gta])
    db.commit()


@pytest.fixture()
def admin_token(client: TestClient) -> str:
    response = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture()
def worker_token(client: TestClient) -> str:
    response = client.post("/api/auth/login", json={"username": "worker1", "password": "worker123"})
    assert response.status_code == 200
    return response.json()["access_token"]


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}

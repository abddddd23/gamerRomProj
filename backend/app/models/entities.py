from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import (
    AlertStatus,
    AlertType,
    DetectionEventType,
    GameCategory,
    PaymentMethod,
    PaymentStatus,
    PostStatus,
    PricingMode,
    Role,
    SessionStatus,
    ShiftStatus,
)


class Worker(Base):
    __tablename__ = "workers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone_number: Mapped[str] = mapped_column(String(40), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role] = mapped_column(SAEnum(Role, native_enum=False), default=Role.worker, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    sessions: Mapped[list["GamingSession"]] = relationship(back_populates="worker")
    payments: Mapped[list["Payment"]] = relationship(back_populates="worker")
    shifts: Mapped[list["Shift"]] = relationship(back_populates="worker")


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    camera_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[PostStatus] = mapped_column(
        SAEnum(PostStatus, native_enum=False), default=PostStatus.free, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    sessions: Mapped[list["GamingSession"]] = relationship(back_populates="post")
    detection_events: Mapped[list["DetectionEvent"]] = relationship(back_populates="post")


class Game(Base):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    ai_label: Mapped[Optional[str]] = mapped_column(String(120), unique=True, index=True, nullable=True)
    category: Mapped[GameCategory] = mapped_column(SAEnum(GameCategory, native_enum=False), nullable=False)
    pricing_mode: Mapped[PricingMode] = mapped_column(SAEnum(PricingMode, native_enum=False), nullable=False)
    price_per_match: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    price_per_hour: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    billing_unit_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    price_per_time_unit: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    sessions: Mapped[list["GamingSession"]] = relationship(back_populates="game")


class GamingSession(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id"), nullable=False, index=True)
    game_id: Mapped[Optional[int]] = mapped_column(ForeignKey("games.id"), nullable=True, index=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id"), nullable=False, index=True)
    client_name: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[SessionStatus] = mapped_column(
        SAEnum(SessionStatus, native_enum=False), default=SessionStatus.active, nullable=False
    )
    declared_match_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    detected_match_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    manual_adjustment_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    price_per_unit: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    expected_amount: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    paid_amount: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    difference_amount: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    payment_status: Mapped[PaymentStatus] = mapped_column(
        SAEnum(PaymentStatus, native_enum=False), default=PaymentStatus.unpaid, nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    post: Mapped["Post"] = relationship(back_populates="sessions")
    game: Mapped[Optional["Game"]] = relationship(back_populates="sessions")
    worker: Mapped["Worker"] = relationship(back_populates="sessions")
    payments: Mapped[list["Payment"]] = relationship(back_populates="session")
    alerts: Mapped[list["MismatchAlert"]] = relationship(back_populates="session")
    detection_events: Mapped[list["DetectionEvent"]] = relationship(back_populates="session")


class DetectionEvent(Base):
    __tablename__ = "detection_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id"), nullable=False, index=True)
    session_id: Mapped[Optional[int]] = mapped_column(ForeignKey("sessions.id"), nullable=True, index=True)
    detected_game: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    game_type: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    event_type: Mapped[DetectionEventType] = mapped_column(
        SAEnum(DetectionEventType, native_enum=False), nullable=False
    )
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    billed_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    session_start_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    session_end_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    post: Mapped["Post"] = relationship(back_populates="detection_events")
    session: Mapped[Optional["GamingSession"]] = relationship(back_populates="detection_events")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"), nullable=False, index=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    method: Mapped[PaymentMethod] = mapped_column(SAEnum(PaymentMethod, native_enum=False), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    session: Mapped["GamingSession"] = relationship(back_populates="payments")
    worker: Mapped["Worker"] = relationship(back_populates="payments")


class MismatchAlert(Base):
    __tablename__ = "mismatch_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"), nullable=False, index=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id"), nullable=False, index=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id"), nullable=False, index=True)
    alert_type: Mapped[AlertType] = mapped_column(SAEnum(AlertType, native_enum=False), nullable=False)
    expected_amount: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    paid_amount: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    difference_amount: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    status: Mapped[AlertStatus] = mapped_column(
        SAEnum(AlertStatus, native_enum=False), default=AlertStatus.open, nullable=False
    )
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    session: Mapped["GamingSession"] = relationship(back_populates="alerts")


class Shift(Base):
    __tablename__ = "shifts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id"), nullable=False, index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    expected_revenue: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    declared_cash: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    actual_paid_revenue: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    difference_amount: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    status: Mapped[ShiftStatus] = mapped_column(SAEnum(ShiftStatus, native_enum=False), default=ShiftStatus.open)

    worker: Mapped["Worker"] = relationship(back_populates="shifts")

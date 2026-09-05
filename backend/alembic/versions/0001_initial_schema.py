"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-06-12 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "workers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("username", sa.String(length=80), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(op.f("ix_workers_id"), "workers", ["id"], unique=False)
    op.create_index(op.f("ix_workers_username"), "workers", ["username"], unique=True)

    op.create_table(
        "posts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("camera_url", sa.String(length=500), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_posts_id"), "posts", ["id"], unique=False)

    op.create_table(
        "games",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("category", sa.String(length=30), nullable=False),
        sa.Column("pricing_mode", sa.String(length=30), nullable=False),
        sa.Column("price_per_match", sa.Float(), nullable=True),
        sa.Column("price_per_hour", sa.Float(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_games_id"), "games", ["id"], unique=False)

    op.create_table(
        "sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id"), nullable=False),
        sa.Column("game_id", sa.Integer(), sa.ForeignKey("games.id"), nullable=True),
        sa.Column("worker_id", sa.Integer(), sa.ForeignKey("workers.id"), nullable=False),
        sa.Column("client_name", sa.String(length=160), nullable=True),
        sa.Column("start_time", sa.DateTime(), nullable=False),
        sa.Column("end_time", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("declared_match_count", sa.Integer(), nullable=False),
        sa.Column("detected_match_count", sa.Integer(), nullable=False),
        sa.Column("manual_adjustment_count", sa.Integer(), nullable=False),
        sa.Column("price_per_unit", sa.Float(), nullable=False),
        sa.Column("expected_amount", sa.Float(), nullable=False),
        sa.Column("paid_amount", sa.Float(), nullable=False),
        sa.Column("difference_amount", sa.Float(), nullable=False),
        sa.Column("payment_status", sa.String(length=30), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(op.f("ix_sessions_id"), "sessions", ["id"], unique=False)
    op.create_index(op.f("ix_sessions_post_id"), "sessions", ["post_id"], unique=False)
    op.create_index(op.f("ix_sessions_game_id"), "sessions", ["game_id"], unique=False)
    op.create_index(op.f("ix_sessions_worker_id"), "sessions", ["worker_id"], unique=False)

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("worker_id", sa.Integer(), sa.ForeignKey("workers.id"), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("method", sa.String(length=30), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(op.f("ix_payments_id"), "payments", ["id"], unique=False)
    op.create_index(op.f("ix_payments_session_id"), "payments", ["session_id"], unique=False)
    op.create_index(op.f("ix_payments_worker_id"), "payments", ["worker_id"], unique=False)

    op.create_table(
        "detection_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id"), nullable=False),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("sessions.id"), nullable=True),
        sa.Column("detected_game", sa.String(length=160), nullable=True),
        sa.Column("event_type", sa.String(length=40), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("screenshot_path", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(op.f("ix_detection_events_id"), "detection_events", ["id"], unique=False)
    op.create_index(op.f("ix_detection_events_post_id"), "detection_events", ["post_id"], unique=False)
    op.create_index(op.f("ix_detection_events_session_id"), "detection_events", ["session_id"], unique=False)

    op.create_table(
        "mismatch_alerts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id"), nullable=False),
        sa.Column("worker_id", sa.Integer(), sa.ForeignKey("workers.id"), nullable=False),
        sa.Column("alert_type", sa.String(length=40), nullable=False),
        sa.Column("expected_amount", sa.Float(), nullable=False),
        sa.Column("paid_amount", sa.Float(), nullable=False),
        sa.Column("difference_amount", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
    )
    op.create_index(op.f("ix_mismatch_alerts_id"), "mismatch_alerts", ["id"], unique=False)
    op.create_index(op.f("ix_mismatch_alerts_session_id"), "mismatch_alerts", ["session_id"], unique=False)
    op.create_index(op.f("ix_mismatch_alerts_post_id"), "mismatch_alerts", ["post_id"], unique=False)
    op.create_index(op.f("ix_mismatch_alerts_worker_id"), "mismatch_alerts", ["worker_id"], unique=False)

    op.create_table(
        "shifts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("worker_id", sa.Integer(), sa.ForeignKey("workers.id"), nullable=False),
        sa.Column("start_time", sa.DateTime(), nullable=False),
        sa.Column("end_time", sa.DateTime(), nullable=True),
        sa.Column("expected_revenue", sa.Float(), nullable=False),
        sa.Column("declared_cash", sa.Float(), nullable=False),
        sa.Column("actual_paid_revenue", sa.Float(), nullable=False),
        sa.Column("difference_amount", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
    )
    op.create_index(op.f("ix_shifts_id"), "shifts", ["id"], unique=False)
    op.create_index(op.f("ix_shifts_worker_id"), "shifts", ["worker_id"], unique=False)


def downgrade() -> None:
    op.drop_table("shifts")
    op.drop_table("mismatch_alerts")
    op.drop_table("detection_events")
    op.drop_table("payments")
    op.drop_table("sessions")
    op.drop_table("games")
    op.drop_table("posts")
    op.drop_table("workers")

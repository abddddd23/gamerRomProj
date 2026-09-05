"""support AI event contract

Revision ID: 0003_ai_events
Revises: 0002_worker_auth
Create Date: 2026-06-25 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_ai_events"
down_revision = "0002_worker_auth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("games", sa.Column("ai_label", sa.String(length=120), nullable=True))

    op.add_column("detection_events", sa.Column("game_type", sa.String(length=120), nullable=True))
    op.add_column("detection_events", sa.Column("duration_seconds", sa.Float(), nullable=True))
    op.add_column("detection_events", sa.Column("billed_hours", sa.Integer(), nullable=True))
    op.add_column("detection_events", sa.Column("session_start_time", sa.DateTime(), nullable=True))
    op.add_column("detection_events", sa.Column("session_end_time", sa.DateTime(), nullable=True))

    with op.batch_alter_table("detection_events") as batch_op:
        batch_op.alter_column("confidence", existing_type=sa.Float(), nullable=True)

    op.execute("UPDATE games SET ai_label = 'FC' WHERE name = 'FIFA' AND ai_label IS NULL")
    op.execute("UPDATE games SET ai_label = 'eFootball' WHERE name = 'eFootball' AND ai_label IS NULL")
    op.execute("UPDATE games SET ai_label = 'GTA' WHERE name = 'GTA' AND ai_label IS NULL")
    op.execute("UPDATE games SET ai_label = 'MK' WHERE name = 'Mortal Kombat' AND ai_label IS NULL")

    op.create_index(op.f("ix_games_ai_label"), "games", ["ai_label"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_games_ai_label"), table_name="games")

    op.execute("UPDATE detection_events SET confidence = 0 WHERE confidence IS NULL")
    with op.batch_alter_table("detection_events") as batch_op:
        batch_op.alter_column("confidence", existing_type=sa.Float(), nullable=False)

    op.drop_column("detection_events", "session_end_time")
    op.drop_column("detection_events", "session_start_time")
    op.drop_column("detection_events", "billed_hours")
    op.drop_column("detection_events", "duration_seconds")
    op.drop_column("detection_events", "game_type")
    op.drop_column("games", "ai_label")

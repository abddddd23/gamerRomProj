"""add time block billing fields

Revision ID: 0004_time_billing
Revises: 0003_ai_events
Create Date: 2026-07-05 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_time_billing"
down_revision = "0003_ai_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("games", sa.Column("billing_unit_minutes", sa.Integer(), nullable=True))
    op.add_column("games", sa.Column("price_per_time_unit", sa.Float(), nullable=True))

    op.execute(
        """
        UPDATE games
        SET pricing_mode = 'per_match',
            price_per_match = 100,
            billing_unit_minutes = NULL,
            price_per_time_unit = NULL
        WHERE name IN ('FIFA', 'PES', 'eFootball')
        """
    )
    op.execute(
        """
        UPDATE games
        SET pricing_mode = 'per_time',
            billing_unit_minutes = 20,
            price_per_time_unit = 100
        WHERE name IN ('GTA', 'Mortal Kombat')
        """
    )


def downgrade() -> None:
    op.drop_column("games", "price_per_time_unit")
    op.drop_column("games", "billing_unit_minutes")

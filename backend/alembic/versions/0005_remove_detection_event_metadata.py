"""remove detection event metadata fields

Revision ID: 0005_detection_meta
Revises: 0004_time_billing
Create Date: 2026-07-10 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0005_detection_meta"
down_revision = "0004_time_billing"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("detection_events") as batch_op:
        batch_op.drop_column("screenshot_path")
        batch_op.drop_column("confidence")


def downgrade() -> None:
    with op.batch_alter_table("detection_events") as batch_op:
        batch_op.add_column(sa.Column("confidence", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("screenshot_path", sa.String(length=500), nullable=True))

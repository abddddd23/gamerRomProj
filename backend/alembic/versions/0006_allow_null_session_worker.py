"""allow null session worker

Revision ID: 0006_allow_null_session_worker
Revises: 0005_detection_meta
Create Date: 2026-09-05 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0006_allow_null_session_worker"
down_revision = "0005_detection_meta"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("sessions") as batch_op:
        batch_op.alter_column("worker_id", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table("sessions") as batch_op:
        batch_op.alter_column("worker_id", existing_type=sa.Integer(), nullable=False)

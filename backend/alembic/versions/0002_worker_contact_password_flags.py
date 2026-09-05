"""worker contact fields and password flags

Revision ID: 0002_worker_auth
Revises: 0001_initial_schema
Create Date: 2026-06-20 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_worker_auth"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("workers", sa.Column("email", sa.String(length=255), nullable=True))
    op.add_column("workers", sa.Column("phone_number", sa.String(length=40), nullable=True))
    op.add_column(
        "workers",
        sa.Column("must_change_password", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.add_column(
        "workers",
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
    )

    op.execute(
        """
        UPDATE workers
        SET email = CASE
            WHEN username = 'admin' THEN 'admin@gaming-room.local'
            WHEN username = 'worker1' THEN 'worker1@gaming-room.local'
            ELSE username || '@gaming-room.local'
        END
        WHERE email IS NULL
        """
    )
    op.execute(
        """
        UPDATE workers
        SET phone_number = CASE
            WHEN username = 'admin' THEN '0000000000'
            WHEN username = 'worker1' THEN '0550000000'
            ELSE '0000000000'
        END
        WHERE phone_number IS NULL
        """
    )
    op.execute("UPDATE workers SET updated_at = created_at WHERE updated_at IS NULL")

    with op.batch_alter_table("workers") as batch_op:
        batch_op.alter_column("email", existing_type=sa.String(length=255), nullable=False)
        batch_op.alter_column("phone_number", existing_type=sa.String(length=40), nullable=False)
        batch_op.alter_column("updated_at", existing_type=sa.DateTime(), nullable=False)

    op.create_index(op.f("ix_workers_email"), "workers", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_workers_email"), table_name="workers")
    op.drop_column("workers", "updated_at")
    op.drop_column("workers", "must_change_password")
    op.drop_column("workers", "phone_number")
    op.drop_column("workers", "email")

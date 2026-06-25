"""Add auth rate limits.

Revision ID: 0003_auth_rate_limits
Revises: 0002_passwordless_auth
Create Date: 2026-06-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_auth_rate_limits"
down_revision: str | None = "0002_passwordless_auth"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "auth_rate_limits",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("key", sa.String(length=255), nullable=False),
        sa.Column("scope", sa.String(length=64), nullable=False),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("scope", "key", name="uq_auth_rate_limits_scope_key"),
    )
    op.create_index("ix_auth_rate_limits_scope_key", "auth_rate_limits", ["scope", "key"])


def downgrade() -> None:
    op.drop_index("ix_auth_rate_limits_scope_key", table_name="auth_rate_limits")
    op.drop_table("auth_rate_limits")

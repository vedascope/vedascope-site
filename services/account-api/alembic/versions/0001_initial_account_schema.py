"""Initial account schema.

Revision ID: 0001_initial_account_schema
Revises:
Create Date: 2026-06-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_account_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("phone", sa.String(length=64), nullable=True),
        sa.Column("display_name", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )

    op.create_table(
        "auth_identities",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(length=64), nullable=False),
        sa.Column("provider_user_id", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("telegram_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "provider_user_id", name="uq_auth_identities_provider_user_id"),
    )

    op.create_table(
        "user_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("language", sa.String(length=16), server_default="ru", nullable=False),
        sa.Column("timezone", sa.String(length=128), nullable=True),
        sa.Column("default_ayanamsa", sa.String(length=64), server_default="lahiri", nullable=False),
        sa.Column("default_house_system", sa.String(length=64), nullable=True),
        sa.Column("default_node_type", sa.String(length=32), server_default="mean", nullable=False),
        sa.Column("calculation_preferences_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_user_settings_user_id"),
    )

    op.create_table(
        "birth_charts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chart_name", sa.String(length=255), nullable=True),
        sa.Column("person_name", sa.String(length=255), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=False),
        sa.Column("birth_time", sa.Time(), nullable=False),
        sa.Column("birth_datetime_utc", sa.DateTime(timezone=True), nullable=True),
        sa.Column("birth_timezone", sa.String(length=128), nullable=False),
        sa.Column("birth_place_name", sa.String(length=255), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("ayanamsa", sa.String(length=64), server_default="lahiri", nullable=False),
        sa.Column("house_system", sa.String(length=64), nullable=True),
        sa.Column("node_type", sa.String(length=32), server_default="mean", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_birth_charts_user_id", "birth_charts", ["user_id"])

    op.create_table(
        "astro_calculations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chart_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("calculation_type", sa.String(length=64), nullable=False),
        sa.Column("calculation_key", sa.String(length=255), nullable=False),
        sa.Column("input_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("settings_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("result_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("engine_version", sa.String(length=64), nullable=True),
        sa.Column("algorithm_version", sa.String(length=64), nullable=True),
        sa.Column("input_hash", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["chart_id"], ["birth_charts.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_astro_calculations_user_id", "astro_calculations", ["user_id"])
    op.create_index("ix_astro_calculations_chart_id", "astro_calculations", ["chart_id"])
    op.create_index("ix_astro_calculations_input_hash", "astro_calculations", ["input_hash"])
    op.create_index(
        "ix_astro_calculations_type_key",
        "astro_calculations",
        ["calculation_type", "calculation_key"],
    )


def downgrade() -> None:
    op.drop_index("ix_astro_calculations_type_key", table_name="astro_calculations")
    op.drop_index("ix_astro_calculations_input_hash", table_name="astro_calculations")
    op.drop_index("ix_astro_calculations_chart_id", table_name="astro_calculations")
    op.drop_index("ix_astro_calculations_user_id", table_name="astro_calculations")
    op.drop_table("astro_calculations")
    op.drop_index("ix_birth_charts_user_id", table_name="birth_charts")
    op.drop_table("birth_charts")
    op.drop_table("user_settings")
    op.drop_table("auth_identities")
    op.drop_table("users")

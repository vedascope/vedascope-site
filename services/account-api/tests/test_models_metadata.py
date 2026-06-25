import os

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://vedascope:test@localhost:5432/vedascope_account_test",
)

from app import models  # noqa: F401
from app.db.base import Base


def test_expected_tables_are_registered() -> None:
    expected_tables = {
        "users",
        "auth_identities",
        "user_settings",
        "birth_charts",
        "astro_calculations",
    }

    assert expected_tables.issubset(Base.metadata.tables.keys())


def test_users_table_has_required_columns() -> None:
    columns = Base.metadata.tables["users"].columns.keys()

    assert {"id", "email", "display_name", "created_at", "updated_at"}.issubset(columns)


def test_birth_charts_table_has_required_columns() -> None:
    columns = Base.metadata.tables["birth_charts"].columns.keys()

    assert {
        "id",
        "user_id",
        "birth_date",
        "birth_time",
        "birth_timezone",
        "latitude",
        "longitude",
        "ayanamsa",
        "node_type",
    }.issubset(columns)


def test_astro_calculations_table_has_required_columns() -> None:
    columns = Base.metadata.tables["astro_calculations"].columns.keys()

    assert {
        "id",
        "user_id",
        "chart_id",
        "calculation_type",
        "calculation_key",
        "input_json",
        "settings_json",
        "result_json",
        "input_hash",
        "created_at",
    }.issubset(columns)

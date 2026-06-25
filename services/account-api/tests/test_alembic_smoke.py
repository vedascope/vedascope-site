import os
import subprocess
import sys


DATABASE_URL = "postgresql+psycopg://vedascope:CHANGE_ME@localhost:5432/vedascope_account"


def test_alembic_can_generate_initial_migration_sql_offline() -> None:
    env = {
        **os.environ,
        "DATABASE_URL": DATABASE_URL,
    }

    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head", "--sql"],
        check=False,
        capture_output=True,
        env=env,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert "CREATE TABLE users" in result.stdout
    assert "CREATE TABLE birth_charts" in result.stdout
    assert "CREATE TABLE astro_calculations" in result.stdout

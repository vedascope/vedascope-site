import os

from fastapi.testclient import TestClient

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://vedascope:test@localhost:5432/vedascope_account_test",
)

from app.main import create_app


def test_health_endpoint_returns_service_status() -> None:
    client = TestClient(create_app())

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "vedascope-account-api",
    }


def test_account_health_endpoint_returns_service_status() -> None:
    client = TestClient(create_app())

    response = client.get("/api/account/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "vedascope-account-api",
    }

import uuid

from fastapi.testclient import TestClient

from app.api import deps


def test_local_mode_still_allows_dev_user_identity(client: TestClient, db_session) -> None:
    from tests.test_account_me import create_user

    user = create_user(db_session)

    response = client.get("/api/account/me", headers={"X-User-Id": str(user.id)})

    assert response.status_code == 200
    assert response.json()["id"] == str(user.id)


def test_production_mode_rejects_dev_user_identity(monkeypatch, client: TestClient) -> None:
    monkeypatch.setattr(deps.settings, "app_env", "production")

    response = client.get("/api/account/me", headers={"X-User-Id": str(uuid.uuid4())})

    assert response.status_code == 403
    assert response.json()["detail"] == "Temporary development identity is disabled in production."


def test_production_mode_keeps_health_endpoints_public(monkeypatch, client: TestClient) -> None:
    monkeypatch.setattr(deps.settings, "app_env", "production")

    health_response = client.get("/health")
    account_health_response = client.get("/api/account/health")

    assert health_response.status_code == 200
    assert account_health_response.status_code == 200
    assert health_response.json() == {"status": "ok", "service": "vedascope-account-api"}
    assert account_health_response.json() == {"status": "ok", "service": "vedascope-account-api"}

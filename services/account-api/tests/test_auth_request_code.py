from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routes import auth
from app.models.auth_login_code import AuthLoginCode


def test_request_code_creates_code_for_normalized_email(client: TestClient, db_session: Session) -> None:
    response = client.post("/api/account/auth/request-code", json={"email": " User@Example.COM "})

    assert response.status_code == 200
    assert response.json()["email"] == "user@example.com"

    login_code = db_session.scalar(select(AuthLoginCode).where(AuthLoginCode.email == "user@example.com"))
    assert login_code is not None
    assert login_code.code_hash
    assert login_code.code_hash != response.json()["dev_code"]


def test_request_code_returns_dev_code_in_local_mode(client: TestClient) -> None:
    response = client.post("/api/account/auth/request-code", json={"email": "user@example.com"})

    assert response.status_code == 200
    assert response.json()["status"] == "code_created"
    assert response.json()["dev_code"].isdigit()
    assert len(response.json()["dev_code"]) == 6


def test_request_code_does_not_return_dev_code_in_production(monkeypatch, client: TestClient) -> None:
    monkeypatch.setattr(auth.settings, "app_env", "production")

    response = client.post("/api/account/auth/request-code", json={"email": "user@example.com"})

    assert response.status_code == 200
    assert response.json() == {"status": "code_created", "email": "user@example.com"}


def test_request_code_captcha_required_without_provider_returns_501(monkeypatch, client: TestClient) -> None:
    monkeypatch.setattr(auth.settings, "captcha_required", True)
    monkeypatch.setattr(auth.settings, "captcha_provider", "none")

    response = client.post(
        "/api/account/auth/request-code",
        json={"email": "user@example.com", "captcha_token": "future-token"},
    )

    assert response.status_code == 501
    assert response.json()["detail"] == "CAPTCHA verification is not configured yet."

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routes import auth
from app.models.user import User
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


def test_request_code_sends_email_when_smtp_enabled(monkeypatch, client: TestClient) -> None:
    sent_messages = []

    def fake_send_login_code_email(email: str, code: str) -> None:
        sent_messages.append((email, code))

    monkeypatch.setattr(auth.settings, "smtp_enabled", True)
    monkeypatch.setattr(auth, "send_login_code_email", fake_send_login_code_email)

    response = client.post("/api/account/auth/request-code", json={"email": "smtp@example.com"})

    assert response.status_code == 200
    assert sent_messages == [("smtp@example.com", response.json()["dev_code"])]


def test_request_code_smtp_failure_returns_generic_error(monkeypatch, client: TestClient) -> None:
    def fake_send_login_code_email(email: str, code: str) -> None:
        raise auth.EmailDeliveryError("boom")

    monkeypatch.setattr(auth.settings, "smtp_enabled", True)
    monkeypatch.setattr(auth, "send_login_code_email", fake_send_login_code_email)

    response = client.post("/api/account/auth/request-code", json={"email": "smtp-fail@example.com"})

    assert response.status_code == 500
    assert response.json()["detail"] == "Email delivery failed."


def test_request_code_rate_limit_blocks_after_threshold(client: TestClient) -> None:
    for _ in range(5):
        response = client.post("/api/account/auth/request-code", json={"email": "limited@example.com"})
        assert response.status_code == 200

    blocked_response = client.post("/api/account/auth/request-code", json={"email": "limited@example.com"})

    assert blocked_response.status_code == 429


def test_request_code_rate_limit_does_not_reveal_whether_email_exists(
    client: TestClient,
    db_session: Session,
) -> None:
    db_session.add(User(email="known@example.com"))
    db_session.commit()

    responses = []
    for email in ("known@example.com", "unknown@example.com"):
        for _ in range(5):
            response = client.post("/api/account/auth/request-code", json={"email": email})
            assert response.status_code == 200
        responses.append(client.post("/api/account/auth/request-code", json={"email": email}))

    assert [response.status_code for response in responses] == [429, 429]
    assert responses[0].json() == responses[1].json()

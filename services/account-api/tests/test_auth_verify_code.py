from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import MAX_LOGIN_CODE_ATTEMPTS, SESSION_COOKIE_NAME, hash_secret, utc_now
from app.models.auth_identity import AuthIdentity
from app.models.auth_login_code import AuthLoginCode
from app.models.auth_session import AuthSession
from app.models.user import User


def request_dev_code(client: TestClient, email: str = "user@example.com") -> str:
    response = client.post("/api/account/auth/request-code", json={"email": email})
    assert response.status_code == 200
    return response.json()["dev_code"]


def test_verify_code_with_valid_code_creates_user(client: TestClient, db_session: Session) -> None:
    code = request_dev_code(client, "new@example.com")

    response = client.post("/api/account/auth/verify-code", json={"email": "new@example.com", "code": code})

    assert response.status_code == 200
    assert response.json()["email"] == "new@example.com"

    user = db_session.scalar(select(User).where(User.email == "new@example.com"))
    assert user is not None
    identity = db_session.scalar(
        select(AuthIdentity).where(AuthIdentity.provider == "email", AuthIdentity.provider_user_id == "new@example.com")
    )
    assert identity is not None
    assert identity.user_id == user.id


def test_verify_code_with_valid_code_sets_session_cookie(client: TestClient, db_session: Session) -> None:
    code = request_dev_code(client)

    response = client.post("/api/account/auth/verify-code", json={"email": "user@example.com", "code": code})

    assert response.status_code == 200
    assert SESSION_COOKIE_NAME in response.cookies
    assert db_session.scalar(select(AuthSession)) is not None


def test_verify_code_with_wrong_code_returns_401(client: TestClient, db_session: Session) -> None:
    request_dev_code(client)

    response = client.post("/api/account/auth/verify-code", json={"email": "user@example.com", "code": "000000"})

    assert response.status_code == 401
    login_code = db_session.scalar(select(AuthLoginCode).where(AuthLoginCode.email == "user@example.com"))
    assert login_code is not None
    assert login_code.attempts == 1


def test_verify_code_with_expired_code_returns_400(client: TestClient, db_session: Session) -> None:
    login_code = AuthLoginCode(
        email="expired@example.com",
        code_hash=hash_secret("123456"),
        expires_at=utc_now() - timedelta(minutes=1),
    )
    db_session.add(login_code)
    db_session.commit()

    response = client.post(
        "/api/account/auth/verify-code",
        json={"email": "expired@example.com", "code": "123456"},
    )

    assert response.status_code == 400


def test_used_code_cannot_be_reused(client: TestClient) -> None:
    code = request_dev_code(client, "reuse@example.com")

    first_response = client.post("/api/account/auth/verify-code", json={"email": "reuse@example.com", "code": code})
    second_response = client.post("/api/account/auth/verify-code", json={"email": "reuse@example.com", "code": code})

    assert first_response.status_code == 200
    assert second_response.status_code == 400


def test_too_many_wrong_attempts_returns_400(client: TestClient, db_session: Session) -> None:
    login_code = AuthLoginCode(
        email="attempts@example.com",
        code_hash=hash_secret("123456"),
        expires_at=utc_now() + timedelta(minutes=5),
        attempts=MAX_LOGIN_CODE_ATTEMPTS,
    )
    db_session.add(login_code)
    db_session.commit()

    response = client.post(
        "/api/account/auth/verify-code",
        json={"email": "attempts@example.com", "code": "000000"},
    )

    assert response.status_code == 400

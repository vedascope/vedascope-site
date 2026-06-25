from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import SESSION_COOKIE_NAME
from app.models.auth_session import AuthSession


def login(client: TestClient, email: str = "logout@example.com") -> None:
    request_response = client.post("/api/account/auth/request-code", json={"email": email})
    assert request_response.status_code == 200
    verify_response = client.post(
        "/api/account/auth/verify-code",
        json={"email": email, "code": request_response.json()["dev_code"]},
    )
    assert verify_response.status_code == 200


def test_logout_revokes_session_and_clears_cookie(client: TestClient, db_session: Session) -> None:
    login(client)
    assert client.cookies.get(SESSION_COOKIE_NAME)

    response = client.post("/api/account/auth/logout")

    assert response.status_code == 200
    assert response.json() == {"status": "logged_out"}
    assert client.cookies.get(SESSION_COOKIE_NAME) is None

    session = db_session.scalar(select(AuthSession))
    assert session is not None
    assert session.revoked_at is not None

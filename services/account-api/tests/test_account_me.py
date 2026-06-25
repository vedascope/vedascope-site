import uuid
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User


def create_user(db_session: Session, user_id: uuid.UUID | None = None) -> User:
    now = datetime.now(timezone.utc)
    user = User(
        id=user_id or uuid.uuid4(),
        email="student@example.com",
        phone="+79990000000",
        display_name="Student",
        created_at=now,
        updated_at=now,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_get_account_me_missing_user_header_returns_401(client: TestClient) -> None:
    response = client.get("/api/account/me")

    assert response.status_code == 401
    assert "X-User-Id" in response.json()["detail"]


def test_get_account_me_invalid_user_header_returns_400(client: TestClient) -> None:
    response = client.get("/api/account/me", headers={"X-User-Id": "not-a-uuid"})

    assert response.status_code == 400
    assert "valid UUID" in response.json()["detail"]


def test_get_account_me_unknown_user_returns_404(client: TestClient) -> None:
    response = client.get("/api/account/me", headers={"X-User-Id": str(uuid.uuid4())})

    assert response.status_code == 404
    assert response.json()["detail"] == "User not found."


def test_get_account_me_existing_user_returns_profile(client: TestClient, db_session: Session) -> None:
    user = create_user(db_session)

    response = client.get("/api/account/me", headers={"X-User-Id": str(user.id)})

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(user.id)
    assert data["email"] == "student@example.com"
    assert data["phone"] == "+79990000000"
    assert data["display_name"] == "Student"
    assert data["created_at"]
    assert data["updated_at"]
    assert data["last_login_at"] is None

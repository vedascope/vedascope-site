import uuid
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User


def create_user(db_session: Session) -> User:
    now = datetime.now(timezone.utc)
    user = User(
        id=uuid.uuid4(),
        email="settings@example.com",
        display_name="Settings User",
        created_at=now,
        updated_at=now,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_patch_account_settings_missing_user_header_returns_401(client: TestClient) -> None:
    response = client.patch("/api/account/settings", json={"default_ayanamsa": "lahiri"})

    assert response.status_code == 401
    assert "X-User-Id" in response.json()["detail"]


def test_patch_account_settings_existing_user_can_create_settings(
    client: TestClient,
    db_session: Session,
) -> None:
    user = create_user(db_session)

    response = client.patch(
        "/api/account/settings",
        headers={"X-User-Id": str(user.id)},
        json={
            "language": "ru",
            "timezone": "Europe/Moscow",
            "default_ayanamsa": "lahiri",
            "default_node_type": "mean",
            "calculation_preferences_json": {"enabled_vargas": ["D1", "D9"]},
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == str(user.id)
    assert data["language"] == "ru"
    assert data["timezone"] == "Europe/Moscow"
    assert data["default_ayanamsa"] == "lahiri"
    assert data["default_node_type"] == "mean"
    assert data["calculation_preferences_json"] == {"enabled_vargas": ["D1", "D9"]}


def test_patch_account_settings_existing_user_can_update_settings(
    client: TestClient,
    db_session: Session,
) -> None:
    user = create_user(db_session)
    headers = {"X-User-Id": str(user.id)}

    create_response = client.patch(
        "/api/account/settings",
        headers=headers,
        json={
            "default_ayanamsa": "lahiri",
            "default_node_type": "mean",
            "calculation_preferences_json": {"enabled_vargas": ["D1"]},
        },
    )
    assert create_response.status_code == 200

    update_response = client.patch(
        "/api/account/settings",
        headers=headers,
        json={
            "default_ayanamsa": "raman",
            "default_node_type": "true",
            "calculation_preferences_json": {"enabled_vargas": ["D1", "D9", "D10"]},
        },
    )

    assert update_response.status_code == 200
    data = update_response.json()
    assert data["default_ayanamsa"] == "raman"
    assert data["default_node_type"] == "true"
    assert data["calculation_preferences_json"] == {"enabled_vargas": ["D1", "D9", "D10"]}

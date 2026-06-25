import uuid
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.birth_chart import BirthChart
from app.models.user import User


def create_user(db_session: Session, email: str) -> User:
    now = datetime.now(timezone.utc)
    user = User(
        id=uuid.uuid4(),
        email=email,
        display_name=email.split("@")[0],
        created_at=now,
        updated_at=now,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def chart_payload(**overrides):
    payload = {
        "chart_name": "Natal chart",
        "person_name": "Student",
        "birth_date": "1990-05-20",
        "birth_time": "14:30:00",
        "birth_timezone": "Europe/Moscow",
        "birth_place_name": "Moscow",
        "latitude": 55.7558,
        "longitude": 37.6173,
        "ayanamsa": "lahiri",
        "house_system": None,
        "node_type": "mean",
    }
    payload.update(overrides)
    return payload


def create_chart(db_session: Session, user: User, **overrides) -> BirthChart:
    payload = chart_payload(**overrides)
    chart = BirthChart(
        user_id=user.id,
        chart_name=payload["chart_name"],
        person_name=payload["person_name"],
        birth_date=datetime.fromisoformat(payload["birth_date"]).date(),
        birth_time=datetime.fromisoformat(f"{payload['birth_date']}T{payload['birth_time']}").time(),
        birth_timezone=payload["birth_timezone"],
        birth_place_name=payload["birth_place_name"],
        latitude=payload["latitude"],
        longitude=payload["longitude"],
        ayanamsa=payload["ayanamsa"],
        house_system=payload["house_system"],
        node_type=payload["node_type"],
    )
    db_session.add(chart)
    db_session.commit()
    db_session.refresh(chart)
    return chart


def auth_headers(user: User) -> dict[str, str]:
    return {"X-User-Id": str(user.id)}


def test_birth_charts_missing_user_header_returns_401(client: TestClient) -> None:
    response = client.get("/api/account/charts")

    assert response.status_code == 401
    assert "X-User-Id" in response.json()["detail"]


def test_create_birth_chart_stores_current_users_chart(client: TestClient, db_session: Session) -> None:
    user = create_user(db_session, "charts@example.com")

    response = client.post("/api/account/charts", headers=auth_headers(user), json=chart_payload())

    assert response.status_code == 201
    data = response.json()
    assert data["user_id"] == str(user.id)
    assert data["chart_name"] == "Natal chart"
    assert data["person_name"] == "Student"
    assert data["birth_date"] == "1990-05-20"
    assert data["birth_time"] == "14:30:00"
    assert data["birth_timezone"] == "Europe/Moscow"
    assert data["birth_place_name"] == "Moscow"
    assert data["latitude"] == 55.7558
    assert data["longitude"] == 37.6173
    assert data["ayanamsa"] == "lahiri"
    assert data["node_type"] == "mean"

    stored_chart = db_session.get(BirthChart, uuid.UUID(data["id"]))
    assert stored_chart is not None
    assert stored_chart.user_id == user.id


def test_list_birth_charts_returns_only_current_users_charts(client: TestClient, db_session: Session) -> None:
    owner = create_user(db_session, "owner@example.com")
    other = create_user(db_session, "other@example.com")
    own_chart = create_chart(db_session, owner, chart_name="Owner chart")
    create_chart(db_session, other, chart_name="Other chart")

    response = client.get("/api/account/charts", headers=auth_headers(owner))

    assert response.status_code == 200
    data = response.json()
    assert [item["id"] for item in data] == [str(own_chart.id)]
    assert data[0]["chart_name"] == "Owner chart"


def test_get_birth_chart_by_id_works_for_owner(client: TestClient, db_session: Session) -> None:
    owner = create_user(db_session, "owner-get@example.com")
    chart = create_chart(db_session, owner, chart_name="Readable chart")

    response = client.get(f"/api/account/charts/{chart.id}", headers=auth_headers(owner))

    assert response.status_code == 200
    assert response.json()["id"] == str(chart.id)
    assert response.json()["chart_name"] == "Readable chart"


def test_get_birth_chart_by_id_returns_404_for_another_user(client: TestClient, db_session: Session) -> None:
    owner = create_user(db_session, "owner-private@example.com")
    other = create_user(db_session, "other-private@example.com")
    chart = create_chart(db_session, owner)

    response = client.get(f"/api/account/charts/{chart.id}", headers=auth_headers(other))

    assert response.status_code == 404
    assert response.json()["detail"] == "Birth chart not found."


def test_patch_birth_chart_updates_fields(client: TestClient, db_session: Session) -> None:
    owner = create_user(db_session, "owner-patch@example.com")
    chart = create_chart(db_session, owner)

    response = client.patch(
        f"/api/account/charts/{chart.id}",
        headers=auth_headers(owner),
        json={
            "chart_name": "Updated chart",
            "person_name": "Updated person",
            "birth_timezone": "Asia/Kolkata",
            "birth_place_name": "Delhi",
            "latitude": 28.6139,
            "longitude": 77.209,
            "ayanamsa": "raman",
            "node_type": "true",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["chart_name"] == "Updated chart"
    assert data["person_name"] == "Updated person"
    assert data["birth_timezone"] == "Asia/Kolkata"
    assert data["birth_place_name"] == "Delhi"
    assert data["latitude"] == 28.6139
    assert data["longitude"] == 77.209
    assert data["ayanamsa"] == "raman"
    assert data["node_type"] == "true"


def test_delete_birth_chart_removes_it(client: TestClient, db_session: Session) -> None:
    owner = create_user(db_session, "owner-delete@example.com")
    chart = create_chart(db_session, owner)

    response = client.delete(f"/api/account/charts/{chart.id}", headers=auth_headers(owner))

    assert response.status_code == 200
    assert response.json() == {"status": "deleted", "id": str(chart.id)}
    assert db_session.get(BirthChart, chart.id) is None


def test_create_birth_chart_invalid_latitude_returns_validation_error(
    client: TestClient,
    db_session: Session,
) -> None:
    user = create_user(db_session, "invalid-lat@example.com")

    response = client.post(
        "/api/account/charts",
        headers=auth_headers(user),
        json=chart_payload(latitude=91),
    )

    assert response.status_code == 422


def test_create_birth_chart_invalid_longitude_returns_validation_error(
    client: TestClient,
    db_session: Session,
) -> None:
    user = create_user(db_session, "invalid-lon@example.com")

    response = client.post(
        "/api/account/charts",
        headers=auth_headers(user),
        json=chart_payload(longitude=181),
    )

    assert response.status_code == 422


def test_create_birth_chart_invalid_node_type_returns_validation_error(
    client: TestClient,
    db_session: Session,
) -> None:
    user = create_user(db_session, "invalid-node@example.com")

    response = client.post(
        "/api/account/charts",
        headers=auth_headers(user),
        json=chart_payload(node_type="shadow"),
    )

    assert response.status_code == 422

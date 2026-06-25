from fastapi.testclient import TestClient


def login(client: TestClient, email: str = "session@example.com") -> None:
    request_response = client.post("/api/account/auth/request-code", json={"email": email})
    assert request_response.status_code == 200
    verify_response = client.post(
        "/api/account/auth/verify-code",
        json={"email": email, "code": request_response.json()["dev_code"]},
    )
    assert verify_response.status_code == 200


def test_get_account_me_works_with_session_cookie(client: TestClient) -> None:
    login(client)

    response = client.get("/api/account/me")

    assert response.status_code == 200
    assert response.json()["email"] == "session@example.com"


def test_settings_route_works_with_session_cookie(client: TestClient) -> None:
    login(client, "settings-session@example.com")

    response = client.patch(
        "/api/account/settings",
        json={"default_ayanamsa": "raman", "default_node_type": "true"},
    )

    assert response.status_code == 200
    assert response.json()["default_ayanamsa"] == "raman"
    assert response.json()["default_node_type"] == "true"


def test_charts_route_works_with_session_cookie(client: TestClient) -> None:
    login(client, "charts-session@example.com")

    create_response = client.post(
        "/api/account/charts",
        json={
            "chart_name": "Session chart",
            "birth_date": "1990-05-20",
            "birth_time": "14:30:00",
            "birth_timezone": "Europe/Moscow",
            "birth_place_name": "Moscow",
            "latitude": 55.7558,
            "longitude": 37.6173,
        },
    )
    list_response = client.get("/api/account/charts")

    assert create_response.status_code == 201
    assert list_response.status_code == 200
    assert list_response.json()[0]["chart_name"] == "Session chart"

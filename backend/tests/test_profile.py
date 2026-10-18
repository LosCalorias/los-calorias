import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

PROFILE = {
    "sex": "female",
    "age": 30,
    "height_cm": 165,
    "weight_kg": 60,
    "activity_level": "moderate",
    "goal": "maintain",
}


def auth_header(email: str = "anna@example.com") -> dict[str, str]:
    response = client.post("/auth/register", json={"email": email, "password": "secret-password"})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_profile_requires_login() -> None:
    assert client.get("/profile").status_code == 401
    assert client.put("/profile", json=PROFILE).status_code == 401


def test_get_profile_before_it_is_filled() -> None:
    response = client.get("/profile", headers=auth_header())

    assert response.status_code == 404
    assert response.json()["detail"] == "Профіль ще не заповнено"


def test_put_profile_returns_daily_norm() -> None:
    headers = auth_header()

    response = client.put("/profile", json=PROFILE, headers=headers)

    assert response.status_code == 200
    assert response.json() == PROFILE | {
        "daily_norm": {"kcal": 2046, "protein": 128, "fat": 68, "carbs": 230}
    }
    assert client.get("/profile", headers=headers).json() == response.json()


def test_changing_weight_or_goal_recalculates_norm() -> None:
    headers = auth_header()
    client.put("/profile", json=PROFILE, headers=headers)

    heavier = client.put("/profile", json=PROFILE | {"weight_kg": 70}, headers=headers)
    losing = client.put("/profile", json=PROFILE | {"goal": "lose"}, headers=headers)

    assert heavier.json()["daily_norm"]["kcal"] == 2201
    assert losing.json()["daily_norm"]["kcal"] == 1637
    assert client.get("/profile", headers=headers).json()["goal"] == "lose"


def test_profiles_are_separate_per_user() -> None:
    client.put("/profile", json=PROFILE, headers=auth_header("anna@example.com"))

    response = client.get("/profile", headers=auth_header("olha@example.com"))

    assert response.status_code == 404


@pytest.mark.parametrize(
    "override",
    [{"age": 5}, {"height_cm": 40}, {"weight_kg": 500}, {"goal": "bulk"}, {"sex": "other"}],
)
def test_put_profile_validates_input(override: dict[str, object]) -> None:
    response = client.put("/profile", json=PROFILE | override, headers=auth_header())

    assert response.status_code == 422

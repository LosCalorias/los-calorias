import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

TODAY = "2026-10-18"
YESTERDAY = "2026-10-17"
RECIPE = {
    "title": "Вівсянка",
    "servings": 2,
    "ingredients": [
        {
            "name": "Вівсяні пластівці",
            "quantity": 200,
            "unit": "g",
            "grams": 200,
            "kcal_per_100g": 100,
            "protein_per_100g": 10,
            "fat_per_100g": 5,
            "carbs_per_100g": 20,
        }
    ],
    "steps": ["Зварити"],
    "source_url": "https://www.tiktok.com/@chef/video/1",
}
MANUAL = {"date": TODAY, "meal_type": "snack", "name": "Яблуко", "kcal": 52}
PROFILE = {
    "sex": "female",
    "age": 30,
    "height_cm": 165,
    "weight_kg": 60,
    "activity_level": "moderate",
    "goal": "maintain",
}
NORM = {"kcal": 2046, "protein": 128, "fat": 68, "carbs": 230}


def auth_header(email: str = "anna@example.com") -> dict[str, str]:
    response = client.post("/auth/register", json={"email": email, "password": "secret-password"})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def create_recipe(headers: dict[str, str]) -> int:
    return client.post("/recipes", json=RECIPE, headers=headers).json()["id"]


def log_recipe(headers: dict[str, str], recipe_id: int, servings: float, day: str = TODAY):
    return client.post(
        "/meals",
        json={"date": day, "meal_type": "lunch", "recipe_id": recipe_id, "servings": servings},
        headers=headers,
    )


def test_log_one_serving_of_recipe() -> None:
    headers = auth_header()
    recipe_id = create_recipe(headers)

    response = log_recipe(headers, recipe_id, 1)

    assert response.status_code == 201
    body = response.json()
    assert body == {
        "id": body["id"],
        "date": TODAY,
        "meal_type": "lunch",
        "recipe_id": recipe_id,
        "name": "Вівсянка",
        "servings": 1,
        "kcal": 100,
        "protein": 10,
        "fat": 5,
        "carbs": 20,
    }


def test_log_two_servings_doubles_macros() -> None:
    headers = auth_header()

    body = log_recipe(headers, create_recipe(headers), 2).json()

    assert (body["kcal"], body["protein"], body["fat"], body["carbs"]) == (200, 20, 10, 40)


def test_meal_keeps_macros_after_recipe_changes() -> None:
    headers = auth_header()
    recipe_id = create_recipe(headers)
    log_recipe(headers, recipe_id, 1)

    client.put(f"/recipes/{recipe_id}", json=RECIPE | {"servings": 4}, headers=headers)

    assert client.get("/meals", params={"date": TODAY}, headers=headers).json()[0]["kcal"] == 100


def test_log_manual_meal() -> None:
    response = client.post("/meals", json=MANUAL, headers=auth_header())

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Яблуко"
    assert body["recipe_id"] is None
    assert body["servings"] is None
    assert (body["kcal"], body["protein"], body["fat"], body["carbs"]) == (52, 0, 0, 0)


@pytest.mark.parametrize(
    "payload",
    [
        {"date": TODAY, "meal_type": "lunch"},
        {"date": TODAY, "meal_type": "lunch", "recipe_id": 1},
        {"date": TODAY, "meal_type": "lunch", "name": "Суп"},
        {"date": TODAY, "meal_type": "lunch", "recipe_id": 1, "servings": 1, "name": "Суп"},
        {"date": TODAY, "meal_type": "lunch", "recipe_id": 1, "servings": 1, "kcal": 10},
        {"date": TODAY, "meal_type": "lunch", "recipe_id": 1, "servings": 0},
        MANUAL | {"servings": 1},
        MANUAL | {"kcal": -1},
        MANUAL | {"meal_type": "brunch"},
    ],
)
def test_invalid_meal_is_rejected(payload: dict[str, object]) -> None:
    response = client.post("/meals", json=payload, headers=auth_header())

    assert response.status_code == 422


def test_list_returns_only_meals_of_that_day() -> None:
    headers = auth_header()
    client.post("/meals", json=MANUAL | {"name": "Банан"}, headers=headers)
    client.post("/meals", json=MANUAL | {"date": YESTERDAY, "name": "Груша"}, headers=headers)
    client.post("/meals", json=MANUAL, headers=headers)

    response = client.get("/meals", params={"date": TODAY}, headers=headers)

    assert response.status_code == 200
    assert [meal["name"] for meal in response.json()] == ["Банан", "Яблуко"]


def test_delete_meal() -> None:
    headers = auth_header()
    meal_id = client.post("/meals", json=MANUAL, headers=headers).json()["id"]

    assert client.delete(f"/meals/{meal_id}", headers=headers).status_code == 204
    assert client.get("/meals", params={"date": TODAY}, headers=headers).json() == []
    response = client.delete(f"/meals/{meal_id}", headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Запис не знайдено"


def test_other_users_recipe_is_not_found() -> None:
    recipe_id = create_recipe(auth_header("anna@example.com"))

    response = log_recipe(auth_header("olha@example.com"), recipe_id, 1)

    assert response.status_code == 404
    assert response.json()["detail"] == "Рецепт не знайдено"


def test_other_users_meals_are_hidden() -> None:
    meal_id = client.post("/meals", json=MANUAL, headers=auth_header("anna@example.com")).json()[
        "id"
    ]
    other = auth_header("olha@example.com")

    assert client.get("/meals", params={"date": TODAY}, headers=other).json() == []
    assert client.delete(f"/meals/{meal_id}", headers=other).status_code == 404


def test_meals_require_login() -> None:
    assert client.post("/meals", json=MANUAL).status_code == 401
    assert client.get("/meals", params={"date": TODAY}).status_code == 401
    assert client.delete("/meals/1").status_code == 401


def profile_header() -> dict[str, str]:
    headers = auth_header()
    client.put("/profile", json=PROFILE, headers=headers)
    return headers


def get_summary(headers: dict[str, str], day: str = TODAY):
    return client.get("/meals/summary", params={"date": day}, headers=headers)


def test_summary_without_meals_equals_norm() -> None:
    response = get_summary(profile_header())

    assert response.status_code == 200
    assert response.json() == {
        "norm": NORM,
        "consumed": {"kcal": 0, "protein": 0, "fat": 0, "carbs": 0},
        "remaining": NORM,
    }


def test_logging_one_serving_reduces_remaining() -> None:
    headers = profile_header()
    log_recipe(headers, create_recipe(headers), 1)

    summary = get_summary(headers).json()

    assert summary["consumed"] == {"kcal": 100, "protein": 10, "fat": 5, "carbs": 20}
    assert summary["remaining"] == {"kcal": 1946, "protein": 118, "fat": 63, "carbs": 210}


def test_remaining_can_be_negative() -> None:
    headers = profile_header()
    client.post("/meals", json=MANUAL | {"kcal": 2100.5, "fat": 70}, headers=headers)

    remaining = get_summary(headers).json()["remaining"]

    assert remaining["kcal"] == -54.5
    assert remaining["fat"] == -2


def test_yesterdays_meals_do_not_affect_today() -> None:
    headers = profile_header()
    log_recipe(headers, create_recipe(headers), 1, day=YESTERDAY)

    assert get_summary(headers).json()["remaining"] == NORM
    assert get_summary(headers, YESTERDAY).json()["consumed"]["kcal"] == 100


def test_summary_without_profile_is_not_found() -> None:
    response = get_summary(auth_header())

    assert response.status_code == 404
    assert response.json()["detail"] == "Профіль ще не заповнено"


def test_summary_requires_login() -> None:
    assert client.get("/meals/summary", params={"date": TODAY}).status_code == 401

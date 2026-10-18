import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

FLOUR = {
    "name": "Борошно",
    "quantity": 200,
    "unit": "g",
    "grams": 200,
    "kcal_per_100g": 364,
    "protein_per_100g": 10,
    "fat_per_100g": 1,
    "carbs_per_100g": 76,
}
SALT = {
    "name": "Сіль",
    "quantity": None,
    "unit": None,
    "grams": None,
    "kcal_per_100g": 0,
    "protein_per_100g": 0,
    "fat_per_100g": 0,
    "carbs_per_100g": 0,
}
MILK = {
    "name": "Молоко",
    "quantity": 300,
    "unit": "ml",
    "grams": 300,
    "kcal_per_100g": 60,
    "protein_per_100g": 3,
    "fat_per_100g": 2.5,
    "carbs_per_100g": 4.7,
}
RECIPE = {
    "title": "Млинці",
    "servings": 2,
    "ingredients": [FLOUR, SALT, MILK],
    "steps": ["Змішати", "Посмажити"],
    "source_url": "https://www.tiktok.com/@chef/video/1",
}


def auth_header(email: str = "anna@example.com") -> dict[str, str]:
    response = client.post("/auth/register", json={"email": email, "password": "secret-password"})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def create_recipe(headers: dict[str, str], **override: object) -> dict:
    response = client.post("/recipes", json=RECIPE | override, headers=headers)
    assert response.status_code == 201
    return response.json()


def test_created_recipe_is_in_list() -> None:
    headers = auth_header()
    first = create_recipe(headers, title="Суп")
    second = create_recipe(headers)

    response = client.get("/recipes", headers=headers)

    assert response.status_code == 200
    assert response.json() == [
        {"id": second["id"], "title": "Млинці", "servings": 2, "kcal_per_serving": 454},
        {"id": first["id"], "title": "Суп", "servings": 2, "kcal_per_serving": 454},
    ]


def test_get_recipe_returns_ordered_ingredients_and_nutrition() -> None:
    headers = auth_header()
    recipe_id = create_recipe(headers)["id"]

    response = client.get(f"/recipes/{recipe_id}", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert [i["name"] for i in body["ingredients"]] == ["Борошно", "Сіль", "Молоко"]
    assert [i["missing_nutrition"] for i in body["ingredients"]] == [False, True, False]
    assert body["steps"] == ["Змішати", "Посмажити"]
    assert body["source_url"] == RECIPE["source_url"]
    assert body["nutrition"] == {
        "total": {"kcal": 908, "protein": 29, "fat": 9.5, "carbs": 166.1},
        "per_serving": {"kcal": 454, "protein": 14.5, "fat": 4.8, "carbs": 83},
    }


def test_put_replaces_fields_and_ingredients() -> None:
    headers = auth_header()
    recipe_id = create_recipe(headers)["id"]

    response = client.put(
        f"/recipes/{recipe_id}",
        json=RECIPE | {"title": "Тонкі млинці", "servings": 4, "ingredients": [MILK, FLOUR]},
        headers=headers,
    )

    assert response.status_code == 200
    body = client.get(f"/recipes/{recipe_id}", headers=headers).json()
    assert body["title"] == "Тонкі млинці"
    assert body["servings"] == 4
    assert [i["name"] for i in body["ingredients"]] == ["Молоко", "Борошно"]


def test_delete_recipe() -> None:
    headers = auth_header()
    recipe_id = create_recipe(headers)["id"]

    assert client.delete(f"/recipes/{recipe_id}", headers=headers).status_code == 204
    response = client.get(f"/recipes/{recipe_id}", headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Рецепт не знайдено"
    assert client.get("/recipes", headers=headers).json() == []


def test_other_users_recipe_is_not_found() -> None:
    recipe_id = create_recipe(auth_header("anna@example.com"))["id"]
    other = auth_header("olha@example.com")

    assert client.get(f"/recipes/{recipe_id}", headers=other).status_code == 404
    assert client.put(f"/recipes/{recipe_id}", json=RECIPE, headers=other).status_code == 404
    assert client.delete(f"/recipes/{recipe_id}", headers=other).status_code == 404
    assert client.get("/recipes", headers=other).json() == []


def test_missing_recipe_is_not_found() -> None:
    assert client.get("/recipes/999", headers=auth_header()).status_code == 404


def test_recipes_require_login() -> None:
    assert client.get("/recipes").status_code == 401
    assert client.post("/recipes", json=RECIPE).status_code == 401
    assert client.get("/recipes/1").status_code == 401
    assert client.put("/recipes/1", json=RECIPE).status_code == 401
    assert client.delete("/recipes/1").status_code == 401


@pytest.mark.parametrize("override", [{"servings": 0}, {"title": ""}, {"title": "x" * 201}])
def test_create_recipe_validates_input(override: dict[str, object]) -> None:
    response = client.post("/recipes", json=RECIPE | override, headers=auth_header())

    assert response.status_code == 422


def test_get_recipe_scales_to_servings() -> None:
    headers = auth_header()
    recipe_id = create_recipe(headers)["id"]
    original = client.get(f"/recipes/{recipe_id}", headers=headers).json()

    response = client.get(f"/recipes/{recipe_id}", params={"servings": 4}, headers=headers)

    assert response.status_code == 200
    scaled = response.json()
    assert scaled["servings"] == 4
    assert [i["grams"] for i in scaled["ingredients"]] == [400, None, 600]
    assert [i["quantity"] for i in scaled["ingredients"]] == [400, None, 600]
    assert scaled["nutrition"]["total"] == {"kcal": 1816, "protein": 58, "fat": 19, "carbs": 332.2}
    assert scaled["nutrition"]["per_serving"] == original["nutrition"]["per_serving"]
    assert client.get(f"/recipes/{recipe_id}", headers=headers).json() == original


def test_get_recipe_rejects_zero_servings() -> None:
    headers = auth_header()
    recipe_id = create_recipe(headers)["id"]

    response = client.get(f"/recipes/{recipe_id}", params={"servings": 0}, headers=headers)

    assert response.status_code == 422

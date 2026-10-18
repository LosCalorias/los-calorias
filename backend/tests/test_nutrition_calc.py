from app.modules.nutrition.calc import (
    ingredient_macros,
    recipe_nutrition,
    scale_ingredients,
)
from app.modules.nutrition.schemas import Macros
from app.modules.recipe_import.schemas import IngredientDraft


def make_ingredient(
    name: str = "Борошно", grams: float | None = 200, kcal: float | None = 364
) -> IngredientDraft:
    return IngredientDraft(
        name=name,
        quantity=grams,
        unit="g",
        grams=grams,
        kcal_per_100g=kcal,
        protein_per_100g=10,
        fat_per_100g=1,
        carbs_per_100g=76,
    )


def test_ingredient_macros_uses_grams() -> None:
    assert ingredient_macros(make_ingredient()) == Macros(kcal=728, protein=20, fat=2, carbs=152)


def test_ingredient_macros_is_none_without_data() -> None:
    assert ingredient_macros(make_ingredient(grams=None)) is None
    assert ingredient_macros(make_ingredient(kcal=None)) is None


def test_recipe_nutrition_sums_ingredients() -> None:
    ingredients = [make_ingredient(), make_ingredient("Цукор", grams=50, kcal=400)]

    nutrition = recipe_nutrition(ingredients, servings=2)

    assert nutrition.total == Macros(kcal=928, protein=25, fat=2.5, carbs=190)
    assert nutrition.per_serving == Macros(kcal=464, protein=12.5, fat=1.2, carbs=95)


def test_recipe_nutrition_skips_ingredients_without_data() -> None:
    ingredients = [make_ingredient(), make_ingredient("Сіль", grams=None)]

    nutrition = recipe_nutrition(ingredients, servings=1)

    assert nutrition.total == Macros(kcal=728, protein=20, fat=2, carbs=152)


def test_recipe_nutrition_rounds_to_one_decimal() -> None:
    nutrition = recipe_nutrition([make_ingredient(grams=100, kcal=100)], servings=3)

    assert nutrition.per_serving.kcal == 33.3


def test_scaling_two_to_four_servings_doubles_total_but_not_per_serving() -> None:
    ingredients = [make_ingredient(), make_ingredient("Сіль", grams=None)]
    original = recipe_nutrition(ingredients, servings=2)

    scaled_ingredients = scale_ingredients(ingredients, 4 / 2)
    scaled = recipe_nutrition(scaled_ingredients, servings=4)

    assert [i.grams for i in scaled_ingredients] == [400, None]
    assert [i.quantity for i in scaled_ingredients] == [400, None]
    assert scaled.total == Macros(kcal=1456, protein=40, fat=4, carbs=304)
    assert scaled.per_serving == original.per_serving
    assert ingredients[0].grams == 200

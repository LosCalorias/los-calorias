from collections.abc import Iterable
from app.modules.nutrition.schemas import Macros, RecipeNutrition
from app.modules.recipe_import.schemas import IngredientDraft

ZERO = Macros(kcal=0, protein=0, fat=0, carbs=0)


def add_macros(a: Macros, b: Macros) -> Macros:
    return Macros(
        kcal=a.kcal + b.kcal,
        protein=a.protein + b.protein,
        fat=a.fat + b.fat,
        carbs=a.carbs + b.carbs,
    )


def scale_macros(macros: Macros, factor: float) -> Macros:
    return Macros(
        kcal=macros.kcal * factor,
        protein=macros.protein * factor,
        fat=macros.fat * factor,
        carbs=macros.carbs * factor,
    )


def round_macros(macros: Macros) -> Macros:
    return Macros(
        kcal=round(macros.kcal, 1),
        protein=round(macros.protein, 1),
        fat=round(macros.fat, 1),
        carbs=round(macros.carbs, 1),
    )


def _raw_ingredient_macros(ingredient: IngredientDraft) -> Macros | None:
    per_100g = (
        ingredient.kcal_per_100g,
        ingredient.protein_per_100g,
        ingredient.fat_per_100g,
        ingredient.carbs_per_100g,
    )
    if ingredient.grams is None or None in per_100g:
        return None
    kcal, protein, fat, carbs = per_100g
    return scale_macros(
        Macros(kcal=kcal, protein=protein, fat=fat, carbs=carbs), ingredient.grams / 100
    )


def ingredient_macros(ingredient: IngredientDraft) -> Macros | None:
    macros = _raw_ingredient_macros(ingredient)
    return round_macros(macros) if macros else None


def recipe_nutrition(ingredients: Iterable[IngredientDraft], servings: int) -> RecipeNutrition:
    total = ZERO
    for ingredient in ingredients:
        macros = _raw_ingredient_macros(ingredient)
        if macros:
            total = add_macros(total, macros)
    return RecipeNutrition(
        total=round_macros(total), per_serving=round_macros(scale_macros(total, 1 / servings))
    )


def _scale(value: float | None, factor: float) -> float | None:
    return value * factor if value is not None else None


def scale_ingredients(
    ingredients: Iterable[IngredientDraft], factor: float
) -> list[IngredientDraft]:
    return [
        ingredient.model_copy(
            update={
                "quantity": _scale(ingredient.quantity, factor),
                "grams": _scale(ingredient.grams, factor),
            }
        )
        for ingredient in ingredients
    ]

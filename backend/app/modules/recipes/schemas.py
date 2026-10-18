from pydantic import BaseModel
from app.modules.nutrition.schemas import RecipeNutrition
from app.modules.recipe_import.schemas import IngredientDraft


class IngredientRead(IngredientDraft):
    missing_nutrition: bool


class RecipeRead(BaseModel):
    id: int
    title: str
    servings: int
    ingredients: list[IngredientRead]
    steps: list[str]
    source_url: str | None
    nutrition: RecipeNutrition


class RecipeSummary(BaseModel):
    id: int
    title: str
    servings: int
    kcal_per_serving: float

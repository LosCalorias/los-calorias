from pydantic import BaseModel


class Macros(BaseModel):
    kcal: float
    protein: float
    fat: float
    carbs: float


class RecipeNutrition(BaseModel):
    total: Macros
    per_serving: Macros

from pydantic import BaseModel, HttpUrl


class IngredientDraft(BaseModel):
    name: str
    quantity: float | None
    unit: str | None
    grams: float | None
    kcal_per_100g: float | None
    protein_per_100g: float | None
    fat_per_100g: float | None
    carbs_per_100g: float | None


class RecipeDraft(BaseModel):
    title: str
    servings: int
    ingredients: list[IngredientDraft]
    steps: list[str]
    source_url: str


class ImportRequest(BaseModel):
    url: HttpUrl

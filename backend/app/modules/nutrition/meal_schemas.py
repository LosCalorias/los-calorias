from datetime import date as Date
from typing import Self
from pydantic import BaseModel, Field, model_validator
from app.models import MealType


class MealCreate(BaseModel):
    date: Date
    meal_type: MealType
    recipe_id: int | None = None
    servings: float | None = Field(default=None, gt=0)
    name: str | None = Field(default=None, min_length=1)
    kcal: float | None = Field(default=None, ge=0)
    protein: float | None = Field(default=None, ge=0)
    fat: float | None = Field(default=None, ge=0)
    carbs: float | None = Field(default=None, ge=0)

    @property
    def is_from_recipe(self) -> bool:
        return self.recipe_id is not None

    @model_validator(mode="after")
    def check_source(self) -> Self:
        macros = (self.kcal, self.protein, self.fat, self.carbs)
        from_recipe = (
            self.recipe_id is not None
            and self.servings is not None
            and self.name is None
            and all(value is None for value in macros)
        )
        manual = (
            self.recipe_id is None
            and self.servings is None
            and self.name is not None
            and self.kcal is not None
        )
        if not (from_recipe or manual):
            raise ValueError("Вкажіть рецепт і кількість порцій або назву і калорійність")
        return self


class MealRead(BaseModel):
    id: int
    date: Date
    meal_type: MealType
    recipe_id: int | None
    name: str
    servings: float | None
    kcal: float
    protein: float
    fat: float
    carbs: float

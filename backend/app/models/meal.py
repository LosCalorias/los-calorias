from datetime import UTC, datetime
from datetime import date as Date
from enum import StrEnum
from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


class MealType(StrEnum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"


class Meal(SQLModel, table=True):
    __tablename__ = "meals"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    recipe_id: int | None = Field(default=None, foreign_key="recipes.id", ondelete="SET NULL")
    date: Date = Field(index=True)
    meal_type: MealType
    name: str
    servings: float | None = None
    kcal: float
    protein: float
    fat: float
    carbs: float
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC), sa_type=DateTime(timezone=True)
    )

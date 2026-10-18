from sqlmodel import SQLModel
from app.models.meal import Meal, MealType
from app.models.profile import ActivityLevel, Goal, Profile, Sex
from app.models.recipe import Ingredient, Recipe
from app.models.user import User

# Import every table model here so Alembic autogenerate sees it.

__all__ = [
    "ActivityLevel",
    "Goal",
    "Ingredient",
    "Meal",
    "MealType",
    "Profile",
    "Recipe",
    "SQLModel",
    "Sex",
    "User",
]

from datetime import date
from sqlmodel import Session, col, select
from app.models import Meal, Profile, Recipe
from app.modules.nutrition.calc import (
    ZERO,
    add_macros,
    recipe_nutrition,
    round_macros,
    scale_macros,
)
from app.modules.nutrition.meal_schemas import DaySummary, MealCreate
from app.modules.nutrition.schemas import Macros
from app.modules.profile.norm import calculate_daily_norm
from app.modules.recipes.service import ingredient_drafts


def recipe_meal_macros(recipe: Recipe, servings: float) -> Macros:
    per_serving = recipe_nutrition(ingredient_drafts(recipe), recipe.servings).per_serving
    return round_macros(scale_macros(per_serving, servings))


def create_meal(
    session: Session, user_id: int, data: MealCreate, recipe: Recipe | None = None
) -> Meal:
    if recipe is not None:
        name = recipe.title
        macros = recipe_meal_macros(recipe, data.servings)
    else:
        name = data.name
        macros = Macros(
            kcal=data.kcal, protein=data.protein or 0, fat=data.fat or 0, carbs=data.carbs or 0
        )
    meal = Meal(
        user_id=user_id,
        recipe_id=data.recipe_id,
        date=data.date,
        meal_type=data.meal_type,
        name=name,
        servings=data.servings,
        **macros.model_dump(),
    )
    session.add(meal)
    session.commit()
    session.refresh(meal)
    return meal


def list_meals(session: Session, user_id: int, day: date) -> list[Meal]:
    statement = (
        select(Meal)
        .where(Meal.user_id == user_id, Meal.date == day)
        .order_by(col(Meal.created_at), col(Meal.id))
    )
    return list(session.exec(statement).all())


def get_meal(session: Session, user_id: int, meal_id: int) -> Meal | None:
    meal = session.get(Meal, meal_id)
    return meal if meal is not None and meal.user_id == user_id else None


def delete_meal(session: Session, meal: Meal) -> None:
    session.delete(meal)
    session.commit()


def day_summary(session: Session, user_id: int, day: date, profile: Profile) -> DaySummary:
    norm = Macros.model_validate(calculate_daily_norm(profile).model_dump())
    consumed = ZERO
    for meal in list_meals(session, user_id, day):
        meal_macros = Macros(kcal=meal.kcal, protein=meal.protein, fat=meal.fat, carbs=meal.carbs)
        consumed = add_macros(consumed, meal_macros)
    return DaySummary(
        norm=norm,
        consumed=round_macros(consumed),
        remaining=round_macros(add_macros(norm, scale_macros(consumed, -1))),
    )

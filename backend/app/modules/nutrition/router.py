from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session
from app.core.db import get_session
from app.models import User
from app.modules.auth.dependencies import get_current_user
from app.modules.nutrition.meal_schemas import DaySummary, MealCreate, MealRead
from app.modules.nutrition.meal_service import (
    create_meal,
    day_summary,
    delete_meal,
    get_meal,
    list_meals,
)
from app.modules.profile.service import get_profile
from app.modules.recipes.service import get_recipe

router = APIRouter(prefix="/meals", tags=["meals"])

SessionDep = Annotated[Session, Depends(get_session)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("", response_model=MealRead, status_code=status.HTTP_201_CREATED)
def create(data: MealCreate, user: CurrentUser, session: SessionDep) -> MealRead:
    recipe = None
    if data.is_from_recipe:
        recipe = get_recipe(session, user.id, data.recipe_id)
        if recipe is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Рецепт не знайдено")
    return MealRead.model_validate(
        create_meal(session, user.id, data, recipe), from_attributes=True
    )


@router.get("", response_model=list[MealRead])
def read_day(
    user: CurrentUser, session: SessionDep, day: Annotated[date, Query(alias="date")]
) -> list[MealRead]:
    return [
        MealRead.model_validate(meal, from_attributes=True)
        for meal in list_meals(session, user.id, day)
    ]


@router.get("/summary", response_model=DaySummary)
def read_summary(
    user: CurrentUser, session: SessionDep, day: Annotated[date, Query(alias="date")]
) -> DaySummary:
    profile = get_profile(session, user.id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Профіль ще не заповнено")
    return day_summary(session, user.id, day, profile)


@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(meal_id: int, user: CurrentUser, session: SessionDep) -> None:
    meal = get_meal(session, user.id, meal_id)
    if meal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Запис не знайдено")
    delete_meal(session, meal)

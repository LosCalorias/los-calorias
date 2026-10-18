from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from app.core.db import get_session
from app.models import Recipe, User
from app.modules.auth.dependencies import get_current_user
from app.modules.recipe_import.schemas import RecipeDraft
from app.modules.recipes.schemas import RecipeRead, RecipeSummary
from app.modules.recipes.service import (
    create_recipe,
    delete_recipe,
    get_recipe,
    list_recipes,
    to_read,
    to_summary,
    update_recipe,
)

router = APIRouter(prefix="/recipes", tags=["recipes"])

SessionDep = Annotated[Session, Depends(get_session)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def get_own_recipe(session: Session, user: User, recipe_id: int) -> Recipe:
    recipe = get_recipe(session, user.id, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Рецепт не знайдено")
    return recipe


@router.post("", response_model=RecipeRead, status_code=status.HTTP_201_CREATED)
def create(draft: RecipeDraft, user: CurrentUser, session: SessionDep) -> RecipeRead:
    return to_read(create_recipe(session, user.id, draft))


@router.get("", response_model=list[RecipeSummary])
def read_all(user: CurrentUser, session: SessionDep) -> list[RecipeSummary]:
    return [to_summary(recipe) for recipe in list_recipes(session, user.id)]


@router.get("/{recipe_id}", response_model=RecipeRead)
def read_one(recipe_id: int, user: CurrentUser, session: SessionDep) -> RecipeRead:
    return to_read(get_own_recipe(session, user, recipe_id))


@router.put("/{recipe_id}", response_model=RecipeRead)
def update(
    recipe_id: int, draft: RecipeDraft, user: CurrentUser, session: SessionDep
) -> RecipeRead:
    recipe = get_own_recipe(session, user, recipe_id)
    return to_read(update_recipe(session, recipe, draft))


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(recipe_id: int, user: CurrentUser, session: SessionDep) -> None:
    delete_recipe(session, get_own_recipe(session, user, recipe_id))

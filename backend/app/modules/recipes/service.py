from sqlalchemy.orm import selectinload
from sqlmodel import Session, col, select
from app.models import Ingredient, Recipe
from app.modules.nutrition.calc import ingredient_macros, recipe_nutrition, scale_ingredients
from app.modules.recipe_import.schemas import IngredientDraft, RecipeDraft
from app.modules.recipes.schemas import IngredientRead, RecipeRead, RecipeSummary


def _build_ingredients(draft: RecipeDraft) -> list[Ingredient]:
    return [
        Ingredient(position=position, **ingredient.model_dump())
        for position, ingredient in enumerate(draft.ingredients)
    ]


def create_recipe(session: Session, user_id: int, draft: RecipeDraft) -> Recipe:
    recipe = Recipe(
        user_id=user_id,
        title=draft.title,
        servings=draft.servings,
        steps=draft.steps,
        source_url=draft.source_url,
        ingredients=_build_ingredients(draft),
    )
    session.add(recipe)
    session.commit()
    session.refresh(recipe)
    return recipe


def list_recipes(session: Session, user_id: int) -> list[Recipe]:
    statement = (
        select(Recipe)
        .where(Recipe.user_id == user_id)
        .options(selectinload(Recipe.ingredients))
        .order_by(col(Recipe.created_at).desc(), col(Recipe.id).desc())
    )
    return list(session.exec(statement).all())


def get_recipe(session: Session, user_id: int, recipe_id: int) -> Recipe | None:
    recipe = session.get(Recipe, recipe_id)
    return recipe if recipe is not None and recipe.user_id == user_id else None


def update_recipe(session: Session, recipe: Recipe, draft: RecipeDraft) -> Recipe:
    recipe.title = draft.title
    recipe.servings = draft.servings
    recipe.steps = draft.steps
    recipe.source_url = draft.source_url
    recipe.ingredients = _build_ingredients(draft)
    session.add(recipe)
    session.commit()
    session.refresh(recipe)
    return recipe


def delete_recipe(session: Session, recipe: Recipe) -> None:
    session.delete(recipe)
    session.commit()


def ingredient_drafts(recipe: Recipe) -> list[IngredientDraft]:
    return [
        IngredientDraft.model_validate(ingredient, from_attributes=True)
        for ingredient in recipe.ingredients
    ]


def to_read(recipe: Recipe, servings: int | None = None) -> RecipeRead:
    servings = servings or recipe.servings
    ingredients = scale_ingredients(ingredient_drafts(recipe), servings / recipe.servings)
    return RecipeRead(
        id=recipe.id,
        title=recipe.title,
        servings=servings,
        ingredients=[
            IngredientRead(
                **ingredient.model_dump(), missing_nutrition=ingredient_macros(ingredient) is None
            )
            for ingredient in ingredients
        ],
        steps=recipe.steps,
        source_url=recipe.source_url,
        nutrition=recipe_nutrition(ingredients, servings),
    )


def to_summary(recipe: Recipe) -> RecipeSummary:
    nutrition = recipe_nutrition(ingredient_drafts(recipe), recipe.servings)
    return RecipeSummary(
        id=recipe.id,
        title=recipe.title,
        servings=recipe.servings,
        kcal_per_serving=nutrition.per_serving.kcal,
    )

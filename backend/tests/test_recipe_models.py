from datetime import date
from sqlmodel import Session, select
from app.models import Ingredient, Meal, MealType, Recipe, User


def create_user(session: Session) -> User:
    user = User(email="anna@example.com", password_hash="hash")
    session.add(user)
    session.commit()
    return user


def test_recipe_with_ingredients_is_saved_and_read(session: Session) -> None:
    user = create_user(session)
    recipe = Recipe(
        user_id=user.id,
        title="Млинці",
        servings=2,
        steps=["Змішати", "Посмажити"],
        source_url="https://www.tiktok.com/@chef/video/1",
        ingredients=[
            Ingredient(position=1, name="Молоко", grams=300),
            Ingredient(position=0, name="Борошно", quantity=200, unit="g", grams=200),
        ],
    )
    session.add(recipe)
    session.commit()
    session.expire_all()

    saved = session.get(Recipe, recipe.id)

    assert saved is not None
    assert saved.title == "Млинці"
    assert saved.steps == ["Змішати", "Посмажити"]
    assert [ingredient.name for ingredient in saved.ingredients] == ["Борошно", "Молоко"]
    assert saved.ingredients[1].kcal_per_100g is None


def test_deleting_recipe_deletes_its_ingredients(session: Session) -> None:
    user = create_user(session)
    recipe = Recipe(
        user_id=user.id, title="Салат", servings=1, ingredients=[Ingredient(position=0, name="A")]
    )
    session.add(recipe)
    session.commit()

    session.delete(recipe)
    session.commit()

    assert session.exec(select(Ingredient)).all() == []


def test_meal_is_saved(session: Session) -> None:
    user = create_user(session)
    meal = Meal(
        user_id=user.id,
        date=date(2026, 10, 18),
        meal_type=MealType.LUNCH,
        name="Суп",
        kcal=250.5,
        protein=10,
        fat=8,
        carbs=30,
    )
    session.add(meal)
    session.commit()
    session.expire_all()

    saved = session.get(Meal, meal.id)

    assert saved is not None
    assert saved.date == date(2026, 10, 18)
    assert saved.meal_type == MealType.LUNCH
    assert saved.recipe_id is None

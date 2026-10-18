from datetime import UTC, datetime
from sqlalchemy import JSON, DateTime
from sqlmodel import Field, Relationship, SQLModel


class Recipe(SQLModel, table=True):
    __tablename__ = "recipes"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    title: str = Field(max_length=200)
    servings: int
    steps: list[str] = Field(default_factory=list, sa_type=JSON)
    source_url: str | None = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC), sa_type=DateTime(timezone=True)
    )

    ingredients: list["Ingredient"] = Relationship(
        back_populates="recipe",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "order_by": "Ingredient.position",
        },
    )


class Ingredient(SQLModel, table=True):
    __tablename__ = "ingredients"

    id: int | None = Field(default=None, primary_key=True)
    recipe_id: int | None = Field(
        default=None, foreign_key="recipes.id", ondelete="CASCADE", index=True
    )
    position: int
    name: str
    quantity: float | None = None
    unit: str | None = None
    grams: float | None = None
    kcal_per_100g: float | None = None
    protein_per_100g: float | None = None
    fat_per_100g: float | None = None
    carbs_per_100g: float | None = None

    recipe: Recipe | None = Relationship(back_populates="ingredients")

from sqlmodel import SQLModel
from app.models.profile import ActivityLevel, Goal, Profile, Sex
from app.models.user import User

# Import every table model here so Alembic autogenerate sees it.

__all__ = ["ActivityLevel", "Goal", "Profile", "SQLModel", "Sex", "User"]

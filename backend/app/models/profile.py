from datetime import UTC, datetime
from enum import StrEnum
from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


class Sex(StrEnum):
    FEMALE = "female"
    MALE = "male"


class ActivityLevel(StrEnum):
    SEDENTARY = "sedentary"
    LIGHT = "light"
    MODERATE = "moderate"
    ACTIVE = "active"
    VERY_ACTIVE = "very_active"


class Goal(StrEnum):
    LOSE = "lose"
    MAINTAIN = "maintain"
    GAIN = "gain"


class Profile(SQLModel, table=True):
    __tablename__ = "profiles"

    user_id: int = Field(foreign_key="users.id", primary_key=True, ondelete="CASCADE")
    sex: Sex
    age: int
    height_cm: float
    weight_kg: float
    activity_level: ActivityLevel
    goal: Goal
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC), sa_type=DateTime(timezone=True)
    )

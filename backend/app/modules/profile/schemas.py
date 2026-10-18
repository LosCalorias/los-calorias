from pydantic import BaseModel, Field
from app.models import ActivityLevel, Goal, Sex
from app.modules.profile.norm import DailyNorm


class ProfileUpdate(BaseModel):
    sex: Sex
    age: int = Field(ge=14, le=100)
    height_cm: float = Field(ge=100, le=250)
    weight_kg: float = Field(ge=30, le=300)
    activity_level: ActivityLevel
    goal: Goal


class ProfileRead(ProfileUpdate):
    daily_norm: DailyNorm

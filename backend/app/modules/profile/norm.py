from pydantic import BaseModel
from app.models import ActivityLevel, Goal, Profile, Sex

ACTIVITY_FACTORS = {
    ActivityLevel.SEDENTARY: 1.2,
    ActivityLevel.LIGHT: 1.375,
    ActivityLevel.MODERATE: 1.55,
    ActivityLevel.ACTIVE: 1.725,
    ActivityLevel.VERY_ACTIVE: 1.9,
}
GOAL_FACTORS = {Goal.LOSE: 0.8, Goal.MAINTAIN: 1.0, Goal.GAIN: 1.1}
SEX_OFFSETS = {Sex.FEMALE: -161, Sex.MALE: 5}
MIN_KCAL = {Sex.FEMALE: 1200, Sex.MALE: 1500}

PROTEIN_SHARE, FAT_SHARE, CARBS_SHARE = 0.25, 0.30, 0.45
KCAL_PER_GRAM_PROTEIN, KCAL_PER_GRAM_FAT, KCAL_PER_GRAM_CARBS = 4, 9, 4


class DailyNorm(BaseModel):
    kcal: int
    protein: int
    fat: int
    carbs: int


def calculate_daily_norm(profile: Profile) -> DailyNorm:
    bmr = (
        10 * profile.weight_kg
        + 6.25 * profile.height_cm
        - 5 * profile.age
        + SEX_OFFSETS[profile.sex]
    )
    target = bmr * ACTIVITY_FACTORS[profile.activity_level] * GOAL_FACTORS[profile.goal]
    kcal = round(max(target, MIN_KCAL[profile.sex]))
    return DailyNorm(
        kcal=kcal,
        protein=round(kcal * PROTEIN_SHARE / KCAL_PER_GRAM_PROTEIN),
        fat=round(kcal * FAT_SHARE / KCAL_PER_GRAM_FAT),
        carbs=round(kcal * CARBS_SHARE / KCAL_PER_GRAM_CARBS),
    )

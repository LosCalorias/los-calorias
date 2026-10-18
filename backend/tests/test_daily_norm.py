import pytest
from app.models import ActivityLevel, Goal, Profile, Sex
from app.modules.profile.norm import DailyNorm, calculate_daily_norm


def make_profile(**overrides: object) -> Profile:
    fields = {
        "user_id": 1,
        "sex": Sex.FEMALE,
        "age": 30,
        "height_cm": 165,
        "weight_kg": 60,
        "activity_level": ActivityLevel.MODERATE,
        "goal": Goal.MAINTAIN,
    }
    return Profile(**(fields | overrides))


def test_female_maintenance_norm() -> None:
    assert calculate_daily_norm(make_profile()) == DailyNorm(
        kcal=2046, protein=128, fat=68, carbs=230
    )


def test_male_gain_norm() -> None:
    profile = make_profile(
        sex=Sex.MALE,
        age=25,
        height_cm=180,
        weight_kg=80,
        activity_level=ActivityLevel.ACTIVE,
        goal=Goal.GAIN,
    )

    assert calculate_daily_norm(profile).kcal == 3425


@pytest.mark.parametrize(("goal", "kcal"), [(Goal.LOSE, 1637), (Goal.MAINTAIN, 2046)])
def test_goal_changes_norm(goal: Goal, kcal: int) -> None:
    assert calculate_daily_norm(make_profile(goal=goal)).kcal == kcal


def test_weight_change_recalculates_norm() -> None:
    lighter = calculate_daily_norm(make_profile(weight_kg=60))
    heavier = calculate_daily_norm(make_profile(weight_kg=70))

    assert heavier.kcal - lighter.kcal == round(100 * 1.55)


@pytest.mark.parametrize(
    ("sex", "age", "height_cm", "weight_kg", "minimum"),
    [(Sex.FEMALE, 70, 150, 45, 1200), (Sex.MALE, 80, 155, 50, 1500)],
)
def test_norm_never_below_safe_minimum(
    sex: Sex, age: int, height_cm: float, weight_kg: float, minimum: int
) -> None:
    profile = make_profile(
        sex=sex,
        age=age,
        height_cm=height_cm,
        weight_kg=weight_kg,
        activity_level=ActivityLevel.SEDENTARY,
        goal=Goal.LOSE,
    )

    assert calculate_daily_norm(profile).kcal == minimum


@pytest.mark.parametrize("goal", list(Goal))
def test_macros_add_up_to_kcal(goal: Goal) -> None:
    norm = calculate_daily_norm(make_profile(goal=goal))

    assert norm.protein * 4 + norm.fat * 9 + norm.carbs * 4 == pytest.approx(norm.kcal, abs=10)

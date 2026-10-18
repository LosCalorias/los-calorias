from datetime import UTC, datetime
from sqlmodel import Session
from app.models import Profile
from app.modules.profile.norm import calculate_daily_norm
from app.modules.profile.schemas import ProfileRead, ProfileUpdate


def get_profile(session: Session, user_id: int) -> Profile | None:
    return session.get(Profile, user_id)


def save_profile(session: Session, user_id: int, data: ProfileUpdate) -> Profile:
    profile = session.get(Profile, user_id) or Profile(user_id=user_id, **data.model_dump())
    profile.sqlmodel_update(data.model_dump())
    profile.updated_at = datetime.now(UTC)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile


def to_read(profile: Profile) -> ProfileRead:
    return ProfileRead.model_validate(
        {**profile.model_dump(), "daily_norm": calculate_daily_norm(profile)}
    )

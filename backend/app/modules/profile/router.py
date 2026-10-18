from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from app.core.db import get_session
from app.models import User
from app.modules.auth.dependencies import get_current_user
from app.modules.profile.schemas import ProfileRead, ProfileUpdate
from app.modules.profile.service import get_profile, save_profile, to_read

router = APIRouter(prefix="/profile", tags=["profile"])

SessionDep = Annotated[Session, Depends(get_session)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=ProfileRead)
def read_profile(user: CurrentUser, session: SessionDep) -> ProfileRead:
    profile = get_profile(session, user.id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Профіль ще не заповнено")
    return to_read(profile)


@router.put("", response_model=ProfileRead)
def update_profile(data: ProfileUpdate, user: CurrentUser, session: SessionDep) -> ProfileRead:
    return to_read(save_profile(session, user.id, data))

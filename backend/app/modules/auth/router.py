from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from app.core.db import get_session
from app.modules.auth.schemas import LoginRequest, RegisterRequest, Token
from app.modules.auth.security import create_access_token
from app.modules.auth.service import (
    EmailTakenError,
    InvalidCredentialsError,
    authenticate_user,
    register_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])

SessionDep = Annotated[Session, Depends(get_session)]


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, session: SessionDep) -> Token:
    try:
        user = register_user(session, request.email, request.password)
    except EmailTakenError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Цей email уже використовується"
        ) from error
    return Token(access_token=create_access_token(user.id))


@router.post("/login", response_model=Token)
def login(request: LoginRequest, session: SessionDep) -> Token:
    try:
        user = authenticate_user(session, request.email, request.password)
    except InvalidCredentialsError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Невірний email або пароль"
        ) from error
    return Token(access_token=create_access_token(user.id))

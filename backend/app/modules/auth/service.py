from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select
from app.models import User
from app.modules.auth.security import hash_password, verify_password


class EmailTakenError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


# Keeps login time the same whether or not the email exists.
DUMMY_PASSWORD_HASH = hash_password("dummy-password")


def register_user(session: Session, email: str, password: str) -> User:
    user = User(email=email.lower(), password_hash=hash_password(password))
    session.add(user)
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        raise EmailTakenError(email) from error
    session.refresh(user)
    return user


def authenticate_user(session: Session, email: str, password: str) -> User:
    user = session.exec(select(User).where(User.email == email.lower())).first()
    if user is None:
        verify_password(password, DUMMY_PASSWORD_HASH)
        raise InvalidCredentialsError(email)
    if not verify_password(password, user.password_hash):
        raise InvalidCredentialsError(email)
    return user

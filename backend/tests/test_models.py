import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session
from app.models import User


def test_user_email_is_unique(session: Session) -> None:
    session.add(User(email="anna@example.com", password_hash="hash"))
    session.commit()
    session.add(User(email="anna@example.com", password_hash="other"))

    with pytest.raises(IntegrityError):
        session.commit()

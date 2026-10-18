from datetime import UTC, datetime, timedelta
from typing import Annotated
import jwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from app.core.config import settings
from app.core.db import get_session
from app.main import app
from app.models import User
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.security import ALGORITHM, create_access_token, decode_access_token

client = TestClient(app)

EMAIL = "anna@example.com"
PASSWORD = "secret-password"


def register(email: str = EMAIL, password: str = PASSWORD):
    return client.post("/auth/register", json={"email": email, "password": password})


def login(email: str = EMAIL, password: str = PASSWORD):
    return client.post("/auth/login", json={"email": email, "password": password})


def test_register_returns_token_for_new_user(session: Session) -> None:
    response = register()

    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    user = session.exec(select(User)).one()
    assert user.email == EMAIL
    assert user.password_hash != PASSWORD
    assert decode_access_token(body["access_token"]) == user.id


def test_register_rejects_taken_email() -> None:
    register()

    response = register(email="Anna@Example.com")

    assert response.status_code == 409
    assert response.json()["detail"] == "Цей email уже використовується"


@pytest.mark.parametrize(("email", "password"), [("not-an-email", PASSWORD), (EMAIL, "short")])
def test_register_validates_input(email: str, password: str) -> None:
    assert register(email, password).status_code == 422


def test_login_returns_token_for_same_user() -> None:
    register()

    response = login(email="ANNA@example.com")

    assert response.status_code == 200
    user_id = decode_access_token(response.json()["access_token"])
    assert user_id is not None


@pytest.mark.parametrize(
    ("email", "password"), [(EMAIL, "wrong-password"), ("nobody@example.com", PASSWORD)]
)
def test_login_rejects_invalid_credentials(email: str, password: str) -> None:
    register()

    response = login(email, password)

    assert response.status_code == 401
    assert response.json()["detail"] == "Невірний email або пароль"


@pytest.fixture
def protected_client(session: Session) -> TestClient:
    protected_app = FastAPI()

    @protected_app.get("/me")
    def me(user: Annotated[User, Depends(get_current_user)]) -> dict[str, str]:
        return {"email": user.email}

    protected_app.dependency_overrides[get_session] = lambda: session
    return TestClient(protected_app)


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_current_user_from_valid_token(protected_client: TestClient) -> None:
    token = register().json()["access_token"]

    response = protected_client.get("/me", headers=auth_header(token))

    assert response.status_code == 200
    assert response.json() == {"email": EMAIL}


def make_token(sub: str, expires_in: timedelta, secret: str = settings.jwt_secret) -> str:
    payload = {"sub": sub, "exp": datetime.now(UTC) + expires_in}
    return jwt.encode(payload, secret, algorithm=ALGORITHM)


@pytest.mark.parametrize(
    "headers",
    [
        {},
        auth_header("garbage"),
        auth_header(make_token("1", timedelta(minutes=-1))),
        auth_header(
            make_token("1", timedelta(minutes=5), secret="other-secret-at-least-32-bytes-long")
        ),
        auth_header(create_access_token(999)),
    ],
    ids=["missing", "malformed", "expired", "wrong-secret", "unknown-user"],
)
def test_current_user_rejects_bad_token(
    protected_client: TestClient, headers: dict[str, str]
) -> None:
    register()

    response = protected_client.get("/me", headers=headers)

    assert response.status_code == 401
    assert response.json()["detail"] == "Потрібно увійти"

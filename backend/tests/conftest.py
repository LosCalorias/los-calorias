import os

os.environ.setdefault("JWT_SECRET", "test-secret-at-least-32-bytes-long")

from collections.abc import Iterator  # noqa: E402
import pytest  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402
from sqlmodel import Session, SQLModel, create_engine  # noqa: E402
import app.models  # noqa: E402, F401
from app.core.db import get_session  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        app.dependency_overrides[get_session] = lambda: session
        yield session
    app.dependency_overrides.clear()
    engine.dispose()

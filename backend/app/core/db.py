from collections.abc import Iterator
from sqlmodel import Session, create_engine
from app.core.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session

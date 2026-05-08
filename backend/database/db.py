import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database.models import Base
from backend.utils.config import get_settings


def _ensure_db_dir(database_url: str) -> None:
    """Create parent directory for SQLite databases if it doesn't exist."""
    if database_url.startswith("sqlite:///"):
        # Strip the sqlite:/// prefix to get the file path
        db_path_str = database_url[len("sqlite:///"):]
        db_path = Path(db_path_str)
        if db_path.parent and str(db_path.parent) != ".":
            db_path.parent.mkdir(parents=True, exist_ok=True)


settings = get_settings()

_database_url = settings.database_url
_connect_args = {"check_same_thread": False} if _database_url.startswith("sqlite") else {}

_ensure_db_dir(_database_url)

engine = create_engine(
    _database_url,
    connect_args=_connect_args,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency that provides a SQLAlchemy session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


__all__ = ["engine", "SessionLocal", "Base", "get_db"]

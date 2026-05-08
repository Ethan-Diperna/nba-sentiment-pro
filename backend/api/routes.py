"""
FastAPI router — all API endpoints for the NBA Sentiment service.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.ml.sentiment_engine import SentimentEngine
from backend.services.sentiment_service import SentimentService
from backend.utils.config import Settings, get_settings

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Shared dependencies
# ---------------------------------------------------------------------------

# The engine is constructed once at module import and reused across requests.
_engine_cache: dict[str, SentimentEngine] = {}


def get_engine(settings: Annotated[Settings, Depends(get_settings)]) -> SentimentEngine:
    key = settings.model_name
    if key not in _engine_cache:
        _engine_cache[key] = SentimentEngine(settings)
    return _engine_cache[key]


def get_service(
    db: Annotated[Session, Depends(get_db)],
    engine: Annotated[SentimentEngine, Depends(get_engine)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> SentimentService:
    return SentimentService(db_session=db, engine=engine, settings=settings)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/health")
def health_check(settings: Annotated[Settings, Depends(get_settings)]) -> dict:
    """Basic liveness check."""
    return {"status": "ok", "model": settings.model_name}


@router.get("/model-info")
def model_info(settings: Annotated[Settings, Depends(get_settings)]) -> dict:
    """Returns metadata about the currently configured model."""
    return {
        "model_name": settings.model_name,
        "use_fine_tuned": settings.use_fine_tuned,
        "version": "1.0.0",
    }


@router.get("/player/{name}")
async def get_player_sentiment(
    name: str,
    service: Annotated[SentimentService, Depends(get_service)],
) -> dict:
    """
    Run the full sentiment pipeline for a player and return the result.

    - name: Player's full name (URL-encoded, e.g. "LeBron%20James")
    """
    player_name = name.replace("-", " ").strip()
    if not player_name:
        raise HTTPException(status_code=400, detail="Player name must not be empty.")

    try:
        result = await service.get_player_sentiment(player_name)
    except Exception as exc:
        logger.exception("Sentiment pipeline failed for '%s': %s", player_name, exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze sentiment for '{player_name}': {exc}",
        ) from exc

    return result


@router.get("/history/{name}")
def get_history(
    name: str,
    service: Annotated[SentimentService, Depends(get_service)],
    days: Annotated[int, Query(ge=1, le=365)] = 30,
) -> list[dict]:
    """
    Return historical sentiment scores for a player over the past *days* days.
    """
    player_name = name.replace("-", " ").strip()
    if not player_name:
        raise HTTPException(status_code=400, detail="Player name must not be empty.")

    try:
        history = service.get_history(player_name, days=days)
    except Exception as exc:
        logger.exception("History query failed for '%s': %s", player_name, exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve history for '{player_name}': {exc}",
        ) from exc

    return history


@router.get("/comments/{name}")
def get_comments(
    name: str,
    service: Annotated[SentimentService, Depends(get_service)],
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
) -> list[dict]:
    """
    Return the top *limit* Reddit comments (by upvotes) for a player.
    """
    player_name = name.replace("-", " ").strip()
    if not player_name:
        raise HTTPException(status_code=400, detail="Player name must not be empty.")

    try:
        comments = service.get_top_comments(player_name, limit=limit)
    except Exception as exc:
        logger.exception("Comments query failed for '%s': %s", player_name, exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve comments for '{player_name}': {exc}",
        ) from exc

    return comments

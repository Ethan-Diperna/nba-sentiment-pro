"""
NBA Sentiment API — FastAPI application entry point.
"""

from __future__ import annotations

import logging
import sys

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import router
from backend.database.db import Base, engine
from backend.utils.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="NBA Sentiment API",
        version="1.0.0",
        description=(
            "Real-time NBA player sentiment analysis powered by Reddit "
            "data and transformer-based NLP."
        ),
    )

    # CORS
    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routes
    app.include_router(router)

    # Startup handler
    @app.on_event("startup")
    async def on_startup() -> None:
        logger.info("Creating database tables (if not exist)…")
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables ready.")
        except Exception as exc:
            logger.error("Failed to create DB tables: %s", exc)

        logger.info("Downloading NLTK vader_lexicon (if needed)…")
        try:
            import nltk  # type: ignore

            try:
                nltk.data.find("sentiment/vader_lexicon.zip")
            except LookupError:
                nltk.download("vader_lexicon", quiet=True)
                logger.info("vader_lexicon downloaded.")
        except Exception as exc:
            logger.warning("Could not download vader_lexicon: %s", exc)

    return app


app = create_app()


if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "backend.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
        log_level="info",
    )

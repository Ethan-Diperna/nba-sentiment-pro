"""
Sentiment inference engine.

Priority order:
1. Fine-tuned checkpoint (if settings.use_fine_tuned and checkpoint exists)
2. DistilBERT SST-2 pipeline via HuggingFace transformers
3. VADER fallback (when torch / transformers are unavailable)
"""

from __future__ import annotations

import logging
import os
from typing import Any

from backend.utils.config import Settings

logger = logging.getLogger(__name__)


class SentimentEngine:
    """Wraps a transformer sentiment pipeline (or VADER fallback)."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._pipeline: Any = None
        self._vader: Any = None
        self._use_vader = False

        self._load_model()

    # ------------------------------------------------------------------
    # Model loading
    # ------------------------------------------------------------------

    def _load_model(self) -> None:
        try:
            import torch  # noqa: F401 — just checking it's available
            from transformers import pipeline  # type: ignore

            model_name = self._resolve_model_name()
            logger.info("Loading transformer model: %s", model_name)
            self._pipeline = pipeline(
                "sentiment-analysis",
                model=model_name,
                tokenizer=model_name,
                truncation=True,
                max_length=512,
            )
            logger.info("Transformer model loaded successfully.")
        except Exception as exc:
            logger.warning(
                "Could not load transformer model (%s). Falling back to VADER.", exc
            )
            self._load_vader()

    def _resolve_model_name(self) -> str:
        if self._settings.use_fine_tuned:
            checkpoint_dir = self._settings.model_checkpoint_dir
            if os.path.isdir(checkpoint_dir):
                return checkpoint_dir
            logger.warning(
                "Fine-tuned checkpoint dir '%s' not found; using base model.",
                checkpoint_dir,
            )
        return "distilbert-base-uncased-finetuned-sst-2-english"

    def _load_vader(self) -> None:
        try:
            import nltk  # type: ignore
            from nltk.sentiment import SentimentIntensityAnalyzer  # type: ignore

            try:
                nltk.data.find("sentiment/vader_lexicon.zip")
            except LookupError:
                nltk.download("vader_lexicon", quiet=True)

            self._vader = SentimentIntensityAnalyzer()
            self._use_vader = True
            logger.info("VADER fallback loaded successfully.")
        except Exception as exc:
            logger.error("VADER also failed to load: %s", exc)
            self._use_vader = True  # will return neutral 0.0 for everything

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def analyze_comment(self, text: str) -> dict:
        """
        Analyze a single comment.

        Returns:
            {
                "compound": float,   # [-1, 1]
                "label":    str,     # "positive" | "neutral" | "negative"
                "confidence": float, # [0, 1]
            }
        """
        if not text or not text.strip():
            return {"compound": 0.0, "label": "neutral", "confidence": 0.0}

        if self._use_vader:
            return self._analyze_vader(text)
        return self._analyze_transformer(text)

    def analyze_batch(self, texts: list[str]) -> list[dict]:
        """Analyze a list of texts, returning one result dict per text."""
        return [self.analyze_comment(t) for t in texts]

    # ------------------------------------------------------------------
    # Internal analyzers
    # ------------------------------------------------------------------

    def _analyze_transformer(self, text: str) -> dict:
        try:
            result = self._pipeline(text[:512])[0]
            raw_label: str = result["label"].upper()   # "POSITIVE" or "NEGATIVE"
            raw_score: float = float(result["score"])  # model confidence [0, 1]

            # Map to compound: POSITIVE → [0, 1], NEGATIVE → [-1, 0]
            if raw_label == "POSITIVE":
                compound = raw_score * 2 - 1  # [0,1] → [−1,1], but skewed positive
                compound = max(0.0, compound)
            else:
                compound = -(raw_score * 2 - 1)
                compound = min(0.0, compound)

            return {
                "compound": compound,
                "label": self._label_from_compound(compound),
                "confidence": raw_score,
            }
        except Exception as exc:
            logger.warning("Transformer inference error: %s", exc)
            return {"compound": 0.0, "label": "neutral", "confidence": 0.0}

    def _analyze_vader(self, text: str) -> dict:
        if self._vader is None:
            return {"compound": 0.0, "label": "neutral", "confidence": 0.0}
        try:
            scores = self._vader.polarity_scores(text)
            compound: float = float(scores["compound"])
            # Confidence proxy: how far compound is from 0
            confidence = min(1.0, abs(compound) + 0.5)
            return {
                "compound": compound,
                "label": self._label_from_compound(compound),
                "confidence": confidence,
            }
        except Exception as exc:
            logger.warning("VADER inference error: %s", exc)
            return {"compound": 0.0, "label": "neutral", "confidence": 0.0}

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _label_from_compound(score: float) -> str:
        if score >= 0.05:
            return "positive"
        if score <= -0.05:
            return "negative"
        return "neutral"

    @property
    def model_name(self) -> str:
        if self._use_vader:
            return "vader"
        return self._settings.model_name

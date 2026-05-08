"""
SentimentService — orchestrates the full pipeline:
    collect → clean → analyze → slang-adjust → aggregate → save → return
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta
from math import log1p

from sqlalchemy.orm import Session

from backend.collectors import reddit_collector
from backend.database.models import Player, RedditComment, SentimentScore
from backend.ml.sentiment_engine import SentimentEngine
from backend.utils.config import Settings
from backend.utils.text_utils import adjust_for_slang, clean_text, detect_sarcasm

logger = logging.getLogger(__name__)


def _slugify(name: str) -> str:
    """Convert a player name to a URL-safe slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


class SentimentService:
    def __init__(
        self,
        db_session: Session,
        engine: SentimentEngine,
        settings: Settings,
    ) -> None:
        self._db = db_session
        self._engine = engine
        self._settings = settings

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def get_player_sentiment(self, player_name: str) -> dict:
        """
        Full pipeline for a player.  Returns:
        {
            player_name, score, positive_pct, neutral_pct, negative_pct,
            comment_count, top_comments, label, created_at
        }
        """
        # 1. Collect
        raw_comments = reddit_collector.collect_comments(player_name)

        if not raw_comments:
            logger.warning("No comments collected for '%s'.", player_name)
            return self._empty_result(player_name)

        # 2. Clean + filter
        processed: list[dict] = []
        for item in raw_comments:
            cleaned = clean_text(item["comment_text"])
            if not cleaned:
                continue
            item = dict(item)  # don't mutate original
            item["cleaned_text"] = cleaned
            processed.append(item)

        if not processed:
            return self._empty_result(player_name)

        # 3. Analyze sentiment
        texts = [p["cleaned_text"] for p in processed]
        analyses = self._engine.analyze_batch(texts)

        # 4. Apply slang adjustment + sarcasm dampening
        for item, analysis in zip(processed, analyses):
            compound = analysis["compound"]
            compound = adjust_for_slang(item["cleaned_text"], compound)
            if detect_sarcasm(item["cleaned_text"]):
                compound *= 0.5  # dampen sarcastic comments
            item["compound"] = compound
            item["label"] = SentimentEngine._label_from_compound(compound)
            item["confidence"] = analysis["confidence"]

        # 5. Aggregate
        score, pos_pct, neu_pct, neg_pct = self._aggregate(processed)

        # 6. Save to DB
        player = self._get_or_create_player(player_name)
        self._save_sentiment_score(player, score, pos_pct, neu_pct, neg_pct, len(processed))
        self._save_comments(player, processed)
        self._db.commit()

        # 7. Build response
        label = self._score_to_label(score)
        top_comments = self._select_top_comments(processed, limit=10)

        return {
            "player_name": player_name,
            "score": round(score, 2),
            "positive_pct": round(pos_pct, 2),
            "neutral_pct": round(neu_pct, 2),
            "negative_pct": round(neg_pct, 2),
            "comment_count": len(processed),
            "top_comments": top_comments,
            "label": label,
            "created_at": datetime.utcnow().isoformat(),
        }

    def get_history(self, player_name: str, days: int = 30) -> list[dict]:
        """Return historical SentimentScore rows for the player."""
        player = self._db.query(Player).filter_by(slug=_slugify(player_name)).first()
        if not player:
            return []

        since = datetime.utcnow() - timedelta(days=days)
        rows = (
            self._db.query(SentimentScore)
            .filter(
                SentimentScore.player_id == player.id,
                SentimentScore.created_at >= since,
            )
            .order_by(SentimentScore.created_at.asc())
            .all()
        )

        return [
            {
                "score": row.score,
                "positive_pct": row.positive_pct,
                "neutral_pct": row.neutral_pct,
                "negative_pct": row.negative_pct,
                "comment_count": row.comment_count,
                "source": row.source,
                "created_at": row.created_at.isoformat(),
            }
            for row in rows
        ]

    def get_top_comments(self, player_name: str, limit: int = 10) -> list[dict]:
        """Return the most recent top-upvoted comments for a player."""
        player = self._db.query(Player).filter_by(slug=_slugify(player_name)).first()
        if not player:
            return []

        rows = (
            self._db.query(RedditComment)
            .filter(RedditComment.player_id == player.id)
            .order_by(RedditComment.upvotes.desc())
            .limit(limit)
            .all()
        )

        return [
            {
                "comment_text": row.comment_text,
                "cleaned_text": row.cleaned_text,
                "label": row.label,
                "upvotes": row.upvotes,
                "subreddit": row.subreddit,
                "post_title": row.post_title,
                "collected_at": row.collected_at.isoformat(),
            }
            for row in rows
        ]

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _aggregate(
        self, processed: list[dict]
    ) -> tuple[float, float, float, float]:
        """
        Compute weighted average sentiment and label percentages.

        Weight = 1 + log1p(max(0, upvotes))
        Score = (weighted_avg_compound + 1) * 50  →  [0, 100]
        """
        total_weight = 0.0
        weighted_sum = 0.0
        pos = neg = neu = 0

        for item in processed:
            upvotes = max(0, item.get("upvotes", 0))
            weight = 1.0 + log1p(upvotes)
            compound = item["compound"]
            weighted_sum += compound * weight
            total_weight += weight

            lbl = item["label"]
            if lbl == "positive":
                pos += 1
            elif lbl == "negative":
                neg += 1
            else:
                neu += 1

        n = len(processed)
        avg_compound = weighted_sum / total_weight if total_weight > 0 else 0.0
        score = (avg_compound + 1.0) * 50.0
        score = max(0.0, min(100.0, score))

        pos_pct = (pos / n * 100) if n else 0.0
        neu_pct = (neu / n * 100) if n else 0.0
        neg_pct = (neg / n * 100) if n else 0.0

        return score, pos_pct, neu_pct, neg_pct

    def _get_or_create_player(self, player_name: str) -> Player:
        slug = _slugify(player_name)
        player = self._db.query(Player).filter_by(slug=slug).first()
        if not player:
            player = Player(name=player_name, slug=slug)
            self._db.add(player)
            self._db.flush()  # get player.id without full commit
        return player

    def _save_sentiment_score(
        self,
        player: Player,
        score: float,
        positive_pct: float,
        neutral_pct: float,
        negative_pct: float,
        comment_count: int,
    ) -> None:
        row = SentimentScore(
            player_id=player.id,
            score=score,
            positive_pct=positive_pct,
            neutral_pct=neutral_pct,
            negative_pct=negative_pct,
            comment_count=comment_count,
            source="reddit",
        )
        self._db.add(row)

    def _save_comments(self, player: Player, processed: list[dict]) -> None:
        for item in processed:
            row = RedditComment(
                player_id=player.id,
                comment_text=item["comment_text"],
                cleaned_text=item.get("cleaned_text", ""),
                score_compound=item.get("compound", 0.0),
                label=item.get("label", "neutral"),
                upvotes=item.get("upvotes", 0),
                subreddit=item.get("subreddit", ""),
                post_title=item.get("post_title", ""),
            )
            self._db.add(row)

    @staticmethod
    def _select_top_comments(processed: list[dict], limit: int = 10) -> list[dict]:
        sorted_items = sorted(
            processed, key=lambda x: x.get("upvotes", 0), reverse=True
        )
        return [
            {
                "comment_text": item["comment_text"],
                "label": item["label"],
                "upvotes": item.get("upvotes", 0),
                "subreddit": item.get("subreddit", ""),
                "compound": round(item.get("compound", 0.0), 4),
            }
            for item in sorted_items[:limit]
        ]

    @staticmethod
    def _score_to_label(score: float) -> str:
        if score >= 60:
            return "positive"
        if score <= 40:
            return "negative"
        return "neutral"

    @staticmethod
    def _empty_result(player_name: str) -> dict:
        return {
            "player_name": player_name,
            "score": 50.0,
            "positive_pct": 0.0,
            "neutral_pct": 100.0,
            "negative_pct": 0.0,
            "comment_count": 0,
            "top_comments": [],
            "label": "neutral",
            "created_at": datetime.utcnow().isoformat(),
        }

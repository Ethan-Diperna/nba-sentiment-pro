"""
Standalone inference script.

Usage:
    python training/scripts/inference.py "LeBron James"

Model priority:
  1. Fine-tuned DistilBERT checkpoint (training/checkpoints/distilbert-nba-sentiment/)
  2. SST-2 pretrained DistilBERT (distilbert-base-uncased-finetuned-sst-2-english)
  3. VADER fallback (handled internally by SentimentEngine)

Collects up to 50 Reddit comments for the given player, runs them through
the SentimentEngine, and prints a summary with score, label breakdown, and
the top 5 most confident comments with their predicted labels.
"""

from __future__ import annotations

import os
import sys

# Add project root so backend imports resolve
PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
sys.path.insert(0, PROJECT_ROOT)

from backend.collectors.reddit_collector import collect_comments
from backend.ml.sentiment_engine import SentimentEngine
from backend.utils.config import Settings

CHECKPOINT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "checkpoints",
    "distilbert-nba-sentiment",
)

MAX_COMMENTS = 50


def _build_settings() -> Settings:
    """Return Settings pointing to the best available model."""
    fine_tuned_available = os.path.isdir(CHECKPOINT_DIR) and os.path.exists(
        os.path.join(CHECKPOINT_DIR, "config.json")
    )

    if fine_tuned_available:
        print(f"Using fine-tuned checkpoint: {CHECKPOINT_DIR}")
        return Settings(
            model_checkpoint_dir=os.path.dirname(CHECKPOINT_DIR),
            use_fine_tuned=True,
        )

    print("Fine-tuned checkpoint not found — using SST-2 pretrained DistilBERT.")
    return Settings(
        model_name="distilbert-base-uncased-finetuned-sst-2-english",
        use_fine_tuned=False,
    )


def run_inference(player_name: str) -> None:
    print(f"\nCollecting up to {MAX_COMMENTS} Reddit comments for: {player_name}")
    comments = collect_comments(
        player_name,
        max_posts=20,
        max_comments_per_post=10,
    )

    if not comments:
        print(
            "No comments collected. "
            "Check Reddit credentials or try a different player name."
        )
        return

    comments = comments[:MAX_COMMENTS]
    print(f"Collected {len(comments)} comments.\n")

    try:
        settings = _build_settings()
        engine = SentimentEngine(settings)
    except Exception as exc:
        print(f"Failed to load transformer model ({exc}). Falling back to VADER.")
        settings = Settings(model_name="vader", use_fine_tuned=False)
        engine = SentimentEngine(settings)

    texts = [c["comment_text"] for c in comments]
    results = engine.analyze_batch(texts)

    # --- Aggregate ---
    scores = [r["score"] for r in results]
    avg_score = sum(scores) / len(scores) if scores else 0.0

    label_counts: dict[str, int] = {"positive": 0, "neutral": 0, "negative": 0}
    for r in results:
        label = r.get("label", "neutral").lower()
        label_counts[label] = label_counts.get(label, 0) + 1

    total = len(results)

    print(f"=== Sentiment Summary: {player_name} ===")
    print(f"  Average score:  {avg_score:+.4f}")
    print(
        f"  Positive:       {label_counts['positive']:>3}"
        f"  ({label_counts['positive'] / total * 100:.1f}%)"
    )
    print(
        f"  Neutral:        {label_counts['neutral']:>3}"
        f"  ({label_counts['neutral'] / total * 100:.1f}%)"
    )
    print(
        f"  Negative:       {label_counts['negative']:>3}"
        f"  ({label_counts['negative'] / total * 100:.1f}%)"
    )
    print(f"  Total comments: {total}")

    # --- Top 5 by confidence (highest absolute score) ---
    ranked = sorted(
        zip(texts, results),
        key=lambda pair: abs(pair[1]["score"]),
        reverse=True,
    )

    print("\n--- Top 5 Most Confident Comments ---")
    for i, (text, result) in enumerate(ranked[:5], start=1):
        label = result.get("label", "neutral")
        score = result.get("score", 0.0)
        preview = text[:120].replace("\n", " ")
        print(f"  {i}. [{label.upper():>8}  score={score:+.3f}]  {preview}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Usage: python training/scripts/inference.py "Player Name"')
        sys.exit(1)

    player = " ".join(sys.argv[1:])
    run_inference(player)

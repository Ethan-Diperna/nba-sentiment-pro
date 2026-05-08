"""
Reddit comment collector for NBA player sentiment analysis.

Tries PRAW (authenticated) first.  Falls back to Reddit's public JSON
endpoint when credentials are absent or PRAW is unavailable.
"""

from __future__ import annotations

import re
import time
import logging
from typing import Optional

import requests

from backend.utils.config import get_settings
from backend.utils.text_utils import clean_text, comment_mentions_player, get_player_terms

logger = logging.getLogger(__name__)

SUBREDDITS = ["nba", "sportsbook", "fantasynba", "nbadiscussion"]

_MIN_WORDS = 8
_MAX_WORDS = 80
_REQUEST_DELAY = 1.0  # seconds between public-API requests


def collect_comments(
    player_name: str,
    max_posts: int = 20,
    max_comments_per_post: int = 25,
) -> list[dict]:
    """
    Collect Reddit comments about *player_name*.

    Returns a list of dicts:
        {
            "comment_text": str,
            "upvotes": int,
            "subreddit": str,
            "post_title": str,
        }
    """
    settings = get_settings()

    if settings.reddit_client_id and settings.reddit_client_secret:
        try:
            return _collect_via_praw(player_name, max_posts, max_comments_per_post)
        except Exception as exc:
            logger.warning("PRAW collection failed (%s); falling back to JSON scraper.", exc)

    return _collect_via_json(player_name, max_posts, max_comments_per_post)


# ---------------------------------------------------------------------------
# PRAW path
# ---------------------------------------------------------------------------

def _collect_via_praw(
    player_name: str,
    max_posts: int,
    max_comments_per_post: int,
) -> list[dict]:
    import praw  # type: ignore

    settings = get_settings()
    reddit = praw.Reddit(
        client_id=settings.reddit_client_id,
        client_secret=settings.reddit_client_secret,
        user_agent=settings.reddit_user_agent,
    )

    player_name_lower = player_name.lower()
    results: list[dict] = []

    for sub_name in SUBREDDITS:
        subreddit = reddit.subreddit(sub_name)
        try:
            posts = list(subreddit.search(player_name, limit=max_posts, sort="new"))
        except Exception as exc:
            logger.warning("PRAW search failed for r/%s: %s", sub_name, exc)
            continue

        for post in posts:
            if player_name_lower not in post.title.lower():
                continue

            post.comments.replace_more(limit=0)
            count = 0
            for comment in post.comments.list():
                if count >= max_comments_per_post:
                    break

                text = getattr(comment, "body", "")
                if not _is_valid_comment(text, player_name):
                    continue

                results.append(
                    {
                        "comment_text": text,
                        "upvotes": max(0, getattr(comment, "score", 0)),
                        "subreddit": sub_name,
                        "post_title": post.title,
                    }
                )
                count += 1

    logger.info("PRAW collected %d comments for '%s'.", len(results), player_name)
    return results


# ---------------------------------------------------------------------------
# Public JSON fallback
# ---------------------------------------------------------------------------

_HEADERS = {"User-Agent": "nba-sentiment-pro/1.0 (fallback scraper)"}


def _collect_via_json(
    player_name: str,
    max_posts: int,
    max_comments_per_post: int,
) -> list[dict]:
    """
    Scrapes Reddit's public ?format=json endpoints without authentication.
    Mirrors the logic from the original DataPipeline.py.
    """
    results: list[dict] = []
    player_name_lower = player_name.lower()

    for sub_name in SUBREDDITS:
        search_url = (
            f"https://www.reddit.com/r/{sub_name}/search.json"
            f"?q={requests.utils.quote(player_name)}&sort=new&limit={max_posts}&restrict_sr=1"
        )
        try:
            resp = requests.get(search_url, headers=_HEADERS, timeout=10)
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            logger.warning("JSON search failed for r/%s: %s", sub_name, exc)
            time.sleep(_REQUEST_DELAY)
            continue

        posts = data.get("data", {}).get("children", [])

        for post_wrapper in posts:
            post_data = post_wrapper.get("data", {})
            post_title: str = post_data.get("title", "")
            post_id: str = post_data.get("id", "")

            if player_name_lower not in post_title.lower():
                continue

            comments = _fetch_post_comments(sub_name, post_id)
            count = 0

            for comment in comments:
                if count >= max_comments_per_post:
                    break

                text: str = comment.get("body", "")
                upvotes: int = max(0, comment.get("ups", 0))

                if not _is_valid_comment(text, player_name):
                    continue

                results.append(
                    {
                        "comment_text": text,
                        "upvotes": upvotes,
                        "subreddit": sub_name,
                        "post_title": post_title,
                    }
                )
                count += 1

        time.sleep(_REQUEST_DELAY)

    logger.info("JSON scraper collected %d comments for '%s'.", len(results), player_name)
    return results


def _fetch_post_comments(subreddit: str, post_id: str) -> list[dict]:
    """Return a flat list of comment dicts for a given post."""
    url = f"https://www.reddit.com/r/{subreddit}/comments/{post_id}.json"
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=10)
        resp.raise_for_status()
        listing = resp.json()
    except Exception as exc:
        logger.warning("Failed to fetch comments for post %s: %s", post_id, exc)
        return []

    comments: list[dict] = []
    if len(listing) < 2:
        return comments

    for child in listing[1].get("data", {}).get("children", []):
        kind = child.get("kind", "")
        if kind != "t1":
            continue
        cdata = child.get("data", {})
        if cdata.get("body") and cdata["body"] != "[deleted]":
            comments.append(cdata)

    return comments


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _is_valid_comment(text: str, player_name: str) -> bool:
    """
    Return True when *text* is a usable comment:
    - Not empty / deleted
    - Word count in [_MIN_WORDS, _MAX_WORDS]
    - Mentions the player by first name, last name, or full name
    """
    if not text or text in ("[deleted]", "[removed]"):
        return False

    word_count = len(text.split())
    if word_count < _MIN_WORDS or word_count > _MAX_WORDS:
        return False

    return comment_mentions_player(text, player_name)

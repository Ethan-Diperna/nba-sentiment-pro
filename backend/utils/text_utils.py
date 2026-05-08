import re


# ---------------------------------------------------------------------------
# NBA slang dictionary
# Positive values boost compound score; negative values reduce it.
# ---------------------------------------------------------------------------
NBA_SLANG: dict[str, float] = {
    # Positive slang
    "him": 0.4,
    "that dude": 0.3,
    "generational": 0.5,
    "goat": 0.6,
    "nasty": 0.4,
    "different": 0.3,
    "elite": 0.5,
    "buckets": 0.2,
    "locked in": 0.4,
    "hooping": 0.3,
    "takeover": 0.3,
    "iso god": 0.5,
    # Negative slang
    "washed": -0.6,
    "cooked": -0.5,
    "bricklayer": -0.5,
    "fraud": -0.6,
    "overrated": -0.4,
    "trash": -0.6,
    "mid": -0.3,
    "bust": -0.5,
    "owns him": -0.4,
    "can't guard": -0.2,
    # Sarcasm / compound phrases (context-dependent)
    "generational bricklayer": -0.6,
    "mvp of losing": -0.5,
}

SARCASM_PATTERNS: list[str] = [
    r"\bsuddenly\b.*\bgoat\b",
    r"\bwow\b.*\b(incredible|amazing)\b.*\?",
    r"oh yeah.*definitely",
    r"totally not.*\b(bad|terrible|awful)\b",
]

_COMPILED_SARCASM = [re.compile(p, re.IGNORECASE | re.DOTALL) for p in SARCASM_PATTERNS]


def clean_text(text: str) -> str:
    """Lowercase, remove URLs, remove non-alphanumeric chars, strip whitespace."""
    text = text.lower()
    # Remove URLs
    text = re.sub(r"https?://\S+|www\.\S+", "", text)
    # Remove everything that isn't a letter, digit, or whitespace
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    # Collapse multiple spaces
    text = re.sub(r"\s+", " ", text).strip()
    return text


def contains_term(text: str, term: str) -> bool:
    """Return True if *term* appears as a whole word inside *text*."""
    pattern = r"\b" + re.escape(term.lower()) + r"\b"
    return bool(re.search(pattern, text.lower()))


def get_player_terms(player_name: str) -> list[str]:
    """Return [full_name, first_name, last_name] for mention matching."""
    parts = player_name.strip().split()
    terms: list[str] = [player_name.lower()]
    if len(parts) >= 2:
        terms.append(parts[0].lower())   # first name
        terms.append(parts[-1].lower())  # last name
    return terms


def comment_mentions_player(text: str, player_name: str) -> bool:
    """Return True if the comment text mentions the player by any name form."""
    lowered = text.lower()
    for term in get_player_terms(player_name):
        if contains_term(lowered, term):
            return True
    return False


def adjust_for_slang(text: str, base_compound: float) -> float:
    """
    Scan *text* for NBA slang terms and adjust *base_compound* accordingly.

    Multi-word terms are checked first (longest match wins implicitly because
    we iterate over all terms).  The final result is clamped to [-1, 1].
    """
    lowered = text.lower()
    adjustment = 0.0

    # Sort by length descending so longer phrases match before sub-phrases
    for term, modifier in sorted(NBA_SLANG.items(), key=lambda kv: -len(kv[0])):
        if term in lowered:
            adjustment += modifier

    adjusted = base_compound + adjustment
    return max(-1.0, min(1.0, adjusted))


def detect_sarcasm(text: str) -> bool:
    """Return True if any sarcasm pattern matches the text."""
    for pattern in _COMPILED_SARCASM:
        if pattern.search(text):
            return True
    return False

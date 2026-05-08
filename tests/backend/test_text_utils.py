import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.utils.text_utils import (
    clean_text,
    contains_term,
    get_player_terms,
    comment_mentions_player,
    adjust_for_slang,
    detect_sarcasm,
)


def test_clean_text_lowercases():
    assert clean_text("LeBron JAMES") == "lebron james"


def test_clean_text_removes_urls():
    assert "http" not in clean_text("check https://nba.com for stats")


def test_clean_text_removes_special_chars():
    result = clean_text("he's #1!")
    assert "#" not in result
    assert "!" not in result


def test_contains_term_word_boundary():
    assert contains_term("lebron james played well", "lebron") is True
    assert contains_term("lebrons shot was good", "lebron") is True
    # Should not match as a substring inside another word
    assert contains_term("glebron has no match", "lebron") is False


def test_get_player_terms_full_name():
    terms = get_player_terms("LeBron James")
    assert "lebron james" in terms
    assert "lebron" in terms
    assert "james" in terms


def test_get_player_terms_short_name_excluded():
    # Parts shorter than 3 chars should be excluded
    terms = get_player_terms("Ja Morant")
    assert "morant" in terms
    # "ja" is only 2 chars, should be excluded
    assert "ja" not in terms


def test_comment_mentions_player_by_first_name():
    assert comment_mentions_player("lebron really showed up tonight", "LeBron James") is True


def test_comment_mentions_player_by_last_name():
    assert comment_mentions_player("james is the goat no question", "LeBron James") is True


def test_comment_mentions_player_false():
    assert comment_mentions_player("steph curry is so nice", "LeBron James") is False


def test_adjust_for_slang_positive_term():
    # "goat" should push compound higher
    adjusted = adjust_for_slang("lebron is the goat", 0.0)
    assert adjusted > 0.0


def test_adjust_for_slang_negative_term():
    # "washed" should push compound lower
    adjusted = adjust_for_slang("lebron is washed", 0.0)
    assert adjusted < 0.0


def test_adjust_for_slang_capped():
    # Result should never exceed [-1, 1]
    result = adjust_for_slang("goat goat goat goat goat", 0.9)
    assert result <= 1.0
    result2 = adjust_for_slang("washed cooked trash fraud", -0.9)
    assert result2 >= -1.0


def test_detect_sarcasm_no_sarcasm():
    assert detect_sarcasm("lebron played great tonight") is False

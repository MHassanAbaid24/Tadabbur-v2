"""Tests for daily verse deterministic assignment."""

from datetime import date

import pytest

from app.services.daily_verse import get_verse_key_for_date


def test_same_date_returns_same_verse() -> None:
    """Same date always returns same verse key."""
    key1 = get_verse_key_for_date(date(2026, 3, 20))
    key2 = get_verse_key_for_date(date(2026, 3, 20))
    assert key1 == key2


def test_different_dates_return_different_verses() -> None:
    """Different dates return different verse keys."""
    key1 = get_verse_key_for_date(date(2026, 3, 20))
    key2 = get_verse_key_for_date(date(2026, 3, 21))
    assert key1 != key2


def test_verse_key_format() -> None:
    """Verse key format is chapter:verse (e.g., '2:255')."""
    import re

    key = get_verse_key_for_date(date(2026, 3, 20))
    assert re.match(r"^\d{1,3}:\d{1,3}$", key), f"Bad format: {key}"

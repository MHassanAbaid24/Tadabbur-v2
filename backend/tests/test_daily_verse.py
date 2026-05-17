"""Tests for daily verse deterministic assignment."""

import re
from datetime import date

import pytest

from app.services.daily_verse import get_verse_key_for_date


def test_same_date_returns_same_verse() -> None:
    """Same date always returns same verse key."""
    target_date = date(2026, 3, 20)
    key1 = get_verse_key_for_date(target_date)
    key2 = get_verse_key_for_date(target_date)
    assert key1 == key2
    assert key1 is not None


def test_different_dates_return_different_verses() -> None:
    """Different dates return different verse keys."""
    key1 = get_verse_key_for_date(date(2026, 3, 20))
    key2 = get_verse_key_for_date(date(2026, 3, 21))
    # Different dates should usually produce different verses
    assert key1 != key2


def test_verse_key_format() -> None:
    """Verse key format is chapter:verse (e.g., '2:255')."""
    key = get_verse_key_for_date(date(2026, 3, 20))
    assert re.match(r"^\d{1,3}:\d{1,3}$", key), f"Bad format: {key}"


def test_uniqueness_and_full_coverage() -> None:
    """Ensure that over 6236 days, exactly 6236 unique verses are returned."""
    from unittest.mock import patch
    with patch("app.services.daily_verse.settings") as mock_settings:
        mock_settings.qf_env = "production"
        start_date = date(2026, 1, 1)
        verses_seen = set()
        for i in range(6236):
            test_date = date.fromordinal(start_date.toordinal() + i)
            verse_key = get_verse_key_for_date(test_date)
            verses_seen.add(verse_key)
            
        assert len(verses_seen) == 6236


def test_non_consecutiveness() -> None:
    """Ensure consecutive days yield spaced-out verses."""
    from unittest.mock import patch
    with patch("app.services.daily_verse.settings") as mock_settings:
        mock_settings.qf_env = "production"
        date1 = date(2026, 1, 1)
        date2 = date(2026, 1, 2)
        
        key1 = get_verse_key_for_date(date1)
        key2 = get_verse_key_for_date(date2)
        
        from app.services.daily_verse import _get_verse_keys
        verse_keys = _get_verse_keys()
        
        idx1 = verse_keys.index(key1)
        idx2 = verse_keys.index(key2)
        
        # Difference should be greater than 100
        diff = abs(idx1 - idx2)
        assert diff > 100



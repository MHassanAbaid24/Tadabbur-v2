"""Deterministic daily verse assignment (same verse for all users each day)."""

import logging
from datetime import date
from typing import List

logger = logging.getLogger(__name__)

# Surah lengths in the Quran (114 surahs total)
SURAH_LENGTHS: List[int] = [
    7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
    123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
    112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
    34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
    54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
    60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
    14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
    28, 28, 20, 56, 40, 31, 50, 22, 11, 11,
    20, 19, 17, 64, 29, 19, 18, 20, 8, 8,
    11, 11, 8, 12, 11, 8, 8, 7, 9, 5,
    4, 5, 3, 6, 3, 5, 4, 5, 6, 3,
    6, 3, 5, 4, 5,
]

# Build the complete list of all 6236 verse keys once (cached)
_VERSE_KEYS_CACHE: List[str] | None = None


def _build_verse_keys() -> List[str]:
    """Build a list of all 6236 verse keys in order: "chapter:verse"."""
    keys: List[str] = []
    for chapter_num, surah_length in enumerate(SURAH_LENGTHS, start=1):
        for verse_num in range(1, surah_length + 1):
            keys.append(f"{chapter_num}:{verse_num}")
    return keys


def _get_verse_keys() -> List[str]:
    """Get cached list of all verse keys (lazy initialization)."""
    global _VERSE_KEYS_CACHE
    if _VERSE_KEYS_CACHE is None:
        _VERSE_KEYS_CACHE = _build_verse_keys()
        logger.debug("Built verse key cache: %d total verses", len(_VERSE_KEYS_CACHE))
    return _VERSE_KEYS_CACHE


def get_verse_key_for_date(target_date: date) -> str:
    """
    Get deterministic verse key for a given date.
    
    Same date always returns same verse. Different dates may return different verses.
    Algorithm: day_of_year % 6236 + 1, then map to verse key.
    
    Args:
        target_date: UTC date to get verse for
        
    Returns:
        Verse key in format "chapter:verse" (e.g., "2:255")
    """
    day_of_year = target_date.timetuple().tm_yday  # 1-366
    verse_index = (day_of_year % 6236)  # 0-6235 index
    
    verse_keys = _get_verse_keys()
    verse_key = verse_keys[verse_index]
    
    logger.debug("Date %s -> day_of_year=%d -> verse=%s", target_date, day_of_year, verse_key)
    return verse_key


def get_today_verse_key() -> str:
    """Get today's deterministic verse key (UTC)."""
    return get_verse_key_for_date(date.today())


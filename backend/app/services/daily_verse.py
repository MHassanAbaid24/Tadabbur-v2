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
    28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
    29, 19, 36, 25, 22, 17, 19, 26, 30, 20,
    15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
    11, 8, 3, 9, 5, 4, 7, 3, 6, 3,
    5, 4, 5, 6
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
    Algorithm: (target_date.toordinal() * 3559 + 1234) % 6236, then map to verse key.
    
    Args:
        target_date: UTC date to get verse for
        
    Returns:
        Verse key in format "chapter:verse" (e.g., "2:255")
    """
    verse_index = (target_date.toordinal() * 3559 + 1234) % 6236
    
    verse_keys = _get_verse_keys()
    verse_key = verse_keys[verse_index]
    
    logger.debug("Date %s -> ordinal=%d -> index=%d -> verse=%s", target_date, target_date.toordinal(), verse_index, verse_key)
    return verse_key


def get_today_verse_key() -> str:
    """Get today's deterministic verse key (UTC)."""
    return get_verse_key_for_date(date.today())


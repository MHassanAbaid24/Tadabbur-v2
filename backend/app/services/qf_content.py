"""Service layer for Quran Foundation Content APIs."""

import asyncio
import html
import logging
import re
from typing import Any, Dict, Optional

import httpx
from fastapi import HTTPException

from app.auth.qf_token import qf_token_manager
from app.config import settings

logger = logging.getLogger(__name__)

# Content API base URL
QF_CONTENT_BASE = f"{settings.qf_api_base_url}/content/api/v4"

# API IDs
TRANSLATION_ID = 85   # Abdel Haleem (used for prelive compatibility)
TAFSIR_ID = 169       # Ibn Kathir English
RECITATION_ID = 7     # Mishary Rashid Al-Afasy


def _qf_headers() -> Dict[str, str]:
    """Get QF Content API headers with current token."""
    return {
        "x-auth-token": qf_token_manager.get_token(),
        "x-client-id": settings.qf_client_id,
    }


async def _qf_get(url: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Make authenticated GET request to QF API with retry logic.

    Handles:
    - 401: Clear token cache, retry once with fresh token
    - 429: Exponential backoff (1s, 2s, 4s) max 3 retries
    - 500: Retry once after 1s

    Args:
        url: Full URL to QF API endpoint
        params: Query parameters

    Returns:
        Parsed JSON response

    Raises:
        HTTPException(401): After 401 retry fails
        HTTPException(503): On 429 exhausted or 500 retry fails
        HTTPException(503): On other HTTP errors
    """
    max_retries_429 = 3
    backoff_times_429 = [1, 2, 4]

    async with httpx.AsyncClient() as client:
        for attempt_429 in range(max_retries_429):
            try:
                headers = _qf_headers()
                response = await client.get(
                    url, headers=headers, params=params, timeout=10.0
                )

                if response.status_code == 401:
                    logger.warning("QF API 401 on %s, clearing token and retrying", url)
                    qf_token_manager.clear()

                    # Retry once with fresh token
                    try:
                        headers = _qf_headers()
                        response = await client.get(
                            url, headers=headers, params=params, timeout=10.0
                        )
                        if response.status_code == 401:
                            logger.error("QF API 401 still after retry on %s", url)
                            raise HTTPException(status_code=401, detail="QF authentication failed")
                        response.raise_for_status()
                        return response.json()
                    except httpx.HTTPError as e:
                        logger.error("QF API error after 401 retry on %s: %s", url, str(e))
                        raise HTTPException(status_code=503, detail="QF API error") from e

                elif response.status_code == 429:
                    if attempt_429 < max_retries_429 - 1:
                        wait_time = backoff_times_429[attempt_429]
                        logger.warning("QF API 429 on %s, backoff %ds", url, wait_time)
                        await asyncio.sleep(wait_time)
                        continue
                    else:
                        logger.error("QF API 429 exhausted retries on %s", url)
                        raise HTTPException(status_code=503, detail="QF API rate limited")

                elif response.status_code == 500:
                    logger.warning("QF API 500 on %s, retrying after 1s", url)
                    await asyncio.sleep(1)
                    try:
                        headers = _qf_headers()
                        response = await client.get(
                            url, headers=headers, params=params, timeout=10.0
                        )
                        response.raise_for_status()
                        return response.json()
                    except httpx.HTTPError as e:
                        logger.error("QF API 500 still after retry on %s: %s", url, str(e))
                        raise HTTPException(status_code=503, detail="QF API error") from e

                response.raise_for_status()
                return response.json()

            except httpx.HTTPError as e:
                if "429" not in str(e):
                    logger.error("QF API error on %s: %s", url, str(e))
                    raise HTTPException(status_code=503, detail="QF API error") from e
                continue

    raise HTTPException(status_code=503, detail="QF API error")


async def get_verse_by_key(verse_key: str) -> Dict[str, Any]:
    """
    Fetch verse by key from QF Verse API.

    Args:
        verse_key: Format "chapter:verse" (e.g., "2:255")

    Returns:
        Dict with verse_key, text_uthmani, translation

    Raises:
        HTTPException(400): Invalid verse_key format
        HTTPException(503): QF API error
    """
    if not re.match(r"^\d{1,3}:\d{1,3}$", verse_key):
        logger.warning("Invalid verse_key format: %s", verse_key)
        raise HTTPException(status_code=400, detail="Invalid verse key format")

    url = f"{QF_CONTENT_BASE}/verses/by_key/{verse_key}"
    params = {
        "translations": TRANSLATION_ID,
        "fields": "text_uthmani,translations",
    }

    data = await _qf_get(url, params)
    verse_data = data.get("verse", {})
    logger.debug("Fetched verse: %s", verse_key)

    # Extract translation text
    translation_text = ""
    translations = verse_data.get("translations", [])
    if translations:
        translation_text = translations[0].get("text", "")

    return {
        "verse_key": verse_key,
        "text_uthmani": verse_data.get("text_uthmani", ""),
        "translation": translation_text,
    }


async def get_tafsir_by_key(verse_key: str) -> str:
    """
    Fetch tafsir for a verse from QF Tafsir API.

    Args:
        verse_key: Format "chapter:verse" (e.g., "2:255")

    Returns:
        Tafsir text (HTML stripped), or empty string if not found

    Raises:
        None — returns empty string on error (non-blocking)
    """
    try:
        url = f"{QF_CONTENT_BASE}/tafsirs/{TAFSIR_ID}/by_ayah/{verse_key}"
        data = await _qf_get(url)

        tafsir_data = data.get("tafsir", {})
        if tafsir_data:
            tafsir_text = tafsir_data.get("text", "")
            logger.debug("Fetched tafsir for verse: %s (length: %d)", verse_key, len(tafsir_text))
            # Strip HTML tags
            tafsir_text = html.unescape(tafsir_text)
            tafsir_text = re.sub(r"<[^>]+>", "", tafsir_text)
            return tafsir_text.strip()

        logger.warning("No tafsir found in response for verse: %s. Keys: %s", verse_key, list(data.keys()))
        return ""

    except HTTPException:
        logger.debug("Tafsir fetch failed for verse: %s", verse_key)
        return ""
    except Exception as e:
        logger.warning("Unexpected error fetching tafsir for %s: %s", verse_key, str(e))
        return ""


async def get_audio_url(verse_key: str) -> Optional[str]:
    """
    Fetch audio URL for a verse from QF Recitation API.

    Args:
        verse_key: Format "chapter:verse" (e.g., "2:255")

    Returns:
        Audio file URL, or None if not found (non-blocking)

    Raises:
        None — returns None on error (non-blocking)
    """
    try:
        url = f"{QF_CONTENT_BASE}/recitations/{RECITATION_ID}/by_ayah/{verse_key}"
        data = await _qf_get(url)

        audio_files = data.get("audio_files", [])
        if audio_files:
            audio_url = audio_files[0].get("url")
            # Ensure URL is absolute. Standard QF audio base
            if audio_url and not audio_url.startswith("http"):
                audio_url = f"https://verses.quran.com/{audio_url}"
            logger.debug("Fetched audio URL for verse: %s: %s", verse_key, audio_url)
            return audio_url

        logger.debug("No audio found for verse: %s", verse_key)
        return None

    except HTTPException:
        logger.debug("Audio fetch failed for verse: %s", verse_key)
        return None
    except Exception as e:
        logger.warning("Unexpected error fetching audio for %s: %s", verse_key, str(e))
        return None


async def get_verse_with_full_context(verse_key: str) -> Dict[str, Any]:
    """
    Fetch verse with tafsir and audio concurrently.

    Args:
        verse_key: Format "chapter:verse" (e.g., "2:255")

    Returns:
        Dict with verse_key, text_uthmani, translation, tafsir, audio_url

    Raises:
        HTTPException(400): Invalid verse_key
        HTTPException(503): QF API error on verse fetch
    """
    # Fetch verse first (required)
    verse = await get_verse_by_key(verse_key)

    # Fetch tafsir and audio concurrently (optional — don't block)
    tafsir, audio_url = await asyncio.gather(
        get_tafsir_by_key(verse_key),
        get_audio_url(verse_key),
    )

    return {
        "verse_key": verse_key,
        "text_uthmani": verse["text_uthmani"],
        "translation": verse["translation"],
        "tafsir": tafsir or "",
        "audio_url": audio_url,
    }

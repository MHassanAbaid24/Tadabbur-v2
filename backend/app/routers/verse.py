"""Verse endpoint router — fetches Quranic verses from QF Content API."""

import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.auth.jwt import get_current_user
from app.models.schemas import APIResponse
from app.services.daily_verse import get_today_verse_key
from app.services.qf_content import get_verse_with_full_context

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/today")
async def get_today_verse(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> APIResponse:
    """
    Get today's deterministic verse with full context.

    Args:
        current_user: Current authenticated user (injected by get_current_user)

    Returns:
        APIResponse with verse_key, text_uthmani, translation, tafsir, audio_url

    Raises:
        HTTPException(401): Invalid or missing token
        HTTPException(503): QF API error
    """
    user_id = current_user["sub"]

    # Get today's verse key
    verse_key = get_today_verse_key()
    logger.debug("Fetching verse %s for user %s", verse_key, user_id)

    # Fetch verse with full context (text, translation, tafsir, audio)
    verse_context = await get_verse_with_full_context(verse_key)

    # Log reading session to QF User API (fire and forget, non-blocking)
    try:
        # TODO: Implement POST /api/v1/reading-sessions when qf_user service is ready
        pass
    except Exception as e:
        logger.warning("Failed to log reading session: %s", str(e))

    logger.info("Served verse %s to user %s", verse_key, user_id)

    response = APIResponse(success=True, data=verse_context)
    return JSONResponse(
        content=response.dict(),
        headers={"Cache-Control": "private, max-age=300"},
    )


@router.get("/{verse_key}")
async def get_verse_by_key_endpoint(
    verse_key: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> APIResponse:
    """
    Get a specific verse by key with full context.

    Args:
        verse_key: Format "chapter:verse" (e.g., "2:255")
        current_user: Current authenticated user (injected by get_current_user)

    Returns:
        APIResponse with verse_key, text_uthmani, translation, tafsir, audio_url

    Raises:
        HTTPException(400): Invalid verse_key format
        HTTPException(401): Invalid or missing token
        HTTPException(503): QF API error
    """
    user_id = current_user["sub"]

    logger.debug("Fetching verse %s for user %s", verse_key, user_id)

    # Fetch verse with full context
    verse_context = await get_verse_with_full_context(verse_key)

    logger.info("Served verse %s to user %s", verse_key, user_id)

    return APIResponse(success=True, data=verse_context)

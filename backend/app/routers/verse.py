"""Verse endpoint router — fetches Quranic verses from QF Content API."""

import asyncio
import logging
from typing import Any, Dict, Tuple

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.auth.jwt import get_current_user
from app.db.supabase import supabase_client
from app.models.schemas import APIResponse, ChapterResponse, VerseListResponse
from app.services.ai_prompts import generate_daily_reflection_prompts
from app.services.daily_verse import get_today_verse_key
from app.services.qf_content import get_chapters, get_verse_with_full_context, get_verses_by_chapter
from app.services.qf_user import log_reading_session

logger = logging.getLogger(__name__)

router = APIRouter()

DEFAULT_PROMPT_1 = "What does this ayah mean to you, right now, in your life?"
DEFAULT_PROMPT_2 = "What is one thing you will do differently today because of this ayah?"

# In-memory cache for generic verse prompts to prevent repeated AI calls
_verse_prompts_cache: Dict[str, Tuple[str, str]] = {}


async def _resolve_verse_prompts(verse_key: str, verse_context: Dict[str, Any]) -> Tuple[str, str]:
    if verse_key in _verse_prompts_cache:
        return _verse_prompts_cache[verse_key]

    # Check if the verse has been assigned as a daily verse before (has prompts in daily_verse_log)
    try:
        response = supabase_client.table("daily_verse_log")\
            .select("prompt_1, prompt_2")\
            .eq("verse_key", verse_key)\
            .not_.is_("prompt_1", "null")\
            .execute()
        rows = response.data
        if rows:
            p1 = rows[0].get("prompt_1")
            p2 = rows[0].get("prompt_2")
            if p1 and p2:
                _verse_prompts_cache[verse_key] = (p1, p2)
                return p1, p2
    except Exception as e:
        logger.warning("Failed to query daily_verse_log for verse %s: %s", verse_key, str(e))

    # Otherwise, generate dynamic prompts on-the-fly via Gemini
    generated_prompts = await generate_daily_reflection_prompts(
        verse_translation=verse_context.get("translation", ""),
        verse_tafsir=verse_context.get("tafsir", ""),
    )
    if generated_prompts is None:
        p1, p2 = DEFAULT_PROMPT_1, DEFAULT_PROMPT_2
    else:
        p1, p2 = generated_prompts

    _verse_prompts_cache[verse_key] = (p1, p2)
    return p1, p2


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
    asyncio.create_task(log_reading_session(user_id, verse_key))

    logger.info("Served verse %s to user %s", verse_key, user_id)

    response = APIResponse(success=True, data=verse_context)
    return JSONResponse(
        content=response.dict(),
        headers={"Cache-Control": "private, max-age=300"},
    )


@router.get("/by-key/{verse_key}")
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
        APIResponse with verse_key, text_uthmani, translation, tafsir, audio_url, prompt_1, prompt_2

    Raises:
        HTTPException(400): Invalid verse_key format
        HTTPException(401): Invalid or missing token
        HTTPException(503): QF API error
    """
    user_id = current_user["sub"]

    logger.debug("Fetching verse %s for user %s", verse_key, user_id)

    # Fetch verse with full context
    verse_context = await get_verse_with_full_context(verse_key)

    # Resolve dynamic prompts for this specific verse
    prompt_1, prompt_2 = await _resolve_verse_prompts(verse_key, verse_context)

    logger.info("Served verse %s to user %s", verse_key, user_id)

    # Log reading session to QF User API (fire and forget, non-blocking)
    asyncio.create_task(log_reading_session(user_id, verse_key))

    return APIResponse(
        success=True,
        data={
            **verse_context,
            "prompt_1": prompt_1,
            "prompt_2": prompt_2,
        },
    )


@router.get("/chapters", response_model=APIResponse)
async def list_chapters(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> APIResponse:
    """
    List all Quran chapters.
    """
    chapters = await get_chapters()
    return APIResponse(success=True, data=chapters)


@router.get("/chapters/{chapter_number}/verses", response_model=APIResponse)
async def list_verses(
    chapter_number: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> APIResponse:
    """
    List all verses for a specific chapter.
    """
    if not (1 <= chapter_number <= 114):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid chapter number")
        
    verses = await get_verses_by_chapter(chapter_number)
    return APIResponse(success=True, data=verses)

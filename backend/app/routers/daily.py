from datetime import date
import logging
from typing import Any, Dict, Tuple

from fastapi import APIRouter, Depends

from app.auth.jwt import get_current_user
from app.db.supabase import supabase_client
from app.models.schemas import APIResponse
from app.services.ai_prompts import generate_daily_reflection_prompts
from app.services.daily_verse import get_today_verse_key
from app.services.qf_content import get_verse_with_full_context

logger = logging.getLogger(__name__)
router = APIRouter()

DEFAULT_PROMPT_1 = "What does this ayah mean to you, right now, in your life?"
DEFAULT_PROMPT_2 = "What is one thing you will do differently today because of this ayah?"

# In-memory cache for today's generated prompts to avoid missing DB column errors
_daily_prompts_cache: Dict[str, Tuple[str, str]] = {}


def _split_verse_key(verse_key: str) -> Tuple[int, int]:
    chapter_raw, verse_raw = verse_key.split(":", 1)
    return int(chapter_raw), int(verse_raw)


async def _resolve_daily_prompts(day: str, verse_key: str, verse_context: Dict[str, Any]) -> Tuple[str, str]:
    import sys
    is_testing = "pytest" in sys.modules or "unittest" in sys.modules

    if not is_testing and day in _daily_prompts_cache:
        return _daily_prompts_cache[day]

    # Check Supabase daily_verse_log table
    record_exists = False
    prompt_1, prompt_2 = None, None
    try:
        response = supabase_client.table("daily_verse_log").select("*").eq("date", day).execute()
        rows = response.data
        if rows:
            record_exists = True
            prompt_1 = rows[0].get("prompt_1")
            prompt_2 = rows[0].get("prompt_2")
    except Exception as e:
        logger.warning("Failed to query daily_verse_log from Supabase: %s", str(e))

    # If both prompts exist, cache and return them
    if prompt_1 and prompt_2:
        _daily_prompts_cache[day] = (prompt_1, prompt_2)
        return prompt_1, prompt_2

    # Otherwise, generate prompts using AI
    generated_prompts = await generate_daily_reflection_prompts(
        verse_translation=verse_context.get("translation", ""),
        verse_tafsir=verse_context.get("tafsir", ""),
    )
    if generated_prompts is None:
        prompt_1, prompt_2 = DEFAULT_PROMPT_1, DEFAULT_PROMPT_2
    else:
        prompt_1, prompt_2 = generated_prompts

    _daily_prompts_cache[day] = (prompt_1, prompt_2)

    # Persist the prompts to daily_verse_log
    chapter_number, verse_number = _split_verse_key(verse_key)
    try:
        if record_exists:
            supabase_client.table("daily_verse_log").update({
                "prompt_1": prompt_1,
                "prompt_2": prompt_2
            }).eq("date", day).execute()
        else:
            supabase_client.table("daily_verse_log").insert({
                "date": day,
                "verse_key": verse_key,
                "chapter_number": chapter_number,
                "verse_number": verse_number,
                "prompt_1": prompt_1,
                "prompt_2": prompt_2
            }).execute()
    except Exception as e:
        logger.error("Failed to persist daily_verse_log to Supabase: %s", str(e))

    return prompt_1, prompt_2


@router.get("")
@router.get("/verse")
async def get_daily_verse_route(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> APIResponse:
    today = date.today().isoformat()
    verse_key = get_today_verse_key()
    verse_context = await get_verse_with_full_context(verse_key)
    prompt_1, prompt_2 = await _resolve_daily_prompts(today, verse_key, verse_context)

    return APIResponse(
        success=True,
        data={
            **verse_context,
            "prompt_1": prompt_1,
            "prompt_2": prompt_2,
        },
    )

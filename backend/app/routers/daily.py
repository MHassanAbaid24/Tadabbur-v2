from datetime import date
from typing import Any, Dict, Tuple

from fastapi import APIRouter, Depends

from app.auth.jwt import get_current_user
from app.db.supabase import supabase_client
from app.models.schemas import APIResponse
from app.services.ai_prompts import generate_daily_reflection_prompts
from app.services.daily_verse import get_today_verse_key
from app.services.qf_content import get_verse_with_full_context

router = APIRouter()

DEFAULT_PROMPT_1 = "What does this ayah mean to you, right now, in your life?"
DEFAULT_PROMPT_2 = "What is one thing you will do differently today because of this ayah?"


def _split_verse_key(verse_key: str) -> Tuple[int, int]:
    chapter_raw, verse_raw = verse_key.split(":", 1)
    return int(chapter_raw), int(verse_raw)


def _load_daily_log(day: str) -> Dict[str, Any] | None:
    result = (
        supabase_client.table("daily_verse_log")
        .select("date,verse_key,chapter_number,verse_number,prompt_1,prompt_2")
        .eq("date", day)
        .limit(1)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]


def _insert_daily_log(
    day: str,
    verse_key: str,
    chapter_number: int,
    verse_number: int,
    prompt_1: str,
    prompt_2: str,
) -> None:
    (
        supabase_client.table("daily_verse_log")
        .insert(
            {
                "date": day,
                "verse_key": verse_key,
                "chapter_number": chapter_number,
                "verse_number": verse_number,
                "prompt_1": prompt_1,
                "prompt_2": prompt_2,
            }
        )
        .execute()
    )


def _update_daily_prompts(day: str, prompt_1: str, prompt_2: str) -> None:
    (
        supabase_client.table("daily_verse_log")
        .update({"prompt_1": prompt_1, "prompt_2": prompt_2})
        .eq("date", day)
        .execute()
    )


async def _resolve_daily_prompts(day: str, verse_context: Dict[str, Any]) -> Tuple[str, str]:
    existing_row = _load_daily_log(day)
    if existing_row and existing_row.get("prompt_1") and existing_row.get("prompt_2"):
        return str(existing_row["prompt_1"]), str(existing_row["prompt_2"])

    generated_prompts = await generate_daily_reflection_prompts(
        verse_translation=verse_context.get("translation", ""),
        verse_tafsir=verse_context.get("tafsir", ""),
    )
    if generated_prompts is None:
        prompt_1, prompt_2 = DEFAULT_PROMPT_1, DEFAULT_PROMPT_2
    else:
        prompt_1, prompt_2 = generated_prompts

    if existing_row is None:
        chapter_number, verse_number = _split_verse_key(verse_context["verse_key"])
        _insert_daily_log(
            day=day,
            verse_key=verse_context["verse_key"],
            chapter_number=chapter_number,
            verse_number=verse_number,
            prompt_1=prompt_1,
            prompt_2=prompt_2,
        )
    else:
        _update_daily_prompts(day=day, prompt_1=prompt_1, prompt_2=prompt_2)

    return prompt_1, prompt_2


@router.get("")
@router.get("/verse")
async def get_daily_verse_route(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> APIResponse:
    today = date.today().isoformat()
    verse_key = get_today_verse_key()
    verse_context = await get_verse_with_full_context(verse_key)
    prompt_1, prompt_2 = await _resolve_daily_prompts(today, verse_context)

    return APIResponse(
        success=True,
        data={
            **verse_context,
            "prompt_1": prompt_1,
            "prompt_2": prompt_2,
        },
    )

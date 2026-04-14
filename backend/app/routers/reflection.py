"""Reflection endpoint router — handles user reflections on verses."""

import asyncio
import logging
import re
from datetime import date
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from postgrest.exceptions import APIError

from app.auth.jwt import get_current_user
from app.db.supabase import supabase_client
from app.models.schemas import APIResponse, ReflectionResponse, ReflectionSubmitRequest
from app.services.ai_prompts import generate_action_suggestion
from app.services.qf_content import get_verse_by_key
from app.services.qf_user import (
    create_qf_note,
    create_qf_post,
    create_reading_session,
    log_activity_day,
    get_streaks,
)

logger = logging.getLogger(__name__)

router = APIRouter()

VALID_MOODS = {"peaceful", "grateful", "hopeful", "challenged", "moved"}


def strip_html(text: str) -> str:
    """Remove HTML tags from text."""
    return re.sub(r"<[^>]+>", "", text)


@router.post("/submit")
async def submit_reflection(
    req: ReflectionSubmitRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> APIResponse:
    """
    Submit daily reflection and sync to QF APIs.

    Core logic:
    1. Validate mood
    2. Check one-reflection-per-day rule
    3. Save to Supabase reflections table
    4. Sync to QF Notes API (non-blocking on failure)
    5. If shared: sync to QF Posts API
    6. Generate AI suggestion concurrently
    7. Log activity day
    8. Award XP

    Args:
        req: Reflection submission request
        current_user: Current authenticated user

    Returns:
        APIResponse with reflection data and XP earned

    Raises:
        HTTPException(400): Invalid mood or verse_key
        HTTPException(409): Already submitted today
        HTTPException(500): Database or internal error
    """
    user_id = current_user["sub"]

    try:
        # Validate mood
        if req.mood and req.mood not in VALID_MOODS:
            logger.warning("Invalid mood submitted: %s", req.mood)
            raise HTTPException(
                status_code=400,
                detail=f"Mood must be one of {VALID_MOODS} or null",
            )

        # Strip HTML from prompts
        prompt_1_clean = strip_html(req.prompt_1_answer)
        prompt_2_clean = strip_html(req.prompt_2_answer)

        today = date.today().isoformat()

        # Check if already submitted today (UNIQUE constraint in DB)
        existing = supabase_client.table("reflections").select("id").eq(
            "user_id", user_id
        ).eq("date", today).execute()

        if existing.data:
            logger.warning("User %s already submitted reflection today", user_id)
            raise HTTPException(
                status_code=409,
                detail="You have already submitted a reflection today",
            )

        # Fetch verse translation for AI prompt
        verse_data = await get_verse_by_key(req.verse_key)
        verse_translation = verse_data.get("translation", "")

        # Concurrent tasks: QF sync + AI generation
        qf_note_id = None
        qf_post_id = None
        ai_suggestion = None

        async def sync_to_qf() -> tuple[Optional[str], Optional[str]]:
            """Sync reflection to QF Notes/Posts."""
            note_id = None
            post_id = None
            try:
                # Always save as note
                note_id = await create_qf_note(user_id, req.verse_key, prompt_1_clean)
                logger.info("Saved reflection to QF Notes (note_id=%s)", note_id)

                # If shared, also create post
                if req.is_shared and req.circle_id:
                    post_id = await create_qf_post(
                        user_id, prompt_1_clean, req.verse_key, req.circle_id
                    )
                    logger.info("Shared reflection to QF Posts (post_id=%s)", post_id)
            except HTTPException as e:
                if e.status_code in (401, 403):
                    logger.error("QF auth error during sync: %s", e.detail)
                    raise
                logger.error("QF sync error: %s", str(e))
            except Exception as e:
                logger.error("Unexpected error during QF sync: %s", str(e))

            return note_id, post_id

        async def get_ai_suggestion() -> Optional[str]:
            """Generate AI action suggestion."""
            suggestion = await generate_action_suggestion(
                verse_translation, prompt_1_clean, prompt_2_clean
            )
            return suggestion

        # Run both concurrently
        (qf_note_id, qf_post_id), ai_suggestion = await asyncio.gather(
            sync_to_qf(), get_ai_suggestion(), return_exceptions=False
        )

        # Calculate XP
        xp_earned = 10  # Base for completing reflection
        if req.is_shared:
            xp_earned += 5  # Bonus for sharing

        # Check streaks for bonus
        try:
            streaks = await get_streaks(user_id)
            current_streak = streaks.get("current_streak", 0)
            if current_streak == 7:
                xp_earned += 20
            elif current_streak == 30:
                xp_earned += 50
        except Exception as e:
            logger.warning("Could not fetch streaks for bonus: %s", str(e))

        # Insert into Supabase reflections
        reflection_response = supabase_client.table("reflections").insert(
            {
                "user_id": user_id,
                "verse_key": req.verse_key,
                "date": today,
                "prompt_1_answer": prompt_1_clean,
                "prompt_2_answer": prompt_2_clean,
                "mood": req.mood,
                "is_shared": req.is_shared,
                "qf_note_id": qf_note_id,
                "qf_post_id": qf_post_id,
                "ai_action_suggestion": ai_suggestion,
                "xp_earned": xp_earned,
            }
        ).execute()

        if not reflection_response.data:
            logger.error("Failed to insert reflection into Supabase")
            raise HTTPException(
                status_code=500, detail="Failed to save reflection"
            )

        reflection_id = reflection_response.data[0]["id"]

        # Award XP (update profiles table and write to xp_events)
        try:
            supabase_client.table("profiles").update(
                {"xp": supabase_client.table("profiles").select("xp").eq(
                    "id", user_id
                ).execute().data[0]["xp"] + xp_earned}
            ).eq("id", user_id).execute()

            supabase_client.table("xp_events").insert(
                {
                    "user_id": user_id,
                    "event_type": "reflection_submitted",
                    "xp_amount": xp_earned,
                }
            ).execute()

            logger.info("Awarded %d XP to user %s", xp_earned, user_id)
        except Exception as e:
            logger.error("Failed to award XP: %s", str(e))

        # Log activity day (fire and forget)
        asyncio.create_task(log_activity_day(user_id, today))

        # Log reading session (fire and forget)
        asyncio.create_task(create_reading_session(user_id, req.verse_key))

        logger.info(
            "User %s submitted reflection (note_id=%s, post_id=%s, xp=%d)",
            user_id,
            qf_note_id,
            qf_post_id,
            xp_earned,
        )

        return APIResponse(
            success=True,
            data=ReflectionResponse(
                id=reflection_id,
                verse_key=req.verse_key,
                date=today,
                prompt_1_answer=prompt_1_clean,
                prompt_2_answer=prompt_2_clean,
                mood=req.mood,
                is_shared=req.is_shared,
                qf_note_id=qf_note_id,
                qf_post_id=qf_post_id,
                ai_action_suggestion=ai_suggestion,
                xp_earned=xp_earned,
            ).model_dump(),
        )

    except HTTPException:
        raise
    except APIError as e:
        logger.error("Supabase API error: %s", str(e))
        raise HTTPException(status_code=500, detail="Database error") from e
    except Exception as e:
        logger.error("Unexpected error submitting reflection: %s", str(e))
        raise HTTPException(status_code=500, detail="Reflection submission failed") from e


@router.get("/today")
async def get_today_reflection(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> APIResponse:
    """
    Get today's reflection for the current user (if exists).

    Args:
        current_user: Current authenticated user

    Returns:
        APIResponse with reflection data or None if not yet submitted

    Raises:
        HTTPException(500): Database error
    """
    user_id = current_user["sub"]

    try:
        today = date.today().isoformat()

        response = supabase_client.table("reflections").select("*").eq(
            "user_id", user_id
        ).eq("date", today).execute()

        if response.data:
            reflection = response.data[0]
            return APIResponse(
                success=True,
                data={
                    "id": reflection["id"],
                    "verse_key": reflection["verse_key"],
                    "date": reflection["date"],
                    "prompt_1_answer": reflection["prompt_1_answer"],
                    "prompt_2_answer": reflection["prompt_2_answer"],
                    "mood": reflection["mood"],
                    "is_shared": reflection["is_shared"],
                    "qf_note_id": reflection["qf_note_id"],
                    "qf_post_id": reflection["qf_post_id"],
                    "ai_action_suggestion": reflection["ai_action_suggestion"],
                    "xp_earned": reflection["xp_earned"],
                },
            )

        return APIResponse(success=True, data=None)

    except Exception as e:
        logger.error("Error fetching today's reflection: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch reflection") from e


@router.get("/history")
async def get_reflection_history(
    current_user: Dict[str, Any] = Depends(get_current_user),
    limit: int = 20,
) -> APIResponse:
    """
    Get user's reflection history (ordered by date DESC).

    Args:
        current_user: Current authenticated user
        limit: Number of reflections to return (max 100, default 20)

    Returns:
        APIResponse with list of reflections

    Raises:
        HTTPException(500): Database error
    """
    user_id = current_user["sub"]
    limit = min(limit, 100)  # Cap at 100

    try:
        response = supabase_client.table("reflections").select("*").eq(
            "user_id", user_id
        ).order("date", desc=True).limit(limit).execute()

        reflections = [
            {
                "id": r["id"],
                "verse_key": r["verse_key"],
                "date": r["date"],
                "prompt_1_answer": r["prompt_1_answer"],
                "prompt_2_answer": r["prompt_2_answer"],
                "mood": r["mood"],
                "is_shared": r["is_shared"],
                "qf_note_id": r["qf_note_id"],
                "qf_post_id": r["qf_post_id"],
                "ai_action_suggestion": r["ai_action_suggestion"],
                "xp_earned": r["xp_earned"],
            }
            for r in response.data
        ]

        return APIResponse(success=True, data={"reflections": reflections})

    except Exception as e:
        logger.error("Error fetching reflection history: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch history") from e


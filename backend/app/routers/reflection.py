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
    get_streaks,
    log_activity_day,
)
from app.services.event_bus import event_bus

logger = logging.getLogger(__name__)

router = APIRouter()

VALID_MOODS = {"supplication", "moved", "peaceful", "grateful", "thoughtful"}


def strip_html(text: str) -> str:
    """Remove HTML tags from text."""
    return re.sub(r"<[^>]+>", "", text)


def _normalize(text: str) -> str:
    """Return a whitespace-normalized, lowercased version of text for
    duplicate detection. Does not mutate the original."""
    return re.sub(r"\s+", " ", text.strip()).lower()


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
    6. Log activity day
    7. Award XP

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

        # Check for previous submissions today to adjust XP
        existing = await asyncio.to_thread(
            lambda: supabase_client.table("reflections")
            .select("id")
            .eq("user_id", user_id)
            .eq("date", today)
            .execute()
        )
        is_first_today = len(existing.data) == 0

        # Fetch verse translation
        verse_data = await get_verse_by_key(req.verse_key)
        verse_translation = verse_data.get("translation", "")

        # Concurrent tasks: QF sync
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
                    # Don't block submission just because QF sync failed
                    pass
                else:
                    logger.error("QF sync error: %s", str(e))
            except Exception as e:
                logger.error("Unexpected error during QF sync: %s", str(e))

            return note_id, post_id

        # Run QF sync (AI suggestion is now generated on-demand)
        qf_note_id, qf_post_id = await sync_to_qf()

        # Calculate XP
        if is_first_today:
            xp_earned = 10  # Base for first reflection
            if req.is_shared:
                xp_earned += 5  # Bonus for sharing
        else:
            xp_earned = 2  # Reduced base for subsequent reflections
            if req.is_shared:
                xp_earned += 1  # Reduced bonus

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

        # --- Duplicate content guard (Module 1) ---
        existing_reflections = await asyncio.to_thread(
            lambda: supabase_client.table("reflections")
            .select("prompt_1_answer")
            .eq("user_id", user_id)
            .eq("verse_key", req.verse_key)
            .execute()
        )

        if existing_reflections.data:
            normalized_new = _normalize(prompt_1_clean)
            for existing in existing_reflections.data:
                if _normalize(existing.get("prompt_1_answer", "")) == normalized_new:
                    raise HTTPException(
                        status_code=409,
                        detail="A reflection with identical content already exists for "
                               "this verse. Edit your text before resubmitting.",
                    )
        # --- End duplicate content guard ---

        # Store reflection using asyncio.to_thread
        reflection_response = await asyncio.to_thread(
            lambda: supabase_client.table("reflections").insert(
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
        )

        if not reflection_response.data:
            logger.error("Failed to insert reflection into Supabase")
            raise HTTPException(
                status_code=500, detail="Failed to save reflection"
            )

        reflection_id = reflection_response.data[0]["id"]

        # Award XP (update profiles table and write to xp_events)
        try:
            profile_data = await asyncio.to_thread(
                lambda: supabase_client.table("profiles").select("xp").eq("id", user_id).execute()
            )
            current_xp = profile_data.data[0]["xp"] if profile_data.data else 0
            
            await asyncio.to_thread(
                lambda: supabase_client.table("profiles").update(
                    {"xp": current_xp + xp_earned}
                ).eq("id", user_id).execute()
            )

            await asyncio.to_thread(
                lambda: supabase_client.table("xp_events").insert(
                    {
                        "user_id": user_id,
                        "event_type": "reflection_submitted",
                        "xp_amount": xp_earned,
                    }
                ).execute()
            )

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

        # Post-submission real-time events
        try:
            # 1. Notify user's own progress channel
            await event_bus.publish_to_user(user_id, {"type": "progress_update"})

            # 2. If shared, notify the circle channel
            if req.is_shared:
                # Find user's circle_id
                membership = await asyncio.to_thread(
                    lambda: supabase_client.table("circle_members")
                    .select("circle_id").eq("user_id", user_id).execute()
                )
                circle_id = membership.data[0]["circle_id"] if membership.data else None
                if circle_id:
                    await event_bus.publish_to_circle(circle_id, {"type": "feed_update"})
        except Exception as e:
            logger.warning("Failed to publish real-time events after reflection: %s", str(e))

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
                verse_text=verse_data.get("text_uthmani"),
                verse_translation=verse_translation,
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

        response = await asyncio.to_thread(
            lambda: supabase_client.table("reflections")
            .select("*")
            .eq("user_id", user_id)
            .eq("date", today)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        if response.data:
            reflection = response.data[0]
            # Fetch verse context
            verse_data = {}
            try:
                verse_data = await get_verse_by_key(reflection["verse_key"])
            except Exception as e:
                logger.warning("Failed to fetch verse context for today's reflection: %s", str(e))

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
                    "verse_text": verse_data.get("text_uthmani"),
                    "verse_translation": verse_data.get("translation"),
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
        response = await asyncio.to_thread(
            lambda: supabase_client.table("reflections").select("*").eq(
                "user_id", user_id
            ).order("date", desc=True).limit(limit).execute()
        )

        # Batch fetch verse data
        verse_keys = list(set(r["verse_key"] for r in response.data))
        verse_cache = {}
        
        # We fetch them sequentially for now or could gather if many
        for vk in verse_keys:
            try:
                verse_cache[vk] = await get_verse_by_key(vk)
            except Exception as e:
                logger.warning("Failed to fetch verse context for %s in history: %s", vk, str(e))
                verse_cache[vk] = {}

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
                "verse_text": verse_cache.get(r["verse_key"], {}).get("text_uthmani"),
                "verse_translation": verse_cache.get(r["verse_key"], {}).get("translation"),
            }
            for r in response.data
        ]

        return APIResponse(success=True, data={"reflections": reflections})

    except Exception as e:
        logger.error("Error fetching reflection history: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch history") from e


@router.post("/{reflection_id}/insight")
async def generate_reflection_insight(
    reflection_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> APIResponse:
    """
    Generate or fetch an on-demand AI insight for a reflection.

    On-demand endpoint: only generate insight when the user requests it.
    If the insight was already generated before, return the cached version.
    If generation fails, return gracefully with None.

    Flow:
    1. Verify the user owns the reflection
    2. Check if ai_action_suggestion is already populated in DB
       - If yes: return it immediately (cache hit)
       - If no: proceed to generate
    3. Fetch the Ayah translation and user's answers from DB
    4. Call Gemini via generate_action_suggestion()
    5. Save the generated insight to Supabase
    6. Return the insight to frontend

    Args:
        reflection_id: UUID of the reflection to generate insight for
        current_user: Current authenticated user

    Returns:
        APIResponse with the generated/cached insight

    Raises:
        HTTPException(404): Reflection not found or user doesn't own it
        HTTPException(500): Database or internal error
    """
    user_id = current_user["sub"]

    try:
        # Fetch reflection from DB
        response = await asyncio.to_thread(
            lambda: supabase_client.table("reflections")
            .select("*")
            .eq("id", reflection_id)
            .execute()
        )

        if not response.data:
            logger.warning("Reflection %s not found", reflection_id)
            raise HTTPException(status_code=404, detail="Reflection not found")

        reflection = response.data[0]

        # Verify ownership
        if reflection["user_id"] != user_id:
            logger.warning("User %s attempted to access reflection %s they don't own", user_id, reflection_id)
            raise HTTPException(status_code=403, detail="You do not own this reflection")

        # Check if insight already exists (cache hit)
        if reflection.get("ai_action_suggestion"):
            logger.info("Returning cached AI insight for reflection %s", reflection_id)
            return APIResponse(
                success=True,
                data={"insight": reflection["ai_action_suggestion"], "cached": True},
            )

        # No cached insight — generate new one
        logger.info("Generating new AI insight for reflection %s", reflection_id)

        # Fetch verse translation for AI prompt
        verse_data = await get_verse_by_key(reflection["verse_key"])
        verse_translation = verse_data.get("translation", "")

        # Call AI to generate insight
        ai_suggestion = await generate_action_suggestion(
            verse_translation,
            reflection["prompt_1_answer"],
            reflection["prompt_2_answer"],
        )

        # Save the generated insight to DB
        if ai_suggestion:
            update_response = await asyncio.to_thread(
                lambda: supabase_client.table("reflections")
                .update({"ai_action_suggestion": ai_suggestion})
                .eq("id", reflection_id)
                .execute()
            )
            if not update_response.data:
                logger.error("Failed to save AI insight for reflection %s", reflection_id)
                raise HTTPException(
                    status_code=500, detail="Failed to save insight"
                )
            logger.info("Saved AI insight for reflection %s", reflection_id)
        else:
            logger.warning("AI generation returned None for reflection %s", reflection_id)

        return APIResponse(
            success=True,
            data={"insight": ai_suggestion, "cached": False},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error generating insight for reflection %s: %s", reflection_id, str(e))
        raise HTTPException(status_code=500, detail="Failed to generate insight") from e

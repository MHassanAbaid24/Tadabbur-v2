"""Progress endpoint router — handles streaks, XP, and level data."""

import asyncio
import logging
from datetime import datetime, timedelta, date as date_type
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import JSONResponse

from app.auth.jwt import get_current_user
from app.db.supabase import supabase_client, async_supabase_client
from app.models.schemas import APIResponse
from app.services.qf_user import get_activity_days, get_streaks

logger = logging.getLogger(__name__)
router = APIRouter()

# Level thresholds and names
LEVEL_THRESHOLDS = {
    1: (0, 50),
    2: (51, 150),
    3: (151, 350),
    4: (351, 700),
    5: (701, float('inf')),
}

LEVEL_NAMES = {
    1: "Seeker",
    2: "Learner",
    3: "Reflector",
    4: "Practitioner",
    5: "Guide",
}

LEVEL_NAMES_AR = {
    1: "طالب",
    2: "متعلّم",
    3: "متدبّر",
    4: "عامل",
    5: "مرشد",
}


def calculate_level(xp: int) -> int:
    """Calculate level based on XP thresholds."""
    for level, (min_xp, max_xp) in LEVEL_THRESHOLDS.items():
        if min_xp <= xp <= max_xp:
            return level
    return 5  # Default to max level


def get_xp_for_next_level(current_level: int, current_xp: int) -> int:
    """Calculate XP needed to reach next level."""
    if current_level >= 5:
        return 0  # Max level reached

    next_level = current_level + 1
    next_min_xp = LEVEL_THRESHOLDS[next_level][0]

    xp_needed = next_min_xp - current_xp
    return max(0, xp_needed)


@router.get("/summary")
async def get_progress_summary(
    authorization: str = Header(...),
) -> JSONResponse:
    """
    Get complete progress summary: streaks, XP, level, and activity heatmap.

    Streak is calculated locally from Supabase reflections table for reliability.
    Parallelizes independent DB/API calls for speed.
    """
    current_user: dict[str, Any] = await get_current_user(authorization)
    user_id = current_user["sub"]

    try:
        # --- Run profile fetch AND reflections fetch in PARALLEL ---
        profile_task = asyncio.to_thread(
            lambda: supabase_client.table("profiles").select("xp, level").eq("id", user_id).execute()
        )
        reflections_task = asyncio.to_thread(
            lambda: supabase_client.table("reflections")
            .select("date")
            .eq("user_id", user_id)
            .order("date", desc=True)
            .execute()
        )

        profiles, all_reflections = await asyncio.gather(profile_task, reflections_task)

        profile = profiles.data[0] if profiles.data else {"xp": 0, "level": 1}
        xp = profile.get("xp", 0)
        level = calculate_level(xp)

        # --- Calculate streaks locally from reflections table ---
        reflection_date_strs = sorted(
            {r["date"] for r in all_reflections.data if r.get("date")},
            reverse=True,
        )

        current_streak = 0
        longest_streak = 0

        if reflection_date_strs:
            today = datetime.utcnow().date()
            parsed = []
            for d in reflection_date_strs:
                try:
                    parsed.append(date_type.fromisoformat(d))
                except ValueError:
                    continue

            if parsed:
                most_recent = parsed[0]
                gap = (today - most_recent).days

                # Current streak: only active if most recent reflection is today or yesterday
                if gap <= 1:
                    current_streak = 1
                    for i in range(1, len(parsed)):
                        if (parsed[i - 1] - parsed[i]).days == 1:
                            current_streak += 1
                        else:
                            break

                # Longest streak across all reflection dates
                run = 1
                longest_streak = 1
                for i in range(1, len(parsed)):
                    if (parsed[i - 1] - parsed[i]).days == 1:
                        run += 1
                        if run > longest_streak:
                            longest_streak = run
                    else:
                        run = 1

        # Fetch activity days from QF for heatmap (non-blocking)
        today_date = datetime.utcnow().date()
        start_date = today_date - timedelta(days=90)
        try:
            activity_dates = await get_activity_days(
                user_id,
                start_date.isoformat(),
                today_date.isoformat(),
            )
            if not activity_dates:
                # Fall back to local reflection dates for heatmap
                activity_dates = list(reflection_date_strs)
        except Exception as e:
            logger.warning("Failed to fetch activity days from QF: %s", str(e))
            activity_dates = list(reflection_date_strs)

        # Calculate XP to next level
        xp_to_next = get_xp_for_next_level(level, xp)

        progress_data = {
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "xp": xp,
            "level": level,
            "level_name": LEVEL_NAMES.get(level, "Seeker"),
            "level_name_ar": LEVEL_NAMES_AR.get(level, "طالب"),
            "activity_days": activity_dates,
            "xp_to_next_level": xp_to_next,
        }

        response = APIResponse(success=True, data=progress_data).dict()
        return JSONResponse(
            content=response,
            headers={"Cache-Control": "private, max-age=120"},
        )

    except Exception as e:
        logger.error("Failed to fetch progress summary: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch progress summary")


@router.get("/xp-events")
async def get_xp_events(
    authorization: str = Header(...),
) -> dict[str, Any]:
    """
    Get user's XP events history (last 20).

    Ordered by created_at DESC (most recent first).
    """
    current_user: dict[str, Any] = await get_current_user(authorization)
    user_id = current_user["sub"]

    try:
        events = await (
            async_supabase_client.table("xp_events")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )

        if not events.data:
            return APIResponse(success=True, data={"events": []}).dict()

        # Format events
        formatted_events = []
        for event in events.data:
            formatted_events.append({
                "id": event.get("id"),
                "event_type": event.get("event_type"),
                "xp_amount": event.get("xp_amount"),
                "created_at": event.get("created_at"),
            })

        return APIResponse(success=True, data={"events": formatted_events}).dict()

    except Exception as e:
        logger.error("Failed to fetch XP events: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch XP events")

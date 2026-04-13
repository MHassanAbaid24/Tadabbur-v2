"""Progress endpoint router — handles streaks, XP, and level data."""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException

from app.auth.jwt import get_current_user
from app.db.supabase import supabase_client
from app.models.schemas import APIResponse
from app.services.qf_user import get_activity_days, get_streaks

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/progress", tags=["progress"])

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
) -> dict[str, Any]:
    """
    Get complete progress summary: streaks, XP, level, and activity heatmap.

    Concurrent fetching of streaks and activity. Never crashes on QF failures.
    """
    current_user: dict[str, Any] = await get_current_user(authorization)
    user_id = current_user["sub"]

    try:
        # Fetch profile (XP and level from Supabase)
        profiles = supabase_client.table("profiles").select("xp, level").eq("id", user_id).execute()
        profile = profiles.data[0] if profiles.data else {"xp": 0, "level": 1}
        xp = profile.get("xp", 0)
        level = calculate_level(xp)

        # Concurrent fetch: streaks and activity days
        # Calculate date range: 90 days back from today
        today = datetime.utcnow().date()
        start_date = today - timedelta(days=90)

        # Gather both calls concurrently
        streaks_result, activity_dates = await asyncio.gather(
            get_streaks(user_id),
            get_activity_days(
                user_id,
                start_date.isoformat(),
                today.isoformat(),
            ),
            return_exceptions=True,
        )

        # Handle exceptions (convert to defaults if they occur)
        if isinstance(streaks_result, Exception):
            logger.warning("Failed to fetch streaks: %s", str(streaks_result))
            streaks = {"current_streak": 0, "longest_streak": 0}
        else:
            streaks = streaks_result

        if isinstance(activity_dates, Exception):
            logger.warning("Failed to fetch activity days: %s", str(activity_dates))
            activity_dates = []

        # Calculate XP to next level
        xp_to_next = get_xp_for_next_level(level, xp)

        progress_data = {
            "current_streak": streaks.get("current_streak", 0),
            "longest_streak": streaks.get("longest_streak", 0),
            "xp": xp,
            "level": level,
            "level_name": LEVEL_NAMES.get(level, "Seeker"),
            "level_name_ar": LEVEL_NAMES_AR.get(level, "طالب"),
            "activity_days": activity_dates,
            "xp_to_next_level": xp_to_next,
        }

        return APIResponse(success=True, data=progress_data).dict()

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
        events = (
            supabase_client.table("xp_events")
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

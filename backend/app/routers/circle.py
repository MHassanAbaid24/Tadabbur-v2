"""Circle endpoint router — handles reflection circles and group features."""

import logging
import secrets
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException

from app.auth.jwt import get_current_user
from app.db.supabase import supabase_client
from app.models.schemas import APIResponse, CircleFeedItem, CircleResponse, CreateCircleRequest
from app.services.qf_user import create_qf_room, like_qf_post

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/circle", tags=["circle"])


@router.post("/create")
async def create_circle(
    req: CreateCircleRequest,
    authorization: str = Header(...),
) -> dict[str, Any]:
    """
    Create a new reflection circle.

    - Generates invite code
    - Creates QF Room (non-blocking on failure)
    - Enforces: user can only be in one circle
    """
    current_user: dict[str, Any] = await get_current_user(authorization)
    user_id = current_user["sub"]

    # Check user not already in a circle
    existing = supabase_client.table("circle_members").select("*").eq("user_id", user_id).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(status_code=409, detail="User is already in a circle")

    # Generate invite code
    invite_code = secrets.token_urlsafe(8)

    # Try to create QF Room (non-blocking on failure)
    qf_room_id: Optional[str] = None
    try:
        qf_room_id = await create_qf_room(user_id, req.name)
    except Exception as e:
        logger.warning("QF room creation failed for circle '%s': %s", req.name, str(e))

    # Create local circle
    try:
        circle_result = supabase_client.table("circles").insert({
            "qf_room_id": qf_room_id,
            "name": req.name,
            "invite_code": invite_code,
            "created_by": user_id,
        }).execute()

        circle_id = circle_result.data[0]["id"]

        # Add creator as first member
        supabase_client.table("circle_members").insert({
            "circle_id": circle_id,
            "user_id": user_id,
        }).execute()

        member_count = 1
        circle_data = CircleResponse(
            id=circle_id,
            name=req.name,
            invite_code=invite_code,
            member_count=member_count,
            qf_room_id=qf_room_id,
        )

        return APIResponse(success=True, data=circle_data.dict()).dict()

    except Exception as e:
        logger.error("Failed to create circle: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to create circle")


@router.get("/join/{invite_code}")
async def join_circle(
    invite_code: str,
    authorization: str = Header(...),
) -> dict[str, Any]:
    """
    Join a circle by invite code.

    - Enforces: user can only be in one circle
    - Adds user to circle_members
    """
    current_user: dict[str, Any] = await get_current_user(authorization)
    user_id = current_user["sub"]

    # Find circle by invite code
    circles = supabase_client.table("circles").select("*").eq("invite_code", invite_code).execute()
    if not circles.data or len(circles.data) == 0:
        raise HTTPException(status_code=404, detail="Circle not found")

    circle = circles.data[0]
    circle_id = circle["id"]

    # Check user not already in a circle
    existing = supabase_client.table("circle_members").select("*").eq("user_id", user_id).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(status_code=409, detail="User is already in a circle")

    # Add user to circle
    try:
        supabase_client.table("circle_members").insert({
            "circle_id": circle_id,
            "user_id": user_id,
        }).execute()

        # Get updated member count
        members = supabase_client.table("circle_members").select("*").eq("circle_id", circle_id).execute()
        member_count = len(members.data) if members.data else 0

        circle_data = CircleResponse(
            id=circle_id,
            name=circle["name"],
            invite_code=circle["invite_code"],
            member_count=member_count,
            qf_room_id=circle["qf_room_id"],
        )

        logger.info("User %s joined circle %s", user_id, circle_id)
        return APIResponse(success=True, data=circle_data.dict()).dict()

    except Exception as e:
        logger.error("Failed to join circle: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to join circle")


@router.get("/my")
async def get_my_circle(
    authorization: str = Header(...),
) -> dict[str, Any]:
    """
    Get the current user's circle.

    Returns 404 if user is not in any circle.
    """
    current_user: dict[str, Any] = await get_current_user(authorization)
    user_id = current_user["sub"]

    # Find user's circle
    memberships = supabase_client.table("circle_members").select("circle_id").eq("user_id", user_id).execute()
    if not memberships.data or len(memberships.data) == 0:
        raise HTTPException(status_code=404, detail="User is not in a circle")

    circle_id = memberships.data[0]["circle_id"]

    # Get circle details
    circles = supabase_client.table("circles").select("*").eq("id", circle_id).execute()
    if not circles.data or len(circles.data) == 0:
        raise HTTPException(status_code=404, detail="Circle not found")

    circle = circles.data[0]

    # Get member count
    members = supabase_client.table("circle_members").select("*").eq("circle_id", circle_id).execute()
    member_count = len(members.data) if members.data else 0

    circle_data = CircleResponse(
        id=circle_id,
        name=circle["name"],
        invite_code=circle["invite_code"],
        member_count=member_count,
        qf_room_id=circle["qf_room_id"],
    )

    return APIResponse(success=True, data=circle_data.dict()).dict()


@router.get("/feed")
async def get_circle_feed(
    authorization: str = Header(...),
) -> dict[str, Any]:
    """
    Get shared reflections from the user's circle.

    Only reflections with is_shared=True are included.
    Returns 404 if user is not in a circle.
    """
    current_user: dict[str, Any] = await get_current_user(authorization)
    user_id = current_user["sub"]

    # Find user's circle
    memberships = supabase_client.table("circle_members").select("circle_id").eq("user_id", user_id).execute()
    if not memberships.data or len(memberships.data) == 0:
        raise HTTPException(status_code=404, detail="User is not in a circle")

    circle_id = memberships.data[0]["circle_id"]

    # Get all members in circle
    members_result = supabase_client.table("circle_members").select("user_id").eq("circle_id", circle_id).execute()
    if not members_result.data:
        return APIResponse(success=True, data={"feed": []}).dict()

    member_user_ids = [m["user_id"] for m in members_result.data]

    # Fetch shared reflections from all circle members, with profile info
    try:
        reflections_result = (
            supabase_client.table("reflections")
            .select("id, user_id, verse_key, prompt_1_answer, mood, created_at, qf_post_id")
            .in_("user_id", member_user_ids)
            .eq("is_shared", True)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )

        if not reflections_result.data:
            return APIResponse(success=True, data={"feed": []}).dict()

        feed_items: list[CircleFeedItem] = []

        for reflection in reflections_result.data:
            # Get author profile
            profile_result = supabase_client.table("profiles").select("display_name").eq("id", reflection["user_id"]).execute()
            display_name = profile_result.data[0]["display_name"] if profile_result.data else "Anonymous"

            # Create preview of prompt_1
            prompt_1 = reflection["prompt_1_answer"] or ""
            preview = (prompt_1[:200] + "...") if len(prompt_1) > 200 else prompt_1

            item = CircleFeedItem(
                reflection_id=reflection["id"],
                user_display_name=display_name,
                verse_key=reflection["verse_key"],
                prompt_1_preview=preview,
                mood=reflection["mood"],
                created_at=reflection["created_at"],
                qf_post_id=reflection["qf_post_id"],
            )
            feed_items.append(item)

        return APIResponse(success=True, data={"feed": [item.dict() for item in feed_items]}).dict()

    except Exception as e:
        logger.error("Failed to fetch circle feed: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch circle feed")


@router.post("/like/{reflection_id}")
async def like_reflection(
    reflection_id: str,
    authorization: str = Header(...),
) -> dict[str, Any]:
    """
    Like a reflection in the circle feed.

    - Calls QF Posts like API if qf_post_id exists
    - Awards +3 XP for the liker
    - Non-blocking on QF failure
    """
    current_user: dict[str, Any] = await get_current_user(authorization)
    user_id = current_user["sub"]

    try:
        # Get reflection
        reflections = supabase_client.table("reflections").select("*").eq("id", reflection_id).execute()
        if not reflections.data or len(reflections.data) == 0:
            raise HTTPException(status_code=404, detail="Reflection not found")

        reflection = reflections.data[0]
        qf_post_id = reflection.get("qf_post_id")

        # Like on QF if post exists (non-blocking)
        if qf_post_id:
            await like_qf_post(user_id, qf_post_id)

        # Award +3 XP for liking
        xp_amount = 3
        supabase_client.table("xp_events").insert({
            "user_id": user_id,
            "event_type": "like_reflection",
            "xp_amount": xp_amount,
        }).execute()

        # Update user's total XP
        profiles = supabase_client.table("profiles").select("xp").eq("id", user_id).execute()
        current_xp = profiles.data[0]["xp"] if profiles.data else 0
        new_xp = current_xp + xp_amount

        supabase_client.table("profiles").update({"xp": new_xp}).eq("id", user_id).execute()

        logger.info("User %s liked reflection %s, awarded %d XP", user_id, reflection_id, xp_amount)

        return APIResponse(success=True, data={"liked": True, "xp_earned": xp_amount}).dict()

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to like reflection: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to like reflection")

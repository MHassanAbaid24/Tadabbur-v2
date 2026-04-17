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
router = APIRouter()


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

    # If QF room creation failed, use a local placeholder so DB NOT NULL is satisfied.
    # The real QF room ID can be back-filled later if needed.
    import uuid
    effective_room_id = qf_room_id or f"local_{uuid.uuid4().hex[:12]}"

    # Create local circle
    try:
        circle_result = supabase_client.table("circles").insert({
            "qf_room_id": effective_room_id,
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
            qf_room_id=qf_room_id,  # return None to frontend if QF failed
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

    if not member_user_ids:
        return APIResponse(success=True, data={"feed": []}).dict()

    # Fetch shared reflections from circle members, with profile info
    try:
        reflections_result = (
            supabase_client.table("reflections")
            .select("id, user_id, verse_key, prompt_1_answer, prompt_2_answer, mood, created_at, qf_post_id")
            .in_("user_id", member_user_ids)
            .eq("is_shared", True)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )

        if not reflections_result.data:
            return APIResponse(success=True, data={"feed": []}).dict()

        feed_items: list[CircleFeedItem] = []

        reflection_ids = [ref["id"] for ref in reflections_result.data]
        all_likes = []
        if reflection_ids:
            try:
                # We fetch likes for all reflections in one batch.
                likes_result = supabase_client.table("reflection_likes").select("reflection_id, user_id").in_("reflection_id", reflection_ids).execute()
                all_likes = likes_result.data or []
            except Exception as e:
                # If table doesn't exist yet, we catch it gracefully so the feed still loads
                logger.warning("reflection_likes table error (run migration): %s", str(e))
                all_likes = []

        likes_by_ref: dict[str, list[str]] = {}
        for like in all_likes:
            ref_id = like["reflection_id"]
            if ref_id not in likes_by_ref:
                likes_by_ref[ref_id] = []
            likes_by_ref[ref_id].append(like["user_id"])

        for reflection in reflections_result.data:
            # Get author profile
            if reflection["user_id"] == user_id:
                display_name = "You"
            else:
                profile_result = supabase_client.table("profiles").select("display_name").eq("id", reflection["user_id"]).execute()
                display_name = profile_result.data[0]["display_name"] if profile_result.data else "Anonymous"

            ref_id = reflection["id"]
            ref_likes = likes_by_ref.get(ref_id, [])
            likes_count = len(ref_likes)
            is_liked = user_id in ref_likes

            item = CircleFeedItem(
                reflection_id=ref_id,
                user_display_name=display_name,
                verse_key=reflection["verse_key"],
                prompt_1_answer=reflection["prompt_1_answer"] or "",
                prompt_2_answer=reflection["prompt_2_answer"] or "",
                mood=reflection["mood"],
                created_at=reflection["created_at"],
                qf_post_id=reflection["qf_post_id"],
                likes_count=likes_count,
                is_liked=is_liked
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

        # Track the like locally in our own database
        try:
            supabase_client.table("reflection_likes").insert({
                "user_id": user_id,
                "reflection_id": reflection_id
            }).execute()
        except Exception as e:
            # Catch PGRST116 (duplicate key violation if user already liked it) - safe to ignore
            logger.warning("Duplicate like or reflection_likes missing: %s", str(e))

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

@router.post("/unlike/{reflection_id}")
async def unlike_reflection(
    reflection_id: str,
    authorization: str = Header(...),
) -> dict[str, Any]:
    """
    Unlike a reflection in the circle feed.
    """
    current_user: dict[str, Any] = await get_current_user(authorization)
    user_id = current_user["sub"]

    try:
        from app.services.qf_user import unlike_qf_post
        reflections = supabase_client.table("reflections").select("*").eq("id", reflection_id).execute()
        if not reflections.data or len(reflections.data) == 0:
            raise HTTPException(status_code=404, detail="Reflection not found")

        reflection = reflections.data[0]
        qf_post_id = reflection.get("qf_post_id")

        if qf_post_id:
            await unlike_qf_post(user_id, qf_post_id)

        # Untrack the like locally
        try:
            supabase_client.table("reflection_likes").delete().eq("user_id", user_id).eq("reflection_id", reflection_id).execute()
        except Exception as e:
            logger.warning("Unliking failed locally or reflection_likes missing: %s", str(e))

        # Deduct XP (optional but consistent)
        xp_amount = -3
        supabase_client.table("xp_events").insert({
            "user_id": user_id,
            "event_type": "unlike_reflection",
            "xp_amount": xp_amount,
        }).execute()

        profiles = supabase_client.table("profiles").select("xp").eq("id", user_id).execute()
        current_xp = profiles.data[0]["xp"] if profiles.data else 0
        new_xp = max(0, current_xp + xp_amount)
        supabase_client.table("profiles").update({"xp": new_xp}).eq("id", user_id).execute()

        logger.info("User %s unliked reflection %s, deducted %d XP", user_id, reflection_id, abs(xp_amount))
        return APIResponse(success=True, data={"liked": False, "xp_earned": xp_amount}).dict()

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to unlike reflection: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to unlike reflection")

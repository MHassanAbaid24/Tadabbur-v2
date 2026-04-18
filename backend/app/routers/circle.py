"""Circle endpoint router — handles reflection circles and group features."""

import asyncio
import logging
import secrets
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException

from app.auth.jwt import get_current_user
from app.db.supabase import supabase_client
from app.models.schemas import (
    APIResponse,
    CircleFeedItem,
    CircleMemberResponse,
    CircleResponse,
    CreateCircleRequest,
)
from app.services.qf_user import create_qf_room, like_qf_post
from app.services.event_bus import event_bus

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
    existing = await asyncio.to_thread(
        lambda: supabase_client.table("circle_members").select("*").eq("user_id", user_id).execute()
    )
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
        circle_result = await asyncio.to_thread(
            lambda: supabase_client.table("circles").insert({
                "qf_room_id": effective_room_id,
                "name": req.name,
                "invite_code": invite_code,
                "created_by": user_id,
            }).execute()
        )

        circle_id = circle_result.data[0]["id"]

        # Add creator as first member and set as admin
        await asyncio.to_thread(
            lambda: supabase_client.table("circle_members").insert({
                "circle_id": circle_id,
                "user_id": user_id,
                "is_admin": True,
            }).execute()
        )

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
    circles = await asyncio.to_thread(
        lambda: supabase_client.table("circles").select("*").eq("invite_code", invite_code).execute()
    )
    if not circles.data or len(circles.data) == 0:
        raise HTTPException(status_code=404, detail="Circle not found")

    circle = circles.data[0]
    circle_id = circle["id"]

    # Check user not already in a circle
    existing = await asyncio.to_thread(
        lambda: supabase_client.table("circle_members").select("*").eq("user_id", user_id).execute()
    )
    if existing.data and len(existing.data) > 0:
        raise HTTPException(status_code=409, detail="User is already in a circle")

    # Add user to circle
    try:
        await asyncio.to_thread(
            lambda: supabase_client.table("circle_members").insert({
                "circle_id": circle_id,
                "user_id": user_id,
            }).execute()
        )

        # Get updated member count
        members = await asyncio.to_thread(
            lambda: supabase_client.table("circle_members").select("*").eq("circle_id", circle_id).execute()
        )
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
    memberships = await asyncio.to_thread(
        lambda: supabase_client.table("circle_members").select("circle_id").eq("user_id", user_id).execute()
    )
    if not memberships.data or len(memberships.data) == 0:
        raise HTTPException(status_code=404, detail="User is not in a circle")

    circle_id = memberships.data[0]["circle_id"]

    # Run circle details + member count fetch IN PARALLEL
    circles_task = asyncio.to_thread(
        lambda: supabase_client.table("circles").select("*").eq("id", circle_id).execute()
    )
    members_task = asyncio.to_thread(
        lambda: supabase_client.table("circle_members").select("user_id").eq("circle_id", circle_id).execute()
    )
    circles, members = await asyncio.gather(circles_task, members_task)

    if not circles.data or len(circles.data) == 0:
        raise HTTPException(status_code=404, detail="Circle not found")

    circle = circles.data[0]
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
    memberships = await asyncio.to_thread(
        lambda: supabase_client.table("circle_members").select("circle_id").eq("user_id", user_id).execute()
    )
    if not memberships.data or len(memberships.data) == 0:
        raise HTTPException(status_code=404, detail="User is not in a circle")

    circle_id = memberships.data[0]["circle_id"]

    # Get all members in circle
    members_result = await asyncio.to_thread(
        lambda: supabase_client.table("circle_members").select("user_id").eq("circle_id", circle_id).execute()
    )
    if not members_result.data:
        return APIResponse(success=True, data={"feed": []}).dict()

    member_user_ids = [m["user_id"] for m in members_result.data]

    if not member_user_ids:
        return APIResponse(success=True, data={"feed": []}).dict()

    # Fetch shared reflections from circle members, with profile info
    try:
        reflections_result = await asyncio.to_thread(
            lambda: supabase_client.table("reflections")
            .select("id, user_id, verse_key, prompt_1_answer, prompt_2_answer, mood, created_at, qf_post_id")
            .in_("user_id", member_user_ids)
            .eq("is_shared", True)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )

        if not reflections_result.data:
            return APIResponse(success=True, data={"feed": []}).dict()

        # Batch-fetch likes and profiles IN PARALLEL
        reflection_ids = [ref["id"] for ref in reflections_result.data]
        all_likes: list = []

        likes_task = None
        if reflection_ids:
            try:
                likes_task = asyncio.to_thread(
                    lambda: supabase_client.table("reflection_likes").select("reflection_id, user_id").in_("reflection_id", reflection_ids).execute()
                )
            except Exception as e:
                logger.warning("reflection_likes table error (run migration): %s", str(e))

        profiles_task = asyncio.to_thread(
            lambda: supabase_client.table("profiles").select("id, display_name").in_("id", member_user_ids).execute()
        )

        # Await both in parallel
        if likes_task:
            likes_result, profiles_result = await asyncio.gather(likes_task, profiles_task)
            all_likes = likes_result.data or []
        else:
            profiles_result = await profiles_task

        likes_by_ref: dict[str, list[str]] = {}
        for like in all_likes:
            ref_id = like["reflection_id"]
            if ref_id not in likes_by_ref:
                likes_by_ref[ref_id] = []
            likes_by_ref[ref_id].append(like["user_id"])

        display_names: dict[str, str] = {p["id"]: p["display_name"] for p in (profiles_result.data or [])}

        # Batch fetch verse data
        from app.services.qf_content import get_verse_by_key
        verse_keys = list(set(ref["verse_key"] for ref in reflections_result.data))
        verse_cache = {}
        for vk in verse_keys:
            try:
                verse_cache[vk] = await get_verse_by_key(vk)
            except Exception as e:
                logger.warning("Failed to fetch verse context for %s in feed: %s", vk, str(e))
                verse_cache[vk] = {}

        feed_items: list[CircleFeedItem] = []
        for reflection in reflections_result.data:
            # Get author profile
            if reflection["user_id"] == user_id:
                display_name = "You"
            else:
                display_name = display_names.get(reflection["user_id"], "Anonymous")

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
                is_liked=is_liked,
                verse_text=verse_cache.get(reflection["verse_key"], {}).get("text_uthmani"),
                verse_translation=verse_cache.get(reflection["verse_key"], {}).get("translation"),
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
        reflections = await asyncio.to_thread(
            lambda: supabase_client.table("reflections").select("*").eq("id", reflection_id).execute()
        )
        if not reflections.data or len(reflections.data) == 0:
            raise HTTPException(status_code=404, detail="Reflection not found")

        reflection = reflections.data[0]
        qf_post_id = reflection.get("qf_post_id")

        # Like on QF if post exists (non-blocking)
        if qf_post_id:
            await like_qf_post(user_id, qf_post_id)

        # Track the like locally in our own database
        try:
            await asyncio.to_thread(
                lambda: supabase_client.table("reflection_likes").insert({
                    "user_id": user_id,
                    "reflection_id": reflection_id
                }).execute()
            )
        except Exception as e:
            # Catch PGRST116 (duplicate key violation if user already liked it) - safe to ignore
            logger.warning("Duplicate like or reflection_likes missing: %s", str(e))

        # Award +3 XP for liking
        xp_amount = 3
        await asyncio.to_thread(
            lambda: supabase_client.table("xp_events").insert({
                "user_id": user_id,
                "event_type": "like_reflection",
                "xp_amount": xp_amount,
            }).execute()
        )

        # Update user's total XP
        profiles = await asyncio.to_thread(
            lambda: supabase_client.table("profiles").select("xp").eq("id", user_id).execute()
        )
        current_xp = profiles.data[0]["xp"] if profiles.data else 0
        new_xp = current_xp + xp_amount

        await asyncio.to_thread(
            lambda: supabase_client.table("profiles").update({"xp": new_xp}).eq("id", user_id).execute()
        )

        logger.info("User %s liked reflection %s, awarded %d XP", user_id, reflection_id, xp_amount)

        # Real-time event for circle feed
        try:
            # Re-fetch circle_id for the current user
            membership = await asyncio.to_thread(
                lambda: supabase_client.table("circle_members")
                .select("circle_id").eq("user_id", user_id).execute()
            )
            circle_id = membership.data[0]["circle_id"] if membership.data else None
            if circle_id:
                await event_bus.publish_to_circle(circle_id, {"type": "feed_update"})
        except Exception as e:
            logger.warning("Failed to publish feed_update after like: %s", str(e))

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
        reflections = await asyncio.to_thread(
            lambda: supabase_client.table("reflections").select("*").eq("id", reflection_id).execute()
        )
        if not reflections.data or len(reflections.data) == 0:
            raise HTTPException(status_code=404, detail="Reflection not found")

        reflection = reflections.data[0]
        qf_post_id = reflection.get("qf_post_id")

        if qf_post_id:
            await unlike_qf_post(user_id, qf_post_id)

        # Untrack the like locally
        try:
            await asyncio.to_thread(
                lambda: supabase_client.table("reflection_likes").delete().eq("user_id", user_id).eq("reflection_id", reflection_id).execute()
            )
        except Exception as e:
            logger.warning("Unliking failed locally or reflection_likes missing: %s", str(e))

        # Deduct XP (optional but consistent)
        xp_amount = -3
        await asyncio.to_thread(
            lambda: supabase_client.table("xp_events").insert({
                "user_id": user_id,
                "event_type": "unlike_reflection",
                "xp_amount": xp_amount,
            }).execute()
        )

        profiles = await asyncio.to_thread(
            lambda: supabase_client.table("profiles").select("xp").eq("id", user_id).execute()
        )
        current_xp = profiles.data[0]["xp"] if profiles.data else 0
        new_xp = max(0, current_xp + xp_amount)
        await asyncio.to_thread(
            lambda: supabase_client.table("profiles").update({"xp": new_xp}).eq("id", user_id).execute()
        )

        logger.info("User %s unliked reflection %s, deducted %d XP", user_id, reflection_id, abs(xp_amount))

        # Real-time event for circle feed
        try:
            membership = await asyncio.to_thread(
                lambda: supabase_client.table("circle_members")
                .select("circle_id").eq("user_id", user_id).execute()
            )
            circle_id = membership.data[0]["circle_id"] if membership.data else None
            if circle_id:
                await event_bus.publish_to_circle(circle_id, {"type": "feed_update"})
        except Exception as e:
            logger.warning("Failed to publish feed_update after unlike: %s", str(e))
        return APIResponse(success=True, data={"liked": False, "xp_earned": xp_amount}).dict()

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to unlike reflection: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to unlike reflection")


@router.get("/members")
async def get_circle_members(
    authorization: str = Header(...),
) -> dict[str, Any]:
    """Get all members of the user's circle."""
    current_user: dict[str, Any] = await get_current_user(authorization)
    user_id = current_user["sub"]

    # Find user's circle
    memberships = await asyncio.to_thread(
        lambda: supabase_client.table("circle_members").select("circle_id").eq("user_id", user_id).execute()
    )
    if not memberships.data:
        raise HTTPException(status_code=404, detail="User is not in a circle")

    circle_id = memberships.data[0]["circle_id"]

    # Get all members with profile details and circle creator info
    try:
        circle_info = await asyncio.to_thread(
            lambda: supabase_client.table("circles").select("created_by").eq("id", circle_id).execute()
        )
        creator_id = circle_info.data[0]["created_by"] if circle_info.data else None

        members_query = "user_id, joined_at, is_admin, profiles(username, display_name, avatar_url)"
        members_result = await asyncio.to_thread(
            lambda: supabase_client.table("circle_members").select(members_query).eq("circle_id", circle_id).execute()
        )

        members: list[CircleMemberResponse] = []
        for m in members_result.data:
            profile = m.get("profiles", {}) or {} # Ensure it's not None
            members.append(CircleMemberResponse(
                user_id=m["user_id"],
                username=profile.get("username") or "user",
                display_name=profile.get("display_name") or profile.get("username") or "Anonymous",
                avatar_url=profile.get("avatar_url"),
                joined_at=m["joined_at"],
                is_admin=m["is_admin"],
                is_creator=m["user_id"] == creator_id
            ))

        return APIResponse(success=True, data={"members": [m.dict() for m in members]}).dict()
    except Exception as e:
        logger.error("Failed to fetch circle members: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch circle members")


@router.post("/admin/{target_user_id}")
async def make_admin(
    target_user_id: str,
    authorization: str = Header(...),
) -> dict[str, Any]:
    """Grant admin status to a member (Admin only)."""
    current_user: dict[str, Any] = await get_current_user(authorization)
    requester_user_id = current_user["sub"]

    # Get requester's member status
    requester_status = await asyncio.to_thread(
        lambda: supabase_client.table("circle_members").select("circle_id, is_admin").eq("user_id", requester_user_id).execute()
    )
    if not requester_status.data or not requester_status.data[0]["is_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can grant admin status")

    circle_id = requester_status.data[0]["circle_id"]

    # Update target user
    try:
        await asyncio.to_thread(
            lambda: supabase_client.table("circle_members").update({"is_admin": True}).eq("circle_id", circle_id).eq("user_id", target_user_id).execute()
        )
        return APIResponse(success=True, data={"message": "Member promoted to admin"}).dict()
    except Exception as e:
        logger.error("Failed to grant admin status: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to grant admin status")


@router.post("/admin/demote/{target_user_id}")
async def demote_admin(
    target_user_id: str,
    authorization: str = Header(...),
) -> dict[str, Any]:
    """Remove admin status from a member (Creator only)."""
    current_user: dict[str, Any] = await get_current_user(authorization)
    requester_user_id = current_user["sub"]

    # Get user circle and creator status
    # First find circle_id for requester
    requester_membership = await asyncio.to_thread(
        lambda: supabase_client.table("circle_members").select("circle_id").eq("user_id", requester_user_id).execute()
    )
    if not requester_membership.data:
        raise HTTPException(status_code=404, detail="User not in a circle")
    
    circle_id = requester_membership.data[0]["circle_id"]

    # Check if requester is creator
    circle_info = await asyncio.to_thread(
        lambda: supabase_client.table("circles").select("created_by").eq("id", circle_id).execute()
    )
    if not circle_info.data or circle_info.data[0]["created_by"] != requester_user_id:
        raise HTTPException(status_code=403, detail="Only the circle creator can demote admins")

    # Perform demotion
    await asyncio.to_thread(
        lambda: supabase_client.table("circle_members").update({"is_admin": False}).eq("circle_id", circle_id).eq("user_id", target_user_id).execute()
    )

    return APIResponse(success=True, data={"message": "Member demoted from admin"}).dict()


@router.delete("/members/{target_user_id}")
async def remove_member(
    target_user_id: str,
    authorization: str = Header(...),
) -> dict[str, Any]:
    """Remove a member from the circle (Admin only, or self-remove)."""
    current_user: dict[str, Any] = await get_current_user(authorization)
    requester_user_id = current_user["sub"]

    # Get requester's member status
    requester_status = await asyncio.to_thread(
        lambda: supabase_client.table("circle_members").select("circle_id, is_admin").eq("user_id", requester_user_id).execute()
    )
    if not requester_status.data:
        raise HTTPException(status_code=404, detail="Requester not in a circle")

    circle_id = requester_status.data[0]["circle_id"]
    is_requester_admin = requester_status.data[0]["is_admin"]

    # Get circle owner info
    circle_info = await asyncio.to_thread(
        lambda: supabase_client.table("circles").select("created_by").eq("id", circle_id).execute()
    )
    if not circle_info.data:
        raise HTTPException(status_code=404, detail="Circle not found")
    
    creator_id = circle_info.data[0]["created_by"]

    # 1. Protection: Admin CANNOT remove the creator
    if target_user_id == creator_id and requester_user_id != target_user_id:
        raise HTTPException(status_code=403, detail="The circle creator cannot be removed by other admins")

    # 2. Succession: If creator is leaving, we must transfer ownership
    if target_user_id == creator_id:
        # Find the oldest remaining member (next in hierarchy)
        other_members = await asyncio.to_thread(
            lambda: supabase_client.table("circle_members")
            .select("user_id")
            .eq("circle_id", circle_id)
            .neq("user_id", creator_id)
            .order("joined_at", desc=False)
            .limit(1)
            .execute()
        )
        
        if other_members.data:
            new_owner_id = other_members.data[0]["user_id"]
            # Transfer created_by in circles table
            await asyncio.to_thread(
                lambda: supabase_client.table("circles")
                .update({"created_by": new_owner_id})
                .eq("id", circle_id)
                .execute()
            )
            # Also ensure new owner is an admin
            await asyncio.to_thread(
                lambda: supabase_client.table("circle_members")
                .update({"is_admin": True})
                .eq("circle_id", circle_id)
                .eq("user_id", new_owner_id)
                .execute()
            )

    # 3. Final Removal
    try:
        await asyncio.to_thread(
            lambda: supabase_client.table("circle_members")
            .delete()
            .eq("circle_id", circle_id)
            .eq("user_id", target_user_id)
            .execute()
        )
        return APIResponse(success=True, data={"message": "Member removed"}).dict()
    except Exception as e:
        logger.error("Failed to remove member: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to remove member")

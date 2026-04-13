"""Quran Foundation User APIs (Streaks, Notes, Rooms, Posts, Goals, Activity Days)."""

import logging
from typing import Any, Dict, Optional

import httpx
from fastapi import HTTPException

from app.auth.qf_user_auth import get_user_qf_token
from app.config import settings

logger = logging.getLogger(__name__)


async def _qf_user_get(user_id: str, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Make authenticated GET request to QF User API.

    Args:
        user_id: Supabase user ID (for retrieving their QF token)
        path: API path relative to /api/v1 (e.g., "streaks", "notes?verse_key=2:255")
        params: Optional query parameters

    Returns:
        JSON response from QF API

    Raises:
        HTTPException(401): QF token expired or not connected
        HTTPException(403): Scope issue or access denied
        HTTPException(503): QF API error
    """
    try:
        token = await get_user_qf_token(user_id)

        headers = {"Authorization": f"Bearer {token}"}

        async with httpx.AsyncClient() as client:
            url = f"{settings.qf_user_api_base_url}/api/v1/{path}"
            response = await client.get(url, headers=headers, params=params, timeout=10)

            if response.status_code == 401:
                logger.warning("QF User API 401 for user: %s (token expired)", user_id)
                raise HTTPException(status_code=401, detail="QF token expired. Please reconnect.")

            if response.status_code == 403:
                logger.warning("QF User API 403 for user: %s (scope issue)", user_id)
                raise HTTPException(status_code=403, detail="Insufficient permissions. Please reconnect.")

            response.raise_for_status()
            logger.debug("QF User API GET %s succeeded for user: %s", path, user_id)
            return response.json()

    except HTTPException:
        raise
    except httpx.HTTPError as e:
        logger.error("QF User API GET error for user %s: %s", user_id, str(e))
        raise HTTPException(status_code=503, detail="QF API error") from e


async def _qf_user_post(user_id: str, path: str, body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Make authenticated POST request to QF User API.

    Args:
        user_id: Supabase user ID (for retrieving their QF token)
        path: API path relative to /api/v1 (e.g., "notes", "posts")
        body: Request body

    Returns:
        JSON response from QF API

    Raises:
        HTTPException(401): QF token expired or not connected
        HTTPException(403): Scope issue or access denied
        HTTPException(503): QF API error
    """
    try:
        token = await get_user_qf_token(user_id)

        headers = {"Authorization": f"Bearer {token}"}

        async with httpx.AsyncClient() as client:
            url = f"{settings.qf_user_api_base_url}/api/v1/{path}"
            response = await client.post(url, headers=headers, json=body, timeout=10)

            if response.status_code == 401:
                logger.warning("QF User API 401 for user: %s (token expired)", user_id)
                raise HTTPException(status_code=401, detail="QF token expired. Please reconnect.")

            if response.status_code == 403:
                logger.warning("QF User API 403 for user: %s (scope issue)", user_id)
                raise HTTPException(status_code=403, detail="Insufficient permissions. Please reconnect.")

            response.raise_for_status()
            logger.debug("QF User API POST %s succeeded for user: %s", path, user_id)
            return response.json()

    except HTTPException:
        raise
    except httpx.HTTPError as e:
        logger.error("QF User API POST error for user %s: %s", user_id, str(e))
        raise HTTPException(status_code=503, detail="QF API error") from e


async def get_streaks(user_id: str) -> Dict[str, Any]:
    """
    Fetch user's current and longest streak.

    Args:
        user_id: Supabase user ID

    Returns:
        Streak data from QF API

    Raises:
        HTTPException(401/403/503): See _qf_user_get
    """
    return await _qf_user_get(user_id, "streaks")


async def log_activity_day(user_id: str, date: str) -> Dict[str, Any]:
    """
    Log an activity day for the user (mark reflection completion).

    Args:
        user_id: Supabase user ID
        date: Date string in YYYY-MM-DD format

    Returns:
        Activity day response from QF API

    Raises:
        HTTPException(401/403/503): See _qf_user_post
    """
    return await _qf_user_post(user_id, "activity-days", {"date": date})


async def get_notes(user_id: str, verse_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Get user's notes (optionally filtered by verse).

    Args:
        user_id: Supabase user ID
        verse_key: Optional verse key filter (e.g., "2:255")

    Returns:
        Notes from QF API

    Raises:
        HTTPException(401/403/503): See _qf_user_get
    """
    params = {}
    if verse_key:
        params["verse_key"] = verse_key
    return await _qf_user_get(user_id, "notes", params)


async def create_note(user_id: str, verse_key: str, body: str, tags: Optional[list] = None) -> Dict[str, Any]:
    """
    Create a new note (reflection) for a verse.

    Args:
        user_id: Supabase user ID
        verse_key: Verse key (e.g., "2:255")
        body: Note text
        tags: Optional list of tags (e.g., ["tadabbur"])

    Returns:
        Note response from QF API with note ID

    Raises:
        HTTPException(401/403/503): See _qf_user_post
    """
    note_body = {"verse_key": verse_key, "body": body}
    if tags:
        note_body["tags"] = tags
    return await _qf_user_post(user_id, "notes", note_body)


async def create_reading_session(user_id: str, verse_key: str) -> Dict[str, Any]:
    """
    Log a reading session for a verse.

    Args:
        user_id: Supabase user ID
        verse_key: Verse key (e.g., "2:255")

    Returns:
        Reading session response from QF API

    Raises:
        HTTPException(401/403/503): See _qf_user_post
    """
    return await _qf_user_post(user_id, "reading-sessions", {"verse_key": verse_key})


async def create_qf_note(user_id: str, verse_key: str, body: str) -> Optional[str]:
    """
    Create a note (reflection) in QF Notes API.

    Args:
        user_id: Supabase user ID
        verse_key: Verse key (e.g., "2:255")
        body: Note text

    Returns:
        Note ID string from QF API, or None if creation fails

    Raises:
        HTTPException(401/403): Via _qf_user_post (will raise and be caught by caller)
    """
    try:
        response = await _qf_user_post(user_id, "notes", {
            "verse_key": verse_key,
            "body": body,
            "tags": ["tadabbur"],
        })
        note_id = response.get("id")
        logger.debug("Created QF note %s for user %s", note_id, user_id)
        return note_id
    except HTTPException as e:
        if e.status_code in (401, 403):
            raise
        logger.error("QF note creation failed: %s", str(e))
        return None
    except Exception as e:
        logger.error("Unexpected error creating QF note: %s", str(e))
        return None


async def create_qf_post(
    user_id: str,
    body: str,
    verse_key: str,
    room_id: str,
) -> Optional[str]:
    """
    Create a shared post in a QF Room.

    Args:
        user_id: Supabase user ID
        body: Post text (reflection)
        verse_key: Verse key (e.g., "2:255")
        room_id: QF Room ID

    Returns:
        Post ID string from QF API, or None if creation fails
    """
    try:
        response = await _qf_user_post(user_id, "posts", {
            "body": body,
            "verse_key": verse_key,
            "room_id": room_id,
        })
        post_id = response.get("id")
        logger.debug("Created QF post %s for user %s", post_id, user_id)
        return post_id
    except HTTPException as e:
        if e.status_code in (401, 403):
            raise
        logger.error("QF post creation failed: %s", str(e))
        return None
    except Exception as e:
        logger.error("Unexpected error creating QF post: %s", str(e))
        return None


async def log_activity_day(user_id: str, date_str: str) -> None:
    """
    Log an activity day (reflection completion).

    Non-blocking: logs error but does not raise.

    Args:
        user_id: Supabase user ID
        date_str: Date in YYYY-MM-DD format
    """
    try:
        await _qf_user_post(user_id, "activity-days", {"date": date_str})
        logger.debug("Logged activity day for user %s on %s", user_id, date_str)
    except Exception as e:
        logger.warning("Failed to log activity day: %s", str(e))


async def log_reading_session(user_id: str, verse_key: str) -> None:
    """
    Log a reading session for a verse.

    Non-blocking: logs warning but does not raise.

    Args:
        user_id: Supabase user ID
        verse_key: Verse key (e.g., "2:255")
    """
    try:
        await _qf_user_post(user_id, "reading-sessions", {"verse_key": verse_key})
        logger.debug("Logged reading session for user %s on %s", user_id, verse_key)
    except Exception as e:
        logger.warning("Failed to log reading session: %s", str(e))


async def create_qf_room(user_id: str, name: str) -> Optional[str]:
    """
    Create a new QF Room (reflection circle).

    Args:
        user_id: Supabase user ID
        name: Room name

    Returns:
        Room ID string from QF API, or None if creation fails
    """
    try:
        response = await _qf_user_post(user_id, "rooms/groups", {"name": name})
        room_id = response.get("id")
        logger.debug("Created QF room %s for user %s", room_id, user_id)
        return room_id
    except HTTPException as e:
        if e.status_code in (401, 403):
            raise
        logger.error("QF room creation failed: %s", str(e))
        return None
    except Exception as e:
        logger.error("Unexpected error creating QF room: %s", str(e))
        return None


async def like_qf_post(user_id: str, qf_post_id: str) -> bool:
    """
    Like a QF Post (reflection from circle member).

    Non-blocking: returns False on failure, never raises.

    Args:
        user_id: Supabase user ID
        qf_post_id: QF Post ID to like

    Returns:
        True if like succeeded, False otherwise
    """
    try:
        await _qf_user_post(user_id, f"posts/{qf_post_id}/like", {})
        logger.debug("Liked QF post %s for user %s", qf_post_id, user_id)
        return True
    except Exception as e:
        logger.warning("Failed to like QF post %s: %s", qf_post_id, str(e))
        return False

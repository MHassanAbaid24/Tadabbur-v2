"""Quran Foundation User APIs (Streaks, Notes, Rooms, Posts, Goals, Activity Days)."""

import logging
from typing import Any, Dict, Optional

import httpx
import asyncio
from fastapi import HTTPException

from app.auth.qf_user_auth import get_user_qf_token
from app.config import settings

logger = logging.getLogger(__name__)

# Shared httpx.AsyncClient — reuses TCP connections across requests
_http_client: Optional[httpx.AsyncClient] = None


def _get_http_client() -> httpx.AsyncClient:
    """Get or create the shared httpx.AsyncClient."""
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=10.0,
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )
    return _http_client


async def _qf_user_get(user_id: str, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Make authenticated GET request to QF User API with retry/backoff.
    """
    max_attempts = 3
    backoff_times = [1, 2, 4]
    
    for attempt in range(max_attempts):
        try:
            token = await get_user_qf_token(user_id)
            headers = {"Authorization": f"Bearer {token}"}
            client = _get_http_client()

            url = f"{settings.qf_user_api_base_url}/api/v1/{path}"
            response = await client.get(url, headers=headers, params=params)

            if response.status_code == 429:
                if attempt < max_attempts - 1:
                    wait_time = backoff_times[attempt]
                    logger.warning("QF User API 429 on %s, backoff %ds (attempt %d)", path, wait_time, attempt + 1)
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    logger.error("QF User API 429 exhausted retries on %s", path)
                    raise HTTPException(status_code=503, detail="QF API rate limited")
            
            if response.status_code == 500:
                if attempt < max_attempts - 1:
                    logger.warning("QF User API 500 on %s, retrying after 1s (attempt %d)", path, attempt + 1)
                    await asyncio.sleep(1)
                    continue
                else:
                    logger.error("QF User API 500 still after retry on %s", path)
                    raise HTTPException(status_code=503, detail="QF API error")

            if response.status_code == 404:
                logger.warning("QF User API 404 on %s for user %s", path, user_id)
                raise HTTPException(status_code=404, detail="QF API endpoint not found")

            if response.status_code in (401, 403):
                logger.warning("QF User API GET %s for user: %s (token expired/invalid), clearing token", response.status_code, user_id)
                from app.db.supabase import supabase_client
                await asyncio.to_thread(
                    lambda: supabase_client.table("profiles").update(
                        {"qf_access_token": None, "qf_token_expires_at": None}
                    ).eq("id", user_id).execute()
                )
                # Return 403 so frontend knows to prompt reconnect
                raise HTTPException(status_code=403, detail="QF token expired or unauthorized. Please reconnect.")

            response.raise_for_status()
            logger.debug("QF User API GET %s succeeded for user: %s", path, user_id)
            return response.json()

        except HTTPException:
            raise
        except httpx.HTTPError as e:
            if attempt < max_attempts - 1:
                logger.warning("QF User API GET error %s, retrying...", str(e))
                await asyncio.sleep(1)
                continue
            logger.error("QF User API GET error for user %s: %s", user_id, str(e))
            raise HTTPException(status_code=503, detail="QF API error") from e

    raise HTTPException(status_code=503, detail="QF API error")


async def _qf_user_post(user_id: str, path: str, body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Make authenticated POST request to QF User API with retry logic for 429.
    """
    max_attempts = 3
    backoff_times = [1, 2, 4]

    for attempt in range(max_attempts):
        try:
            token = await get_user_qf_token(user_id)
            headers = {"Authorization": f"Bearer {token}"}
            client = _get_http_client()

            url = f"{settings.qf_user_api_base_url}/api/v1/{path}"
            response = await client.post(url, headers=headers, json=body)

            if response.status_code == 429:
                if attempt < max_attempts - 1:
                    wait_time = backoff_times[attempt]
                    logger.warning("QF User API 429 on %s, backoff %ds (attempt %d)", path, wait_time, attempt + 1)
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    logger.error("QF User API 429 exhausted retries on %s", path)
                    raise HTTPException(status_code=503, detail="QF API rate limited")

            if response.status_code in (401, 403):
                logger.warning("QF User API POST %s for user: %s (token expired/invalid), clearing token", response.status_code, user_id)
                from app.db.supabase import supabase_client
                await asyncio.to_thread(
                    lambda: supabase_client.table("profiles").update(
                        {"qf_access_token": None, "qf_token_expires_at": None}
                    ).eq("id", user_id).execute()
                )
                # Return 403 so frontend knows to prompt reconnect
                raise HTTPException(status_code=403, detail="QF token expired or unauthorized. Please reconnect.")

            response.raise_for_status()
            logger.debug("QF User API POST %s succeeded for user: %s", path, user_id)
            return response.json()

        except HTTPException:
            raise
        except httpx.HTTPError as e:
            if attempt < max_attempts - 1:
                logger.warning("QF User API POST error %s, retrying...", str(e))
                await asyncio.sleep(1)
                continue
            logger.error("QF User API POST error for user %s: %s", user_id, str(e))
            raise HTTPException(status_code=503, detail="QF API error") from e

    raise HTTPException(status_code=503, detail="QF API error")


async def _qf_user_delete(user_id: str, path: str) -> Dict[str, Any]:
    """
    Make authenticated DELETE request to QF User API with retry logic.
    """
    max_attempts = 3
    backoff_times = [1, 2, 4]

    for attempt in range(max_attempts):
        try:
            token = await get_user_qf_token(user_id)
            headers = {"Authorization": f"Bearer {token}"}
            client = _get_http_client()

            url = f"{settings.qf_user_api_base_url}/api/v1/{path}"
            response = await client.delete(url, headers=headers)

            if response.status_code == 429:
                if attempt < max_attempts - 1:
                    wait_time = backoff_times[attempt]
                    logger.warning("QF User API 429 on DELETE %s, backoff %ds (attempt %d)", path, wait_time, attempt + 1)
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    logger.error("QF User API 429 exhausted retries on DELETE %s", path)
                    raise HTTPException(status_code=503, detail="QF API rate limited")

            if response.status_code in (401, 403):
                logger.warning("QF User API DELETE %s for user: %s (token expired/invalid), clearing token", response.status_code, user_id)
                from app.db.supabase import supabase_client
                await asyncio.to_thread(
                    lambda: supabase_client.table("profiles").update(
                        {"qf_access_token": None, "qf_token_expires_at": None}
                    ).eq("id", user_id).execute()
                )
                raise HTTPException(status_code=403, detail="QF token expired or unauthorized. Please reconnect.")

            response.raise_for_status()
            logger.debug("QF User API DELETE %s succeeded for user: %s", path, user_id)

            # 204 typically has no content
            if response.status_code == 204:
                return {}
            return response.json()

        except HTTPException:
            raise
        except httpx.HTTPError as e:
            if attempt < max_attempts - 1:
                logger.warning("QF User API DELETE error %s, retrying...", str(e))
                await asyncio.sleep(1)
                continue
            logger.error("QF User API DELETE error for user %s: %s", user_id, str(e))
            raise HTTPException(status_code=503, detail="QF API error") from e

    raise HTTPException(status_code=503, detail="QF API error")


async def get_streaks(user_id: str) -> Dict[str, Any]:
    """Fetch user's current and longest streak."""
    return await _qf_user_get(user_id, "streaks")


async def log_activity_day(user_id: str, date_str: str) -> None:
    """
    Log an activity day (reflection completion).
    Non-blocking: logs error but does not raise.
    """
    try:
        await _qf_user_post(user_id, "activity-days", {"date": date_str})
        logger.debug("Logged activity day for user %s on %s", user_id, date_str)
    except Exception as e:
        logger.warning("Failed to log activity day: %s", str(e))


async def get_notes(user_id: str, verse_key: Optional[str] = None) -> Dict[str, Any]:
    """Get user's notes (optionally filtered by verse)."""
    params = {}
    if verse_key:
        params["verse_key"] = verse_key
    return await _qf_user_get(user_id, "notes", params)


async def create_note(user_id: str, verse_key: str, body: str, tags: Optional[list] = None) -> Dict[str, Any]:
    """Create a new note (reflection) for a verse."""
    note_body: Dict[str, Any] = {"verse_key": verse_key, "body": body}
    if tags:
        note_body["tags"] = tags
    return await _qf_user_post(user_id, "notes", note_body)


async def create_reading_session(user_id: str, verse_key: str) -> Dict[str, Any]:
    """Log a reading session for a verse."""
    return await _qf_user_post(user_id, "reading-sessions", {"verse_key": verse_key})


async def create_qf_note(user_id: str, verse_key: str, body: str) -> Optional[str]:
    """Create a note (reflection) in QF Notes API."""
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
    """Create a shared post in a QF Room."""
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


async def log_reading_session(user_id: str, verse_key: str) -> None:
    """Log a reading session. Non-blocking."""
    try:
        await _qf_user_post(user_id, "reading-sessions", {"verse_key": verse_key})
        logger.debug("Logged reading session for user %s on %s", user_id, verse_key)
    except Exception as e:
        logger.warning("Failed to log reading session: %s", str(e))


async def create_qf_room(user_id: str, name: str) -> Optional[str]:
    """Create a new QF Room (reflection circle)."""
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
    """Like a QF Post. Non-blocking: returns False on failure."""
    try:
        await _qf_user_post(user_id, f"posts/{qf_post_id}/like", {})
        logger.debug("Liked QF post %s for user %s", qf_post_id, user_id)
        return True
    except Exception as e:
        logger.warning("Failed to like QF post %s: %s", qf_post_id, str(e))
        return False


async def unlike_qf_post(user_id: str, qf_post_id: str) -> bool:
    """Unlike a QF Post."""
    try:
        await _qf_user_delete(user_id, f"posts/{qf_post_id}/like")
        logger.debug("Unliked QF post %s for user %s", qf_post_id, user_id)
        return True
    except Exception as e:
        logger.warning("Failed to unlike QF post %s: %s", qf_post_id, str(e))
        return False


async def get_activity_days(user_id: str, from_date: str, to_date: str) -> list[str]:
    """Fetch activity days for date range. Returns empty list on failure."""
    try:
        response = await _qf_user_get(user_id, "activity-days", {
            "from": from_date,
            "to": to_date,
        })

        dates = []
        if isinstance(response, dict) and "data" in response:
            data = response["data"]
            if isinstance(data, list):
                dates = [item.get("date") for item in data if isinstance(item, dict) and "date" in item]
        elif isinstance(response, list):
            dates = [item.get("date") for item in response if isinstance(item, dict) and "date" in item]

        logger.debug("Fetched %d activity days for user %s", len(dates), user_id)
        return dates
    except HTTPException as e:
        if e.status_code == 401:
            logger.warning("QF token expired for user %s", user_id)
            return []
        if e.status_code == 404:
            logger.info("QF activity days endpoint not found for user %s. Returning empty.", user_id)
            return []
        logger.warning("Failed to fetch activity days: %s", str(e))
        return []
    except Exception as e:
        logger.warning("Unexpected error fetching activity days: %s", str(e))
        return []

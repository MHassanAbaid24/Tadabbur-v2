"""Profile router: avatar upload."""

import asyncio
import logging
import time
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.auth.jwt import get_current_user
from app.db.supabase import supabase_client
from app.models.schemas import APIResponse
from app.services.avatar import (
    upload_avatar,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/profile", tags=["Profile"])

# Simple in-memory rate limiter: {user_id: last_upload_timestamp}
_upload_timestamps: Dict[str, float] = {}
RATE_LIMIT_SECONDS = 30


def _check_rate_limit(user_id: str) -> None:
    now = time.time()
    last = _upload_timestamps.get(user_id, 0)
    if now - last < RATE_LIMIT_SECONDS:
        remaining = int(RATE_LIMIT_SECONDS - (now - last))
        raise HTTPException(
            status_code=429,
            detail=f"Please wait {remaining}s before uploading another avatar.",
        )
    _upload_timestamps[user_id] = now


@router.post("/avatar")
async def upload_avatar_endpoint(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> APIResponse:
    """
    Upload and update the current user's avatar.

    - Max size: 2 MB
    - Allowed types: image/jpeg, image/png, image/webp
    - Image is resized server-side to 400×400 JPEG
    - Rate limited: 1 upload per 30 seconds per user
    """
    user_id: str = current_user["sub"]

    # Rate limit check
    _check_rate_limit(user_id)

    # Read file bytes
    image_bytes = await file.read()

    # Validate size before any processing
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 2 MB.")

    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: JPEG, PNG, WebP.",
        )

    # Offload blocking Pillow + Supabase Storage call to thread
    try:
        avatar_url = await asyncio.to_thread(upload_avatar, user_id, image_bytes, content_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Persist public URL to profiles table
    try:
        await asyncio.to_thread(
            lambda: supabase_client.table("profiles")
            .update({"avatar_url": avatar_url})
            .eq("id", user_id)
            .execute()
        )
    except Exception as e:
        logger.error("Failed to update avatar_url in DB: %s", str(e))
        raise HTTPException(status_code=500, detail="Avatar uploaded but failed to save URL.")

    return APIResponse(success=True, data={"avatar_url": avatar_url})

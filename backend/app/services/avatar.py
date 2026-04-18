"""Avatar upload service: resize with Pillow, store in Supabase Storage."""

import io
import logging
import time
from typing import Tuple

logger = logging.getLogger(__name__)

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2 MB
AVATAR_SIZE = (400, 400)
BUCKET = "avatars"


def _resize_to_jpeg(image_bytes: bytes) -> bytes:
    """
    Resize image to 400x400 JPEG using Pillow (center-crop to square first).
    Returns JPEG bytes at quality=85.
    """
    try:
        from PIL import Image
    except ImportError:
        raise RuntimeError("Pillow is not installed. Add Pillow to requirements.txt.")

    with Image.open(io.BytesIO(image_bytes)) as img:
        img = img.convert("RGB")

        # Center-crop to square
        w, h = img.size
        min_dim = min(w, h)
        left = (w - min_dim) // 2
        top = (h - min_dim) // 2
        img = img.crop((left, top, left + min_dim, top + min_dim))

        img = img.resize(AVATAR_SIZE, Image.LANCZOS)

        out = io.BytesIO()
        img.save(out, format="JPEG", quality=85, optimize=True)
        return out.getvalue()


def upload_avatar(user_id: str, image_bytes: bytes, content_type: str) -> str:
    """
    Validate, resize, and upload avatar image to Supabase Storage.

    Args:
        user_id: The authenticated user's UUID.
        image_bytes: Raw bytes of the uploaded file.
        content_type: MIME type string from the upload.

    Returns:
        Public CDN URL with cache-busting timestamp query param.

    Raises:
        ValueError: If MIME type or file size is invalid.
        RuntimeError: If Supabase upload fails.
    """
    from app.db.supabase import supabase_client
    from app.config import settings

    # Validate MIME type
    if content_type not in ALLOWED_MIME_TYPES:
        raise ValueError(f"Invalid file type '{content_type}'. Allowed: jpeg, png, webp.")

    # Validate file size
    if len(image_bytes) > MAX_FILE_SIZE:
        raise ValueError("File too large. Maximum size is 2 MB.")

    # Resize to canonical 400×400 JPEG
    resized_bytes = _resize_to_jpeg(image_bytes)

    storage_path = f"{user_id}/avatar.jpg"

    try:
        supabase_client.storage.from_(BUCKET).upload(
            path=storage_path,
            file=resized_bytes,
            file_options={
                "content-type": "image/jpeg",
                "upsert": "true",
            },
        )
    except Exception as e:
        logger.error("Supabase Storage upload failed: %s", str(e))
        raise RuntimeError("Failed to upload avatar. Please try again.") from e

    # Build CDN URL with cache-busting timestamp
    public_url = (
        f"{settings.supabase_url}/storage/v1/object/public/{BUCKET}"
        f"/{storage_path}?t={int(time.time())}"
    )
    logger.info("Avatar uploaded for user %s → %s", user_id, storage_path)
    return public_url

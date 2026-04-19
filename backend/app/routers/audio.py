"""Audio endpoint router — fetches Quranic recitation from QF API."""

from fastapi import APIRouter, HTTPException
from app.services.qf_content import get_audio_url

router = APIRouter()


@router.get("/{verse_key}")
async def get_audio(verse_key: str):
    """Fetch audio recitation for a specific verse from QF Audio API."""
    audio_url = await get_audio_url(verse_key)
    if not audio_url:
        raise HTTPException(status_code=404, detail="Audio not found")
    return {"success": True, "data": {"audio_url": audio_url, "verse_key": verse_key}}

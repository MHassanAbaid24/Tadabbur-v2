"""Audio endpoint router — fetches Quranic recitation from QF API."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/{verse_key}")
async def get_audio(verse_key: str) -> dict:
    """TODO: Fetch audio recitation for a specific verse from QF Audio API."""
    return {"success": True, "data": {}}

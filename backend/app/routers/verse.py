"""Verse endpoint router — fetches today's Quranic verse from QF API."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/today")
async def get_today_verse() -> dict:
    """TODO: Fetch today's verse from QF Content API."""
    return {"success": True, "data": {}}

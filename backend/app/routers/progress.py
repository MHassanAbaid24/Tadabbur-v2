"""Progress endpoint router — handles streaks, XP, and level data."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/user")
async def get_user_progress() -> dict:
    """TODO: Fetch user streaks, XP, and level from Supabase."""
    return {"success": True, "data": {}}

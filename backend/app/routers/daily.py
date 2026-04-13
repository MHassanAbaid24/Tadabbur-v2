"""Daily endpoint router — handles daily verse and activity logging."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/verse")
async def get_daily_verse() -> dict:
    """TODO: Return today's deterministic verse for all users."""
    return {"success": True, "data": {}}

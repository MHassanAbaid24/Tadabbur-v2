from fastapi import APIRouter, Depends
from typing import Any, Dict
from app.auth.jwt import get_current_user
from app.routers.verse import get_today_verse
from app.models.schemas import APIResponse

router = APIRouter()


@router.get("/verse")
async def get_daily_verse_route(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> APIResponse:
    """
    Get today's deterministic verse (proxy to verse/today).
    """
    return await get_today_verse(current_user)

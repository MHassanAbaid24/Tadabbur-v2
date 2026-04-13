"""Circle endpoint router — handles reflection circles and group features."""

from fastapi import APIRouter

router = APIRouter()


@router.post("/create")
async def create_circle(body: dict) -> dict:
    """TODO: Create a reflection circle and store QF Room ID."""
    return {"success": True, "data": {}}

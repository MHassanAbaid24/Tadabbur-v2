"""Reflection endpoint router — handles user reflections on verses."""

from fastapi import APIRouter

router = APIRouter()


@router.post("/submit")
async def submit_reflection(body: dict) -> dict:
    """TODO: Save reflection to Supabase and sync to QF Notes API."""
    return {"success": True, "data": {}}

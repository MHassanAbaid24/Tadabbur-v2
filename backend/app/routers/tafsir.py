"""Tafsir endpoint router — fetches Ibn Kathir tafsir from QF API."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/{verse_key}")
async def get_tafsir(verse_key: str) -> dict:
    """TODO: Fetch tafsir for a specific verse from QF Tafsir API."""
    return {"success": True, "data": {}}

"""Tafsir endpoint router — fetches Ibn Kathir tafsir from QF API."""

from fastapi import APIRouter, HTTPException
from app.services.qf_content import get_tafsir_by_key

router = APIRouter()


@router.get("/{verse_key}")
async def get_tafsir(verse_key: str):
    """Fetch tafsir for a specific verse from QF Tafsir API."""
    tafsir_text = await get_tafsir_by_key(verse_key)
    if not tafsir_text:
        raise HTTPException(status_code=404, detail="Tafsir not found")
    return {"success": True, "data": {"tafsir": tafsir_text, "verse_key": verse_key}}

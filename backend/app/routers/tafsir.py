"""Tafsir endpoint router — fetches Ibn Kathir tafsir from QF API."""

import logging
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse

from app.auth.jwt import get_current_user
from app.services.qf_content import get_tafsir_by_key
from app.models.schemas import APIResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/{verse_key}", response_model=APIResponse)
async def get_tafsir(
    verse_key: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> APIResponse:
    """
    Fetch tafsir (Ibn Kathir) for a specific verse from QF Tafsir API.

    Args:
        verse_key: Format "chapter:verse" (e.g., "2:255")
        current_user: Current authenticated user (injected by get_current_user)

    Returns:
        APIResponse with tafsir text and verse_key

    Raises:
        HTTPException(400): Invalid verse_key format
        HTTPException(401): Invalid or missing token
        HTTPException(404): Tafsir not found for verse
        HTTPException(503): QF API error
    """
    logger.debug("Fetching tafsir for verse %s by user %s", verse_key, current_user["sub"])

    tafsir_text = await get_tafsir_by_key(verse_key)
    if not tafsir_text:
        logger.warning("Tafsir not found for verse: %s", verse_key)
        raise HTTPException(status_code=404, detail="Tafsir not found for this verse")

    logger.info("Served tafsir for verse %s", verse_key)

    response = APIResponse(success=True, data={"tafsir": tafsir_text, "verse_key": verse_key})
    return JSONResponse(
        content=response.dict(),
        headers={"Cache-Control": "private, max-age=3600"},
    )

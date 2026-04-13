"""AI-powered reflection suggestions via OpenRouter."""

import logging
from typing import Optional

from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger(__name__)

openrouter_client = AsyncOpenAI(
    api_key=settings.openrouter_api_key,
    base_url=settings.openrouter_base_url,
    default_headers={
        "HTTP-Referer": settings.frontend_url,
        "X-Title": "Tadabbur",
    },
)


async def generate_action_suggestion(
    verse_translation: str,
    prompt_1: str,
    prompt_2: str,
) -> Optional[str]:
    """
    Generate a personalized action suggestion using AI.

    Calls OpenRouter to suggest one practical action the user can take today
    based on their reflection. Response is non-blocking: if AI fails, returns None.

    Args:
        verse_translation: English translation of today's verse
        prompt_1: User's answer to "What does this mean to you?"
        prompt_2: User's intended action based on verse

    Returns:
        Suggested action string (max 2 sentences), or None if API fails
    """
    system_prompt = (
        "You are a gentle Islamic reflection companion. Based on a user's personal "
        "reflection on a Quranic verse, suggest one specific, practical action they "
        "can take today that aligns with the verse's guidance.\n\n"
        "Rules:\n"
        "- Concrete and achievable within 24 hours\n"
        "- Ground it in the user's own words\n"
        "- Under 2 sentences\n"
        "- Warm, never preachy\n"
        "- Good examples: 'call your parents', 'give something to charity today'\n"
        "- Do NOT quote the Quran or add Islamic phrases\n"
        "- Respond in the same language the user wrote in"
    )

    user_prompt = (
        f"Verse: {verse_translation}\n"
        f"User's reflection: \"{prompt_1}\"\n"
        f"User's intended action: \"{prompt_2}\"\n"
        f"Suggest one additional specific action they could take today."
    )

    try:
        response = await openrouter_client.chat.completions.create(
            model=settings.openrouter_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=100,
            temperature=0.7,
        )

        suggestion = response.choices[0].message.content
        logger.debug("Generated AI suggestion (len=%d)", len(suggestion or ""))
        return suggestion

    except Exception as e:
        logger.warning("OpenRouter API call failed (non-blocking): %s", str(e))
        return None

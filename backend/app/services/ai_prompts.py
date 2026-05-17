"""AI-powered reflection suggestions via OpenRouter."""

import json
import logging
from typing import Optional, Tuple

from openai import APIConnectionError, APIError, APITimeoutError, AsyncOpenAI, RateLimitError

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

async def generate_daily_reflection_prompts(
    verse_translation: str,
    verse_tafsir: str,
) -> Optional[Tuple[str, str]]:
    """Generate two context-aware reflection prompts for the daily verse."""
    system_prompt = (
        "You generate two reflective questions for a Quran reflection journal.\n"
        "Return strictly valid JSON with shape: "
        '{"prompt_1":"...","prompt_2":"..."}.\n'
        "Rules:\n"
        "- Questions must be practical and personal\n"
        "- Keep each question under 140 characters\n"
        "- Do not include markdown, numbering, or extra keys\n"
        "- Use the same language as the verse translation"
    )
    user_prompt = (
        f"Verse translation: {verse_translation}\n"
        f"Tafsir snippet: {verse_tafsir}\n"
        "Generate two reflection questions."
    )

    try:
        response = await openrouter_client.chat.completions.create(
            model=settings.openrouter_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=180,
            temperature=0.4,
        )
        content = response.choices[0].message.content or ""
        parsed = json.loads(content)
        prompt_1 = str(parsed["prompt_1"]).strip()
        prompt_2 = str(parsed["prompt_2"]).strip()
        if not prompt_1 or not prompt_2:
            return None
        return prompt_1, prompt_2
    except (APIError, APIConnectionError, APITimeoutError, RateLimitError, json.JSONDecodeError, KeyError, TypeError):
        logger.warning("OpenRouter daily prompt generation failed")
        return None


async def generate_action_suggestion(
    verse_translation: str,
    prompt_1: str,
    prompt_2: str,
) -> Optional[str]:
    """
    Generate a personalized, Islamic-aligned action suggestion using AI.

    Calls OpenRouter to suggest one practical action the user can take today
    based on their reflection, with strict guardrails to ensure all suggestions
    are aligned with Islamic principles (never fatwas, never harmful advice).
    Response is non-blocking: if AI fails, returns None.

    SAFETY GUARANTEES:
    - AI is constrained to suggest only universally-accepted Islamic practices
      (Dhikr like Astaghfirullah, simple acts of goodness)
    - AI cannot issue fatwas, theological rulings, or invent practices
    - If generation fails or violates guardrails, gracefully returns None

    Args:
        verse_translation: English translation of today's verse
        prompt_1: User's answer to "What does this mean to you?"
        prompt_2: User's intended action based on verse

    Returns:
        Suggested action string (1-2 sentences), or None if API fails or guardrails violated
    """
    system_prompt = (
        "You are a gentle, Islamic reflection companion following the Quran and Sunnah. "
        "Your role is to suggest one specific, practical action the user can take today "
        "to embody their reflection on a Quranic verse.\n\n"
        "CONSTRAINT 1 (Safety):\n"
        "- Never issue fatwas, theological rulings, or invent religious practices\n"
        "- Never suggest anything contrary to the fundamentals of Islam\n"
        "- Do NOT engage in theological debate\n\n"
        "CONSTRAINT 2 (Practicality):\n"
        "- Suggest ONE specific, practical, and highly achievable action\n"
        "- Concrete and achievable within 24 hours\n"
        "- Ground it directly in the user's own words and reflection\n\n"
        "CONSTRAINT 3 (Content):\n"
        "- You MAY suggest universally accepted forms of Dhikr if highly relevant:\n"
        "  * Saying 'Astaghfirullah' (seeking forgiveness)\n"
        "  * Saying 'Alhamdulillah' (praising Allah)\n"
        "  * Making Dua (supplication)\n"
        "  * Sending Salawat upon the Prophet (ﷺ)\n"
        "  * Other simple, well-known Athkar\n"
        "- You MAY suggest simple acts of goodness:\n"
        "  * Calling or helping a family member\n"
        "  * Giving charity or kindness\n"
        "  * Personal reflection or prayer time\n"
        "- Do NOT invent practices or make theological claims\n"
        "- NEVER suggest specific numbers or quantities for reciting Athkar (e.g., do not say 'say it 3 times' or 'read 10 times'). Only suggest the action itself.\n\n"
        "CONSTRAINT 4 (Tone & Format):\n"
        "- Keep response to 1-2 sentences maximum\n"
        "- Warm, encouraging, never preachy or judgmental\n"
        "- Respond in the same language the user wrote in\n"
        "- Good examples: 'call your parents', 'say Astaghfirullah today', "
        "'make dua for someone you love'\n"
        "- Bad examples: claiming something is 'haram', inventing new practices, "
        "theological debate"
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


async def generate_weekly_insights(reflections: list[dict[str, str]]) -> Optional[str]:
    """Generate a markdown weekly insight summary from recent reflections."""
    if not reflections:
        return None

    system_prompt = (
        "You are a gentle Islamic reflection companion.\n"
        "Analyze the user's last 7 days of reflection entries and produce markdown.\n"
        "Strict output format:\n"
        "## Recurring Themes\n"
        "- 2-4 concise bullets grounded only in the user's reflections\n"
        "## Signs of Growth\n"
        "- 2-3 concise bullets highlighting progress over the week\n"
        "## Gentle Advice for Next Week\n"
        "- 2-3 practical, warm suggestions based on their own words\n"
        "Rules:\n"
        "- Do not quote Quran text or invent facts outside the provided reflections\n"
        "- Be encouraging, never judgmental or preachy\n"
        "- Keep the full response under 220 words"
    )

    lines = []
    for idx, reflection in enumerate(reflections, start=1):
        lines.append(
            f"{idx}. Date: {reflection.get('date', '')}; Verse: {reflection.get('verse_key', '')}; "
            f"Meaning: {reflection.get('prompt_1_answer', '')}; "
            f"Action: {reflection.get('prompt_2_answer', '')}"
        )
    user_prompt = "Weekly reflections:\n" + "\n".join(lines)

    try:
        response = await openrouter_client.chat.completions.create(
            model=settings.openrouter_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=350,
            temperature=0.5,
        )
        summary = (response.choices[0].message.content or "").strip()
        return summary or None
    except Exception as e:
        logger.warning("OpenRouter weekly insights generation failed: %s", str(e))
        return None

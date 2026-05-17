import asyncio
import os
from app.auth.qf_token import qf_token_manager
from app.services.qf_content import get_verse_by_key, get_tafsir_by_key, get_audio_url

async def main():
    try:
        verse = await get_verse_by_key("68:51")
        print("Verse:", verse)
    except Exception as e:
        print("Verse error:", e)

    try:
        tafsir = await get_tafsir_by_key("68:51")
        print("Tafsir length:", len(tafsir))
    except Exception as e:
        print("Tafsir error:", e)

    try:
        audio = await get_audio_url("68:51")
        print("Audio URL:", audio)
    except Exception as e:
        print("Audio error:", e)

if __name__ == "__main__":
    asyncio.run(main())

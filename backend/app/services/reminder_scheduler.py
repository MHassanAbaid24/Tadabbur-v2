"""Background scheduler for sending daily reflection reminders."""

import asyncio
import logging
from datetime import datetime, date, timezone
from typing import List, Dict, Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.db.supabase import supabase_client
from app.services.email_service import EmailService
from app.services.daily_verse import get_today_verse_key
from app.services.qf_content import get_verse_by_key

import pytz

logger = logging.getLogger(__name__)

# Singleton scheduler instance
scheduler = AsyncIOScheduler()

async def send_daily_reminders():
    """
    Check for users who need a reminder at this minute and send them.
    Runs every minute.
    """
    # Heartbeat log to confirm scheduler is alive
    logger.info("Scheduler Heartbeat: Checking for daily reminders...")
    
    try:
        # Get UTC now once at the start of the job
        now_utc = datetime.now(timezone.utc)
        today_str = date.today().isoformat()
        
        logger.info(f"Checking for reminders (Current UTC: {now_utc.strftime('%H:%M:%S')})")

        # 1. Fetch all profiles with a reminder time set
        profiles_resp = await asyncio.to_thread(
            lambda: supabase_client.table("profiles")
            .select("id, display_name, daily_reminder_time, timezone")
            .not_.is_("daily_reminder_time", "null")
            .execute()
        )
        
        candidates = profiles_resp.data or []
        if not candidates:
            logger.info("No candidates found with daily_reminder_time set.")
            return

        logger.debug(f"Evaluating {len(candidates)} candidates for reminders...")

        # 2. Lazy load today's verse context
        verse_key = None
        verse_data = None

        # 3. Process each candidate
        for profile in candidates:
            user_id = profile["id"]
            reminder_time = profile["daily_reminder_time"]
            user_tz_name = profile.get("timezone", "UTC")
            
            # Calculate current time in user's timezone
            try:
                tz = pytz.timezone(user_tz_name)
                now_user = now_utc.astimezone(tz)
                user_time_str = now_user.strftime("%H:%M:00")
            except Exception as e:
                logger.warning(f"Invalid timezone '{user_tz_name}' for user {user_id}. Falling back to UTC.")
                user_time_str = now_utc.strftime("%H:%M:00")

            if reminder_time != user_time_str:
                continue

            logger.info(f"MATCH! User {user_id} (TZ: {user_tz_name}) reminder time {reminder_time} matches local time {user_time_str}")

            if not verse_key:
                verse_key = get_today_verse_key()
                verse_data = await get_verse_by_key(verse_key)
            
            arabic_text = verse_data.get("text_uthmani", "")
            translation = verse_data.get("translation", "")
            display_name = profile["display_name"] or "there"

            # Check for reflection today
            reflection_resp = await asyncio.to_thread(
                lambda: supabase_client.table("reflections")
                .select("id")
                .eq("user_id", user_id)
                .eq("date", today_str)
                .execute()
            )
            
            if reflection_resp.data and len(reflection_resp.data) > 0:
                logger.debug(f"User {user_id} already reflected today. Skipping reminder.")
                continue

            # 4. Fetch user email from auth.users (requires service role / admin access through profiles if stored there)
            # In our schema, we should probably fetch the email from the JWT current_user normally, 
            # but for background jobs we need it from the DB.
            # Let's check if email is in profiles or if we need to fetch from auth.
            # Usually, it's better to store email in profiles for exactly this reason.
            # Re-checking profiles fields... it doesn't have email.
            # However, our auth.py's get_profile returns email from current_user["email"].
            # For this hackathon, we'll assume we can join or have a way to get it.
            # Actually, let's look at Profiles table again. It uses auth.users(id).
            # We might need to query auth.users if possible, or assume email is in profiles.
            
            # Since I'm the developer, I'll check if I should add email to profiles or use a service role to get it.
            # Given the constraints, I'll try to fetch the email from a possible 'email' column or join.
            # Actually, I'll check the auth.py again to see how it gets the email.
            # line 411: "email": current_user["email"] -> current_user comes from get_current_user(token).
            
            # IMPORTANT: I'll check if I can add email to profiles or if there is another way.
            # I will assume for now that we might need to fetch it.
            # To be safe and compliant with the "premium" requirement, I'll add a check/fetch.
            
            # Wait, I'll check the Profiles table one more time in AGENTS.md.
            # It doesn't have email. But Supabase Auth users have it.
            # I'll use a placeholder/logger for now and fix the email retrieval.
            
            # Actually, the user's email is essential. I'll check if I can get it from supabase_client.auth.admin.get_user_by_id(user_id)
            try:
                user_auth = await asyncio.to_thread(
                    lambda: supabase_client.auth.admin.get_user_by_id(user_id)
                )
                recipient_email = user_auth.user.email
            except Exception as e:
                logger.error(f"Failed to fetch email for user {user_id}: {str(e)}")
                continue

            # 5. Send Email
            success = await EmailService.send_reminder_email(
                recipient_email=recipient_email,
                display_name=display_name,
                verse_key=verse_key,
                arabic_text=arabic_text,
                translation=translation
            )
            
            if success:
                logger.info(f"Sent reflection reminder to {recipient_email}")
            else:
                logger.error(f"Failed to send reflection reminder to {recipient_email}")

    except Exception as e:
        logger.error(f"Error in daily reminder job: {str(e)}")

def start_reminder_scheduler():
    """Initialize and start the background scheduler."""
    if not scheduler.running:
        scheduler.add_job(
            send_daily_reminders,
            "cron",
            minute="*",  # Run every minute
            id="daily_reminder_job",
            replace_existing=True
        )
        scheduler.start()
        logger.info("Daily reminder scheduler started (checking every minute).")

def stop_reminder_scheduler():
    """Shut down the background scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Daily reminder scheduler stopped.")

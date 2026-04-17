from supabase import create_client, create_async_client

from app.config import settings

supabase_client = create_client(settings.supabase_url, settings.supabase_service_key)
async_supabase_client = create_async_client(settings.supabase_url, settings.supabase_service_key)

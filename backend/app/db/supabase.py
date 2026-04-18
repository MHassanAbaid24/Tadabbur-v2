from typing import Optional
from supabase import create_client, create_async_client, Client
from supabase._async.client import AsyncClient

from app.config import settings

# Sync client can be initialized at top level
supabase_client: Client = create_client(settings.supabase_url, settings.supabase_service_key)

_async_supabase_client: Optional[AsyncClient] = None

async def get_async_supabase_client() -> AsyncClient:
    """Lazy initializer for async Supabase client to avoid top-level await issues."""
    global _async_supabase_client
    if _async_supabase_client is None:
        _async_supabase_client = await create_async_client(
            settings.supabase_url, 
            settings.supabase_service_key
        )
    return _async_supabase_client

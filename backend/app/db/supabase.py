import threading
from typing import Any, Optional
from supabase import create_client, create_async_client, Client
from supabase._async.client import AsyncClient

from app.config import settings

class ThreadLocalSupabaseProxy:
    """
    A thread-safe proxy for the sync Supabase Client.
    Since FastAPI handles async requests concurrently, using a single global
    sync httpx.Client instance across multiple asyncio.to_thread calls results
    in concurrent connection pool access, causing ConnectionTerminated and timeout errors.
    This proxy ensures each thread has its own sync Client instance.
    """
    def __init__(self):
        self._local = threading.local()

    def _get_client(self) -> Client:
        if not hasattr(self._local, "client"):
            self._local.client = create_client(
                settings.supabase_url, 
                settings.supabase_service_key
            )
        return self._local.client

    def __getattr__(self, name: str) -> Any:
        return getattr(self._get_client(), name)

# Preserve the exact signature and types for import compatibility
supabase_client: Client = ThreadLocalSupabaseProxy()  # type: ignore

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

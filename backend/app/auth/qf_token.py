"""Thread-safe OAuth2 Client Credentials token manager for QF Content APIs."""

import asyncio
import logging
import time
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Shared httpx.AsyncClient for token requests
_token_http_client: Optional[httpx.AsyncClient] = None


def _get_token_http_client() -> httpx.AsyncClient:
    """Get or create the shared httpx.AsyncClient for token requests."""
    global _token_http_client
    if _token_http_client is None or _token_http_client.is_closed:
        _token_http_client = httpx.AsyncClient(timeout=10.0)
    return _token_http_client


class QFTokenManager:
    """
    Async-safe OAuth2 Client Credentials token manager.
    Caches token, re-requests 30s before expiry, prevents concurrent stampede.
    Client Credentials has NO refresh token — always re-request from scratch.
    """

    def __init__(self) -> None:
        self._token: Optional[str] = None
        self._expires_at: float = 0.0
        self._lock = asyncio.Lock()
        self._buffer_seconds: int = 30

    def _is_valid(self) -> bool:
        """Check if cached token is valid."""
        return (
            self._token is not None
            and time.time() < self._expires_at - self._buffer_seconds
        )

    async def _fetch_new_token(self) -> str:
        """Fetch a new token from QF OAuth2 endpoint."""
        try:
            logger.debug("Fetching new QF token from %s", settings.qf_auth_base_url)
            client = _get_token_http_client()
            response = await client.post(
                f"{settings.qf_auth_base_url}/oauth2/token",
                auth=(settings.qf_client_id, settings.qf_client_secret),
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data="grant_type=client_credentials&scope=content",
            )
            response.raise_for_status()
        except httpx.HTTPError as e:
            status_code = getattr(e, "response", None) and e.response.status_code or "N/A"
            logger.error("QF token fetch failed (status=%s): %s", status_code, str(e))
            raise RuntimeError(f"QF token fetch failed: {str(e)}") from e

        data = response.json()
        self._token = data["access_token"]
        self._expires_at = time.time() + data["expires_in"]
        logger.info("QF token refreshed, expires in %d seconds", data["expires_in"])
        return self._token

    async def get_token(self) -> str:
        """Get a valid token, fetching a new one if needed (stampede-safe)."""
        if self._is_valid():
            return self._token  # type: ignore

        async with self._lock:
            # Double-check after acquiring lock
            if self._is_valid():
                return self._token  # type: ignore
            return await self._fetch_new_token()

    def clear(self) -> None:
        """Clear the cached token (forces re-request on next call)."""
        self._token = None
        self._expires_at = 0.0


qf_token_manager = QFTokenManager()

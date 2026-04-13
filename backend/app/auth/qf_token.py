"""Thread-safe OAuth2 Client Credentials token manager for QF Content APIs."""

import logging
import time
import threading
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class QFTokenManager:
    """
    Thread-safe OAuth2 Client Credentials token manager.
    Caches token, re-requests 30s before expiry, prevents concurrent stampede.
    Client Credentials has NO refresh token — always re-request from scratch.
    """

    def __init__(self) -> None:
        self._token: Optional[str] = None
        self._expires_at: float = 0.0
        self._lock = threading.Lock()
        self._buffer_seconds: int = 30

    def _is_valid(self) -> bool:
        """Check if cached token is valid."""
        return (
            self._token is not None
            and time.time() < self._expires_at - self._buffer_seconds
        )

    def _fetch_new_token(self) -> str:
        """Fetch a new token from QF OAuth2 endpoint."""
        try:
            logger.debug("Fetching new QF token from %s", settings.qf_auth_base_url)
            response = httpx.post(
                f"{settings.qf_auth_base_url}/oauth2/token",
                auth=(settings.qf_client_id, settings.qf_client_secret),
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data="grant_type=client_credentials&scope=content",
                timeout=10,
            )
            response.raise_for_status()
        except httpx.HTTPError as e:
            logger.error("QF token fetch failed: %s", response.status_code if hasattr(e, 'response') else str(e))
            raise RuntimeError(f"QF token fetch failed: {str(e)}") from e
        
        data = response.json()
        self._token = data["access_token"]
        self._expires_at = time.time() + data["expires_in"]
        logger.info("QF token refreshed, expires in %d seconds", data["expires_in"])
        return self._token

    def get_token(self) -> str:
        """Get a valid token, fetching a new one if needed (thread-safe)."""
        if self._is_valid():
            return self._token  # type: ignore

        with self._lock:
            if self._is_valid():
                return self._token  # type: ignore
            return self._fetch_new_token()

    def clear(self) -> None:
        """Clear the cached token (forces re-request on next call)."""
        with self._lock:
            self._token = None
            self._expires_at = 0.0


qf_token_manager = QFTokenManager()

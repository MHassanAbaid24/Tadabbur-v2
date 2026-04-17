"""Tests for QF token manager caching and expiry logic."""

import time

import pytest

from app.auth.qf_token import QFTokenManager


@pytest.mark.asyncio
async def test_token_is_cached() -> None:
    """Second call returns same token — no extra HTTP request."""
    manager = QFTokenManager()
    manager._token = "fake_token_12345_very_long"
    manager._expires_at = time.time() + 3600

    token1 = await manager.get_token()
    token2 = await manager.get_token()

    assert token1 == token2
    assert token1 is not None and len(token1) > 20


def test_token_cleared_on_demand() -> None:
    """After clear(), next call forces re-request."""
    manager = QFTokenManager()
    manager._token = "fake_token"
    manager._expires_at = time.time() + 3600

    manager.clear()
    assert manager._token is None
    
    # Would normally re-request here, but we can't without credentials
    # Just verify it was cleared


def test_token_invalid_within_buffer() -> None:
    """Token marked invalid when within 30s of expiry."""
    manager = QFTokenManager()
    manager._token = "fake_token"
    manager._expires_at = time.time() + 20  # 20s left < 30s buffer

    assert not manager._is_valid()


def test_token_valid_when_fresh() -> None:
    """Token valid when well before expiry."""
    manager = QFTokenManager()
    manager._token = "fake_token"
    manager._expires_at = time.time() + 3600

    assert manager._is_valid()


"""Unit tests for QF User OAuth2 Authorization Code flow."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timedelta

from app.auth.qf_user_auth import (
    get_qf_authorization_url,
    exchange_code_for_token,
    store_user_qf_token,
    get_user_qf_token,
)
from app.config import settings


def test_qf_authorization_url_structure() -> None:
    """Test that authorization URL contains all required parameters."""
    state = "test_state_token_123"
    url = get_qf_authorization_url(state)

    assert "response_type=code" in url
    assert f"client_id={settings.qf_client_id}" in url
    assert "redirect_uri=" in url
    assert f"state={state}" in url
    assert "streak" in url
    assert "note" in url


def test_qf_authorization_url_uses_correct_env() -> None:
    """Test that authorization URL uses correct environment based on QF_ENV."""
    state = "test_state"
    url = get_qf_authorization_url(state)

    if settings.qf_env == "production":
        assert "oauth2.quran.foundation" in url
    else:
        assert "prelive-oauth2.quran.foundation" in url


@pytest.mark.asyncio
async def test_exchange_code_for_token_success() -> None:
    """Test successful code exchange (mocked HTTP response)."""
    code = "auth_code_12345"

    mock_response = {
        "access_token": "token_abc123",
        "expires_in": 3600,
        "token_type": "Bearer",
    }

    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client = MagicMock()
        mock_response_obj = MagicMock()
        mock_response_obj.status_code = 200
        mock_response_obj.json.return_value = mock_response
        mock_response_obj.raise_for_status.return_value = None

        # Configure the async context manager
        mock_client.post = AsyncMock(return_value=mock_response_obj)
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None

        mock_client_class.return_value.__aenter__.return_value = mock_client
        mock_client_class.return_value.__aexit__.return_value = None

        result = await exchange_code_for_token(code)

        assert result["access_token"] == "token_abc123"
        assert result["expires_in"] == 3600
        assert result["token_type"] == "Bearer"


@pytest.mark.asyncio
async def test_exchange_code_for_token_failure() -> None:
    """Test code exchange failure raises HTTPException."""
    from fastapi import HTTPException

    code = "invalid_code"

    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client = MagicMock()
        mock_response_obj = MagicMock()
        mock_response_obj.status_code = 400
        mock_response_obj.json.return_value = {"error": "invalid_code"}
        import httpx
        mock_response_obj.raise_for_status.side_effect = httpx.HTTPError("Bad request")

        mock_client.post = AsyncMock(return_value=mock_response_obj)
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None

        mock_client_class.return_value.__aenter__.return_value = mock_client
        mock_client_class.return_value.__aexit__.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await exchange_code_for_token(code)

        assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_store_user_qf_token_success() -> None:
    """Test successful token storage in database (mocked)."""
    user_id = "user_uuid_123"
    token_data = {
        "access_token": "token_xyz789",
        "expires_in": 3600,
        "token_type": "Bearer",
    }

    with patch("app.db.supabase.supabase_client") as mock_supabase:
        mock_update = MagicMock()
        mock_update.eq.return_value.execute.return_value = MagicMock()

        mock_supabase.table.return_value.update.return_value = mock_update

        await store_user_qf_token(user_id, token_data)

        mock_supabase.table.assert_called_once_with("profiles")
        assert mock_update.eq.called


@pytest.mark.asyncio
async def test_get_user_qf_token_with_test_fallback() -> None:
    """Test that test token is returned when configured."""
    user_id = "user_uuid_123"

    with patch("app.auth.qf_user_auth.settings") as mock_settings:
        mock_settings.qf_test_user_token = "test_token_hardcoded"

        token = await get_user_qf_token(user_id)

        assert token == "test_token_hardcoded"


@pytest.mark.asyncio
async def test_get_user_qf_token_not_connected() -> None:
    """Test that 403 is raised when user has no QF token."""
    from fastapi import HTTPException

    user_id = "user_uuid_123"

    with patch("app.auth.qf_user_auth.settings") as mock_settings:
        mock_settings.qf_test_user_token = None

        with patch("app.db.supabase.supabase_client") as mock_supabase:
            mock_execute = MagicMock()
            mock_supabase.table.return_value.select.return_value.eq.return_value.execute = mock_execute
            mock_execute.return_value.data = [
                {"id": user_id, "qf_access_token": None, "qf_token_expires_at": None}
            ]

            with pytest.raises(HTTPException) as exc_info:
                await get_user_qf_token(user_id)

            assert exc_info.value.status_code == 403
            assert "NOT_CONNECTED" in exc_info.value.detail


@pytest.mark.asyncio
async def test_get_user_qf_token_expired() -> None:
    """Test that 403 is raised when user's token is expired."""
    from fastapi import HTTPException

    user_id = "user_uuid_123"
    expired_time = (datetime.utcnow() - timedelta(hours=1)).isoformat()

    with patch("app.auth.qf_user_auth.settings") as mock_settings:
        mock_settings.qf_test_user_token = None

        with patch("app.db.supabase.supabase_client") as mock_supabase:
            mock_execute = MagicMock()
            mock_supabase.table.return_value.select.return_value.eq.return_value.execute = mock_execute
            mock_execute.return_value.data = [
                {
                    "id": user_id,
                    "qf_access_token": "old_token",
                    "qf_token_expires_at": expired_time,
                }
            ]

            with pytest.raises(HTTPException) as exc_info:
                await get_user_qf_token(user_id)

            assert exc_info.value.status_code == 403
            assert "expired" in exc_info.value.detail


@pytest.mark.asyncio
async def test_get_user_qf_token_valid() -> None:
    """Test successful retrieval of valid QF token."""
    user_id = "user_uuid_123"
    valid_token = "valid_token_abc"
    future_time = (datetime.utcnow() + timedelta(hours=1)).isoformat()

    with patch("app.auth.qf_user_auth.settings") as mock_settings:
        mock_settings.qf_test_user_token = None

        with patch("app.db.supabase.supabase_client") as mock_supabase:
            mock_execute = MagicMock()
            mock_supabase.table.return_value.select.return_value.eq.return_value.execute = mock_execute
            mock_execute.return_value.data = [
                {
                    "id": user_id,
                    "qf_access_token": valid_token,
                    "qf_token_expires_at": future_time,
                }
            ]

            token = await get_user_qf_token(user_id)

            assert token == valid_token

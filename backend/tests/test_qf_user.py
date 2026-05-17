"""Unit tests for QF User API service layer (_qf_user_get, _qf_user_post, helpers)."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import HTTPException

from app.services.qf_user import (
    _qf_user_get,
    _qf_user_post,
    get_streaks,
    log_activity_day,
    get_notes,
    create_note,
    create_reading_session,
)


@pytest.mark.asyncio
async def test_qf_user_get_success() -> None:
    """Test successful GET request to QF User API."""
    user_id = "user_uuid_123"
    path = "streaks"
    mock_response = {"current": 5, "longest": 10}

    with patch("app.services.qf_user.get_user_qf_token", new_callable=AsyncMock) as mock_token:
        mock_token.return_value = "valid_token_123"

        with patch("app.services.qf_user._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_response_obj = MagicMock()
            mock_response_obj.status_code = 200
            mock_response_obj.json.return_value = mock_response
            mock_response_obj.raise_for_status.return_value = None

            mock_client.get = AsyncMock(return_value=mock_response_obj)
            mock_get_client.return_value = mock_client

            result = await _qf_user_get(user_id, path)

            assert result == mock_response
            mock_token.assert_called_once_with(user_id)


@pytest.mark.asyncio
async def test_qf_user_get_unauthorized() -> None:
    """Test GET request with expired token (401)."""
    user_id = "user_uuid_123"
    path = "streaks"

    with patch("app.services.qf_user.get_user_qf_token", new_callable=AsyncMock) as mock_token:
        mock_token.return_value = "expired_token"

        with patch("app.services.qf_user._get_http_client") as mock_get_client:
            with patch("app.db.supabase.supabase_client") as mock_supabase:
                mock_update = MagicMock()
                mock_supabase.table.return_value = mock_update
                mock_update.update.return_value.eq.return_value.execute.return_value = MagicMock()

                mock_client = MagicMock()
                mock_response_obj = MagicMock()
                mock_response_obj.status_code = 401
                mock_response_obj.json.return_value = {"error": "token_expired"}

                mock_client.get = AsyncMock(return_value=mock_response_obj)
                mock_get_client.return_value = mock_client

                with pytest.raises(HTTPException) as exc_info:
                    await _qf_user_get(user_id, path)

                assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_qf_user_get_forbidden() -> None:
    """Test GET request with insufficient scope (403)."""
    user_id = "user_uuid_123"
    path = "streaks"

    with patch("app.services.qf_user.get_user_qf_token", new_callable=AsyncMock) as mock_token:
        mock_token.return_value = "valid_token"

        with patch("app.services.qf_user._get_http_client") as mock_get_client:
            with patch("app.db.supabase.supabase_client") as mock_supabase:
                mock_update = MagicMock()
                mock_supabase.table.return_value = mock_update
                mock_update.update.return_value.eq.return_value.execute.return_value = MagicMock()

                mock_client = MagicMock()
                mock_response_obj = MagicMock()
                mock_response_obj.status_code = 403
                mock_response_obj.json.return_value = {"error": "insufficient_scope"}

                mock_client.get = AsyncMock(return_value=mock_response_obj)
                mock_get_client.return_value = mock_client

                with pytest.raises(HTTPException) as exc_info:
                    await _qf_user_get(user_id, path)

                assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_qf_user_post_success() -> None:
    """Test successful POST request to QF User API."""
    user_id = "user_uuid_123"
    path = "notes"
    body = {"verse_key": "2:255", "body": "This is beautiful"}
    mock_response = {"id": "note_123", "created_at": "2026-03-20T10:00:00Z"}

    with patch("app.services.qf_user.get_user_qf_token", new_callable=AsyncMock) as mock_token:
        mock_token.return_value = "valid_token_123"

        with patch("app.services.qf_user._get_http_client") as mock_get_client:
            mock_client = MagicMock()
            mock_response_obj = MagicMock()
            mock_response_obj.status_code = 201
            mock_response_obj.json.return_value = mock_response
            mock_response_obj.raise_for_status.return_value = None

            mock_client.post = AsyncMock(return_value=mock_response_obj)
            mock_get_client.return_value = mock_client

            result = await _qf_user_post(user_id, path, body)

            assert result == mock_response
            mock_client.post.assert_called_once()


@pytest.mark.asyncio
async def test_qf_user_post_unauthorized() -> None:
    """Test POST request with expired token (401)."""
    user_id = "user_uuid_123"
    path = "notes"
    body = {"verse_key": "2:255", "body": "Test"}

    with patch("app.services.qf_user.get_user_qf_token", new_callable=AsyncMock) as mock_token:
        mock_token.return_value = "expired_token"

        with patch("app.services.qf_user._get_http_client") as mock_get_client:
            with patch("app.db.supabase.supabase_client") as mock_supabase:
                mock_update = MagicMock()
                mock_supabase.table.return_value = mock_update
                mock_update.update.return_value.eq.return_value.execute.return_value = MagicMock()

                mock_client = MagicMock()
                mock_response_obj = MagicMock()
                mock_response_obj.status_code = 401

                mock_client.post = AsyncMock(return_value=mock_response_obj)
                mock_get_client.return_value = mock_client

                with pytest.raises(HTTPException) as exc_info:
                    await _qf_user_post(user_id, path, body)

                assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_get_streaks_calls_qf_user_get() -> None:
    """Test get_streaks helper calls _qf_user_get with correct path."""
    user_id = "user_uuid_123"
    expected_response = {"current": 7, "longest": 30}

    with patch("app.services.qf_user._qf_user_get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = expected_response

        result = await get_streaks(user_id)

        assert result == expected_response
        mock_get.assert_called_once_with(user_id, "streaks")


@pytest.mark.asyncio
async def test_log_activity_day_calls_qf_user_post() -> None:
    """Test log_activity_day helper calls _qf_user_post with correct path and body."""
    user_id = "user_uuid_123"
    date = "2026-03-20"
    expected_response = {"date": date, "logged": True}

    with patch("app.services.qf_user._qf_user_post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = expected_response

        # log_activity_day returns None and catches exceptions
        result = await log_activity_day(user_id, date)

        assert result is None
        mock_post.assert_called_once_with(user_id, "activity-days", {"date": date})


@pytest.mark.asyncio
async def test_get_notes_without_verse_key() -> None:
    """Test get_notes helper without verse_key filter."""
    user_id = "user_uuid_123"
    expected_response = {"notes": [{"id": "note_1", "body": "Reflection 1"}]}

    with patch("app.services.qf_user._qf_user_get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = expected_response

        result = await get_notes(user_id)

        assert result == expected_response
        mock_get.assert_called_once_with(user_id, "notes", {})


@pytest.mark.asyncio
async def test_get_notes_with_verse_key() -> None:
    """Test get_notes helper with verse_key filter."""
    user_id = "user_uuid_123"
    verse_key = "2:255"
    expected_response = {"notes": [{"id": "note_1", "verse_key": verse_key}]}

    with patch("app.services.qf_user._qf_user_get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = expected_response

        result = await get_notes(user_id, verse_key=verse_key)

        assert result == expected_response
        mock_get.assert_called_once_with(user_id, "notes", {"verse_key": verse_key})


@pytest.mark.asyncio
async def test_create_note_with_tags() -> None:
    """Test create_note helper with tags."""
    user_id = "user_uuid_123"
    verse_key = "2:255"
    body = "This verse teaches patience"
    tags = ["tadabbur", "patience"]
    expected_response = {"id": "note_123", "verse_key": verse_key, "tags": tags}

    with patch("app.services.qf_user._qf_user_post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = expected_response

        result = await create_note(user_id, verse_key, body, tags=tags)

        assert result == expected_response
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert call_args[0][:2] == (user_id, "notes")
        assert call_args[0][2]["verse_key"] == verse_key
        assert call_args[0][2]["tags"] == tags


@pytest.mark.asyncio
async def test_create_reading_session() -> None:
    """Test create_reading_session helper."""
    user_id = "user_uuid_123"
    verse_key = "2:255"
    expected_response = {"id": "session_123", "verse_key": verse_key}

    with patch("app.services.qf_user._qf_user_post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = expected_response

        result = await create_reading_session(user_id, verse_key)

        assert result == expected_response
        mock_post.assert_called_once_with(user_id, "reading-sessions", {"verse_key": verse_key})

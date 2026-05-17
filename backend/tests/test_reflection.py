"""Unit tests for reflection submission endpoint."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import date

from fastapi import HTTPException

# Test data
SAMPLE_REFLECTION = {
    "verse_key": "2:255",
    "prompt_1_answer": "This verse shows that only Allah has complete knowledge.",
    "prompt_2_answer": "I will stop worrying about things outside my control today.",
    "mood": "peaceful",
    "is_shared": False,
}

SAMPLE_REFLECTION_SHARED = {
    **SAMPLE_REFLECTION,
    "is_shared": True,
    "circle_id": "circle_uuid_123",
}


@pytest.fixture(autouse=True)
def mock_background_tasks():
    with patch("app.routers.reflection.log_activity_day", new_callable=AsyncMock) as mock_log, \
         patch("app.routers.reflection.create_reading_session", new_callable=AsyncMock) as mock_session:
        yield mock_log, mock_session


@pytest.mark.asyncio
async def test_submit_reflection_saves_to_supabase() -> None:
    """Test that reflection is saved to Supabase."""
    from app.routers.reflection import submit_reflection, ReflectionSubmitRequest
    from app.models.schemas import APIResponse

    current_user = {"sub": "user_uuid_123", "email": "user@example.com"}
    req = ReflectionSubmitRequest(**SAMPLE_REFLECTION)

    with patch("app.routers.reflection.supabase_client") as mock_supabase:
        with patch("app.routers.reflection.get_verse_by_key", new_callable=AsyncMock) as mock_verse:
            with patch("app.routers.reflection.create_qf_note", new_callable=AsyncMock) as mock_note:
                with patch("app.routers.reflection.get_streaks", new_callable=AsyncMock) as mock_streaks:
                    mock_verse.return_value = {"translation": "Your Lord encompasses all things in knowledge", "text_uthmani": "Arabic text Uthmani"}
                    mock_note.return_value = "note_uuid_123"
                    mock_streaks.return_value = {"current_streak": 1, "longest_streak": 1}

                    # Mock Supabase checks
                    mock_existing = MagicMock()
                    mock_existing.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []

                    mock_insert = MagicMock()
                    mock_insert_result = MagicMock()
                    mock_insert_result.data = [{"id": "reflection_uuid_123"}]
                    mock_insert.insert.return_value.execute.return_value = mock_insert_result

                    mock_supabase.table.side_effect = [mock_existing, mock_insert, mock_insert, MagicMock(), MagicMock(), MagicMock(), MagicMock()]

                    result = await submit_reflection(req, current_user)

                    assert result.success
                    assert result.data["verse_key"] == "2:255"
                    assert result.data["id"] == "reflection_uuid_123"
                    assert result.data["xp_earned"] == 10


@pytest.mark.asyncio
async def test_submit_syncs_to_qf_notes() -> None:
    """Test that reflection syncs to QF Notes API (qf_note_id stored)."""
    from app.routers.reflection import submit_reflection, ReflectionSubmitRequest

    current_user = {"sub": "user_uuid_123", "email": "user@example.com"}
    req = ReflectionSubmitRequest(**SAMPLE_REFLECTION)

    with patch("app.routers.reflection.supabase_client") as mock_supabase:
        with patch("app.routers.reflection.get_verse_by_key", new_callable=AsyncMock) as mock_verse:
            with patch("app.routers.reflection.create_qf_note", new_callable=AsyncMock) as mock_note:
                with patch("app.routers.reflection.get_streaks", new_callable=AsyncMock):
                    mock_verse.return_value = {"translation": "Mock translation", "text_uthmani": "Arabic text Uthmani"}
                    mock_note.return_value = "qf_note_id_123"

                    mock_existing = MagicMock()
                    mock_existing.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []

                    mock_insert = MagicMock()
                    mock_insert_result = MagicMock()
                    mock_insert_result.data = [{"id": "reflection_uuid_123"}]
                    mock_insert.insert.return_value.execute.return_value = mock_insert_result

                    mock_supabase.table.side_effect = [mock_existing, mock_insert, mock_insert, MagicMock(), MagicMock(), MagicMock(), MagicMock()]

                    result = await submit_reflection(req, current_user)

                    assert result.success
                    assert result.data["qf_note_id"] == "qf_note_id_123"


@pytest.mark.asyncio
async def test_submit_second_reflection_same_day_returns_409() -> None:
    """Test that submitting twice same day returns 409."""
    from app.routers.reflection import submit_reflection, ReflectionSubmitRequest

    current_user = {"sub": "user_uuid_123", "email": "user@example.com"}
    req = ReflectionSubmitRequest(**SAMPLE_REFLECTION)

    with patch("app.routers.reflection.supabase_client") as mock_supabase:
        with patch("app.routers.reflection.get_verse_by_key", new_callable=AsyncMock) as mock_verse, \
             patch("app.routers.reflection.create_qf_note", new_callable=AsyncMock) as mock_note, \
             patch("app.routers.reflection.get_streaks", new_callable=AsyncMock) as mock_streaks:
            
            mock_verse.return_value = {"translation": "Mock translation", "text_uthmani": "Arabic text Uthmani"}
            mock_note.return_value = "note_uuid_123"
            mock_streaks.return_value = {"current_streak": 1, "longest_streak": 1}

            mock_existing = MagicMock()
            mock_existing.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
                {"id": "existing_reflection_uuid", "prompt_1_answer": SAMPLE_REFLECTION["prompt_1_answer"]}
            ]

            mock_supabase.table.return_value = mock_existing

            with pytest.raises(HTTPException) as exc_info:
                await submit_reflection(req, current_user)

            assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_shared_reflection_creates_qf_post() -> None:
    """Test that is_shared=True creates QF Post and stores qf_post_id."""
    from app.routers.reflection import submit_reflection, ReflectionSubmitRequest

    current_user = {"sub": "user_uuid_123", "email": "user@example.com"}
    req = ReflectionSubmitRequest(**SAMPLE_REFLECTION_SHARED)

    with patch("app.routers.reflection.supabase_client") as mock_supabase:
        with patch("app.routers.reflection.get_verse_by_key", new_callable=AsyncMock) as mock_verse:
            with patch("app.routers.reflection.create_qf_note", new_callable=AsyncMock) as mock_note:
                with patch("app.routers.reflection.create_qf_post", new_callable=AsyncMock) as mock_post:
                    with patch("app.routers.reflection.get_streaks", new_callable=AsyncMock):
                        mock_verse.return_value = {"translation": "Mock translation", "text_uthmani": "Arabic text Uthmani"}
                        mock_note.return_value = "note_uuid_123"
                        mock_post.return_value = "post_uuid_456"

                        mock_existing = MagicMock()
                        mock_existing.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []

                        mock_insert = MagicMock()
                        mock_insert_result = MagicMock()
                        mock_insert_result.data = [{"id": "reflection_uuid_123"}]
                        mock_insert.insert.return_value.execute.return_value = mock_insert_result

                        mock_supabase.table.side_effect = [mock_existing, mock_insert, mock_insert, MagicMock(), MagicMock(), MagicMock(), MagicMock()]

                        result = await submit_reflection(req, current_user)

                        assert result.success
                        assert result.data["qf_post_id"] == "post_uuid_456"
                        assert result.data["is_shared"] is True
                        assert result.data["xp_earned"] == 15  # 10 + 5 for sharing


@pytest.mark.asyncio
async def test_private_reflection_has_no_post() -> None:
    """Test that is_shared=False does NOT create QF Post (qf_post_id is None)."""
    from app.routers.reflection import submit_reflection, ReflectionSubmitRequest

    current_user = {"sub": "user_uuid_123", "email": "user@example.com"}
    req = ReflectionSubmitRequest(**SAMPLE_REFLECTION)

    with patch("app.routers.reflection.supabase_client") as mock_supabase:
        with patch("app.routers.reflection.get_verse_by_key", new_callable=AsyncMock) as mock_verse:
            with patch("app.routers.reflection.create_qf_note", new_callable=AsyncMock) as mock_note:
                with patch("app.routers.reflection.create_qf_post", new_callable=AsyncMock) as mock_post:
                    with patch("app.routers.reflection.get_streaks", new_callable=AsyncMock):
                        mock_verse.return_value = {"translation": "Mock translation", "text_uthmani": "Arabic text Uthmani"}
                        mock_note.return_value = "note_uuid_123"
                        mock_existing = MagicMock()
                        mock_existing.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []

                        mock_insert = MagicMock()
                        mock_insert_result = MagicMock()
                        mock_insert_result.data = [{"id": "reflection_uuid_123"}]
                        mock_insert.insert.return_value.execute.return_value = mock_insert_result

                        mock_supabase.table.side_effect = [mock_existing, mock_insert, mock_insert, MagicMock(), MagicMock(), MagicMock(), MagicMock()]

                        result = await submit_reflection(req, current_user)

                        assert result.success
                        assert result.data["qf_post_id"] is None
                        assert result.data["is_shared"] is False
                        mock_post.assert_not_called()


@pytest.mark.asyncio
async def test_invalid_mood_returns_400() -> None:
    """Test that invalid mood returns 400."""
    from app.routers.reflection import submit_reflection, ReflectionSubmitRequest

    current_user = {"sub": "user_uuid_123", "email": "user@example.com"}

    invalid_reflection = {
        **SAMPLE_REFLECTION,
        "mood": "confused",  # Invalid mood
    }
    req = ReflectionSubmitRequest(**invalid_reflection)

    with pytest.raises(HTTPException) as exc_info:
        await submit_reflection(req, current_user)

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_get_today_reflection_not_found() -> None:
    """Test getting today's reflection when not yet submitted."""
    from app.routers.reflection import get_today_reflection

    current_user = {"sub": "user_uuid_123", "email": "user@example.com"}

    with patch("app.routers.reflection.supabase_client") as mock_supabase:
        mock_select = MagicMock()
        mock_select.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = []

        mock_supabase.table.return_value = mock_select

        result = await get_today_reflection(current_user)

        assert result.success
        assert result.data is None


@pytest.mark.asyncio
async def test_get_today_reflection_found() -> None:
    """Test getting today's reflection when it exists."""
    from app.routers.reflection import get_today_reflection

    current_user = {"sub": "user_uuid_123", "email": "user@example.com"}

    mock_reflection = {
        "id": "reflection_uuid_123",
        "verse_key": "2:255",
        "date": date.today().isoformat(),
        "mood": "peaceful",
        "is_shared": False,
        "qf_note_id": "note_123",
        "qf_post_id": None,
        "ai_action_suggestion": "Call your parents today.",
        "xp_earned": 10,
        "prompt_1_answer": "My prompt answer 1",
        "prompt_2_answer": "My prompt answer 2",
    }

    with patch("app.routers.reflection.supabase_client") as mock_supabase:
        mock_select = MagicMock()
        mock_select.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [mock_reflection]

        mock_supabase.table.return_value = mock_select

        result = await get_today_reflection(current_user)

        assert result.success
        assert result.data["verse_key"] == "2:255"
        assert result.data["xp_earned"] == 10


@pytest.mark.asyncio
async def test_get_reflection_history() -> None:
    """Test fetching reflection history."""
    from app.routers.reflection import get_reflection_history

    current_user = {"sub": "user_uuid_123", "email": "user@example.com"}

    mock_reflections = [
        {
            "id": f"reflection_{i}",
            "verse_key": "2:255",
            "date": date.today().isoformat(),
            "mood": "peaceful",
            "is_shared": False,
            "qf_note_id": f"note_{i}",
            "qf_post_id": None,
            "ai_action_suggestion": f"Action {i}",
            "xp_earned": 10,
            "prompt_1_answer": f"Answer 1 {i}",
            "prompt_2_answer": f"Answer 2 {i}",
        }
        for i in range(5)
    ]

    with patch("app.routers.reflection.supabase_client") as mock_supabase:
        mock_select = MagicMock()
        mock_select.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = (
            mock_reflections
        )

        mock_supabase.table.return_value = mock_select

        result = await get_reflection_history(current_user)

        assert result.success
        assert len(result.data["reflections"]) == 5
        assert result.data["reflections"][0]["verse_key"] == "2:255"

"""Unit tests for progress endpoints (streaks, XP, activity heatmap)."""

import pytest
from datetime import datetime, timedelta
from httpx import AsyncClient
from unittest.mock import AsyncMock, MagicMock, patch

from main import app


TEST_USER_ID = "user-123"


@pytest.mark.asyncio
async def test_get_progress_summary_success():
    """Test fetching complete progress summary."""
    with patch("app.routers.progress.get_current_user") as mock_get_user, \
         patch("app.routers.progress.supabase_client") as mock_supabase, \
         patch("app.routers.progress.get_streaks") as mock_streaks, \
         patch("app.routers.progress.get_activity_days") as mock_activity:

        mock_get_user.return_value = {"sub": TEST_USER_ID}
        mock_streaks.return_value = {"current_streak": 7, "longest_streak": 15}
        mock_activity.return_value = ["2026-04-06", "2026-04-07", "2026-04-08", "2026-04-09", "2026-04-10"]

        # Mock profile with XP
        profile_result = MagicMock()
        profile_result.data = [{"xp": 125, "level": 2}]
        reflections_result = MagicMock()
        today = datetime.utcnow().date()
        recent_dates = [(today - timedelta(days=i)).isoformat() for i in range(7)]
        old_dates = [(today - timedelta(days=i)).isoformat() for i in range(10, 25)]
        reflections_result.data = [{"date": d} for d in (recent_dates + old_dates)]
        def _table_side_effect(table_name):
            if table_name == "profiles":
                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=profile_result))))))
            elif table_name == "reflections":
                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(order=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=reflections_result))))))))
            return MagicMock()
        mock_supabase.table.side_effect = _table_side_effect

        async with AsyncClient(app=app, base_url="http://test") as client:
            r = await client.get(
                "/api/progress/summary",
                headers={"Authorization": "Bearer test_token"},
            )

        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert data["data"]["current_streak"] == 7
        assert data["data"]["longest_streak"] == 15
        assert data["data"]["xp"] == 125
        assert data["data"]["level"] == 2
        assert data["data"]["level_name"] == "Learner"
        assert data["data"]["level_name_ar"] == "متعلّم"
        assert len(data["data"]["activity_days"]) == 27


@pytest.mark.asyncio
async def test_get_progress_summary_level_calculation():
    """Test level calculation from XP thresholds."""
    with patch("app.routers.progress.get_current_user") as mock_get_user, \
         patch("app.routers.progress.supabase_client") as mock_supabase, \
         patch("app.routers.progress.get_streaks") as mock_streaks, \
         patch("app.routers.progress.get_activity_days") as mock_activity:

        mock_get_user.return_value = {"sub": TEST_USER_ID}
        mock_streaks.return_value = {"current_streak": 0, "longest_streak": 0}
        mock_activity.return_value = []

        # Test each level threshold
        test_cases = [
            (10, 1, "Seeker", "طالب"),
            (100, 2, "Learner", "متعلّم"),
            (250, 3, "Reflector", "متدبّر"),
            (500, 4, "Practitioner", "عامل"),
            (750, 5, "Guide", "مرشد"),
        ]

        for xp, expected_level, expected_name, expected_name_ar in test_cases:
            profile_result = MagicMock()
            profile_result.data = [{"xp": xp, "level": expected_level}]
            def _table_side_effect(table_name):

                if table_name == "profiles":

                    return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=profile_result))))))

                elif table_name == "reflections":

                    return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(order=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))))))))

                return MagicMock()

            mock_supabase.table.side_effect = _table_side_effect

            async with AsyncClient(app=app, base_url="http://test") as client:
                r = await client.get(
                    "/api/progress/summary",
                    headers={"Authorization": "Bearer test_token"},
                )

            data = r.json()
            assert data["data"]["xp"] == xp
            assert data["data"]["level"] == expected_level
            assert data["data"]["level_name"] == expected_name
            assert data["data"]["level_name_ar"] == expected_name_ar


@pytest.mark.asyncio
async def test_get_progress_summary_xp_to_next_level():
    """Test XP to next level calculation."""
    with patch("app.routers.progress.get_current_user") as mock_get_user, \
         patch("app.routers.progress.supabase_client") as mock_supabase, \
         patch("app.routers.progress.get_streaks") as mock_streaks, \
         patch("app.routers.progress.get_activity_days") as mock_activity:

        mock_get_user.return_value = {"sub": TEST_USER_ID}
        mock_streaks.return_value = {"current_streak": 0, "longest_streak": 0}
        mock_activity.return_value = []

        # Test XP to next level: at 40 XP (level 1), need 51-40=11 XP to reach level 2
        profile_result = MagicMock()
        profile_result.data = [{"xp": 40, "level": 1}]
        def _table_side_effect(table_name):

            if table_name == "profiles":

                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=profile_result))))))

            elif table_name == "reflections":

                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(order=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))))))))

            return MagicMock()

        mock_supabase.table.side_effect = _table_side_effect

        async with AsyncClient(app=app, base_url="http://test") as client:
            r = await client.get(
                "/api/progress/summary",
                headers={"Authorization": "Bearer test_token"},
            )

        data = r.json()
        assert data["data"]["xp_to_next_level"] == 11  # 51 - 40


@pytest.mark.asyncio
async def test_get_progress_summary_max_level():
    """Test XP to next level at max level (should be 0)."""
    with patch("app.routers.progress.get_current_user") as mock_get_user, \
         patch("app.routers.progress.supabase_client") as mock_supabase, \
         patch("app.routers.progress.get_streaks") as mock_streaks, \
         patch("app.routers.progress.get_activity_days") as mock_activity:

        mock_get_user.return_value = {"sub": TEST_USER_ID}
        mock_streaks.return_value = {"current_streak": 0, "longest_streak": 0}
        mock_activity.return_value = []

        # At max level (5) with 800 XP, should have 0 XP to next level
        profile_result = MagicMock()
        profile_result.data = [{"xp": 800, "level": 5}]
        def _table_side_effect(table_name):

            if table_name == "profiles":

                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=profile_result))))))

            elif table_name == "reflections":

                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(order=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))))))))

            return MagicMock()

        mock_supabase.table.side_effect = _table_side_effect

        async with AsyncClient(app=app, base_url="http://test") as client:
            r = await client.get(
                "/api/progress/summary",
                headers={"Authorization": "Bearer test_token"},
            )

        data = r.json()
        assert data["data"]["xp_to_next_level"] == 0


@pytest.mark.asyncio
async def test_get_progress_summary_graceful_failure():
    """Test that progress page doesn't crash when QF APIs fail."""
    with patch("app.routers.progress.get_current_user") as mock_get_user, \
         patch("app.routers.progress.supabase_client") as mock_supabase, \
         patch("app.routers.progress.get_streaks") as mock_streaks, \
         patch("app.routers.progress.get_activity_days") as mock_activity:

        mock_get_user.return_value = {"sub": TEST_USER_ID}

        # Streaks and activity fail
        mock_streaks.side_effect = Exception("QF API timeout")
        mock_activity.side_effect = Exception("QF API timeout")

        profile_result = MagicMock()
        profile_result.data = [{"xp": 100, "level": 2}]
        def _table_side_effect(table_name):

            if table_name == "profiles":

                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=profile_result))))))

            elif table_name == "reflections":

                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(order=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))))))))

            return MagicMock()

        mock_supabase.table.side_effect = _table_side_effect

        async with AsyncClient(app=app, base_url="http://test") as client:
            r = await client.get(
                "/api/progress/summary",
                headers={"Authorization": "Bearer test_token"},
            )

        # Should still return 200 with defaults
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert data["data"]["current_streak"] == 0  # Fallback
        assert data["data"]["longest_streak"] == 0  # Fallback
        assert data["data"]["activity_days"] == []  # Fallback


@pytest.mark.asyncio
async def test_get_progress_summary_no_profile():
    """Test progress when profile doesn't exist yet."""
    with patch("app.routers.progress.get_current_user") as mock_get_user, \
         patch("app.routers.progress.supabase_client") as mock_supabase, \
         patch("app.routers.progress.get_streaks") as mock_streaks, \
         patch("app.routers.progress.get_activity_days") as mock_activity:

        mock_get_user.return_value = {"sub": TEST_USER_ID}
        mock_streaks.return_value = {"current_streak": 0, "longest_streak": 0}
        mock_activity.return_value = []

        # Profile not found
        profile_result = MagicMock()
        profile_result.data = []
        def _table_side_effect(table_name):

            if table_name == "profiles":

                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=profile_result))))))

            elif table_name == "reflections":

                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(order=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))))))))

            return MagicMock()

        mock_supabase.table.side_effect = _table_side_effect

        async with AsyncClient(app=app, base_url="http://test") as client:
            r = await client.get(
                "/api/progress/summary",
                headers={"Authorization": "Bearer test_token"},
            )

        assert r.status_code == 200
        data = r.json()
        assert data["data"]["xp"] == 0  # Default
        assert data["data"]["level"] == 1  # Default


@pytest.mark.asyncio
async def test_get_xp_events_success():
    """Test fetching user's XP events history."""
    with patch("app.routers.progress.get_current_user") as mock_get_user, \
         patch("app.routers.progress.get_async_supabase_client", new_callable=AsyncMock) as mock_get_async:
        mock_supabase = MagicMock()
        mock_get_async.return_value = mock_supabase

        mock_get_user.return_value = {"sub": TEST_USER_ID}

        # Mock events
        events_result = MagicMock()
        events_result.data = [
            {
                "id": "evt-1",
                "event_type": "complete_reflection",
                "xp_amount": 10,
                "created_at": "2026-04-13T14:00:00Z",
            },
            {
                "id": "evt-2",
                "event_type": "share_reflection",
                "xp_amount": 5,
                "created_at": "2026-04-13T13:00:00Z",
            },
            {
                "id": "evt-3",
                "event_type": "like_reflection",
                "xp_amount": 3,
                "created_at": "2026-04-13T12:00:00Z",
            },
        ]

        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(return_value=events_result)

        async with AsyncClient(app=app, base_url="http://test") as client:
            r = await client.get(
                "/api/progress/xp-events",
                headers={"Authorization": "Bearer test_token"},
            )

        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert len(data["data"]["events"]) == 3
        # Should be ordered DESC (most recent first)
        assert data["data"]["events"][0]["event_type"] == "complete_reflection"
        assert data["data"]["events"][1]["event_type"] == "share_reflection"
        assert data["data"]["events"][2]["event_type"] == "like_reflection"


@pytest.mark.asyncio
async def test_get_xp_events_empty():
    """Test fetching XP events when none exist."""
    with patch("app.routers.progress.get_current_user") as mock_get_user, \
         patch("app.routers.progress.get_async_supabase_client", new_callable=AsyncMock) as mock_get_async:
        mock_supabase = MagicMock()
        mock_get_async.return_value = mock_supabase

        mock_get_user.return_value = {"sub": TEST_USER_ID}

        # Mock: no events
        events_result = MagicMock()
        events_result.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(return_value=events_result)

        async with AsyncClient(app=app, base_url="http://test") as client:
            r = await client.get(
                "/api/progress/xp-events",
                headers={"Authorization": "Bearer test_token"},
            )

        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert data["data"]["events"] == []


@pytest.mark.asyncio
async def test_get_xp_events_limit_20():
    """Test that XP events are limited to 20 most recent."""
    with patch("app.routers.progress.get_current_user") as mock_get_user, \
         patch("app.routers.progress.get_async_supabase_client", new_callable=AsyncMock) as mock_get_async:
        mock_supabase = MagicMock()
        mock_get_async.return_value = mock_supabase

        mock_get_user.return_value = {"sub": TEST_USER_ID}

        # Mock: 25 events (should be limited to 20)
        events_list = [
            {
                "id": f"evt-{i}",
                "event_type": "complete_reflection",
                "xp_amount": 10,
                "created_at": f"2026-04-{13-i}T12:00:00Z",
            }
            for i in range(25)
        ]

        events_result = MagicMock()
        events_result.data = events_list[:20]  # DB should handle limit, but verify
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(return_value=events_result)

        async with AsyncClient(app=app, base_url="http://test") as client:
            r = await client.get(
                "/api/progress/xp-events",
                headers={"Authorization": "Bearer test_token"},
            )

        assert r.status_code == 200
        data = r.json()
        assert len(data["data"]["events"]) == 20


@pytest.mark.asyncio
async def test_get_weekly_insights_success():
    """Returns generated markdown from last 7 days of user reflections."""
    with patch("app.routers.progress.get_current_user") as mock_get_user, \
         patch("app.routers.progress.supabase_client") as mock_supabase, \
         patch("app.routers.progress.generate_weekly_insights", new_callable=AsyncMock) as mock_generate:
        mock_get_user.return_value = {"sub": TEST_USER_ID}
        mock_generate.return_value = "## Weekly Insight\nYou showed consistency."

        reflections_result = MagicMock()
        reflections_result.data = [
            {
                "date": "2026-05-15",
                "verse_key": "2:255",
                "prompt_1_answer": "I felt more trust this week.",
                "prompt_2_answer": "I will call my parents.",
            },
            {
                "date": "2026-05-16",
                "verse_key": "94:5",
                "prompt_1_answer": "Hardship comes with ease.",
                "prompt_2_answer": "I will stay patient at work.",
            },
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.order.return_value.limit.return_value.execute.return_value = reflections_result

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                "/api/progress/weekly-insights",
                headers={"Authorization": "Bearer test_token"},
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert payload["data"]["status"] == "ready"
        assert payload["data"]["insight_markdown"] == "## Weekly Insight\nYou showed consistency."
        assert payload["data"]["reflection_count"] == 2


@pytest.mark.asyncio
async def test_get_weekly_insights_not_enough_data():
    """Returns a not-enough-data response when user has no recent reflections."""
    with patch("app.routers.progress.get_current_user") as mock_get_user, \
         patch("app.routers.progress.supabase_client") as mock_supabase, \
         patch("app.routers.progress.generate_weekly_insights", new_callable=AsyncMock) as mock_generate:
        mock_get_user.return_value = {"sub": TEST_USER_ID}

        reflections_result = MagicMock()
        reflections_result.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.order.return_value.limit.return_value.execute.return_value = reflections_result

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                "/api/progress/weekly-insights",
                headers={"Authorization": "Bearer test_token"},
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert payload["data"]["status"] == "not_enough_data"
        assert payload["data"]["insight_markdown"] is None
        assert payload["data"]["reflection_count"] == 0
        mock_generate.assert_not_called()


@pytest.mark.asyncio
async def test_get_weekly_insights_ai_failure():
    """Returns an unavailable response if OpenRouter summary generation fails."""
    with patch("app.routers.progress.get_current_user") as mock_get_user, \
         patch("app.routers.progress.supabase_client") as mock_supabase, \
         patch("app.routers.progress.generate_weekly_insights", new_callable=AsyncMock) as mock_generate:
        mock_get_user.return_value = {"sub": TEST_USER_ID}
        mock_generate.return_value = None

        reflections_result = MagicMock()
        reflections_result.data = [
            {
                "date": "2026-05-15",
                "verse_key": "2:255",
                "prompt_1_answer": "I felt more trust this week.",
                "prompt_2_answer": "I will call my parents.",
            }
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.order.return_value.limit.return_value.execute.return_value = reflections_result

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                "/api/progress/weekly-insights",
                headers={"Authorization": "Bearer test_token"},
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert payload["data"]["status"] == "unavailable"
        assert payload["data"]["insight_markdown"] is None
        assert payload["data"]["reflection_count"] == 1

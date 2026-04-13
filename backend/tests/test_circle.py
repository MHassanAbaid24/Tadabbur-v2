"""Unit tests for circle endpoints (reflection groups)."""

import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, MagicMock, patch

from main import app


# Test fixtures
CIRCLE_CREATE_BODY = {
    "name": "Family Quran Circle",
}

TEST_CIRCLE_ID = "550e8400-e29b-41d4-a716-446655440000"
TEST_CIRCLE_ID_2 = "550e8400-e29b-41d4-a716-446655440001"
TEST_USER_ID = "user-123"
TEST_USER_ID_2 = "user-456"
TEST_INVITE_CODE = "abc123def"


@pytest.mark.asyncio
async def test_create_circle_success():
    """Test creating a new circle successfully."""
    with patch("app.routers.circle.get_current_user") as mock_get_user, \
         patch("app.routers.circle.supabase_client") as mock_supabase, \
         patch("app.routers.circle.create_qf_room") as mock_create_room:

        mock_get_user.return_value = {"sub": TEST_USER_ID}
        mock_create_room.return_value = "qf-room-123"

        # Mock: no existing circle membership
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        # Mock: insert circle returns ID
        insert_result = MagicMock()
        insert_result.data = [{"id": TEST_CIRCLE_ID}]
        mock_supabase.table.return_value.insert.return_value.execute.return_value = insert_result

        async with AsyncClient(app=app, base_url="http://test") as client:
            r = await client.post(
                "/api/circle/create",
                json=CIRCLE_CREATE_BODY,
                headers={"Authorization": "Bearer test_token"},
            )

        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert data["data"]["name"] == "Family Quran Circle"
        assert data["data"]["id"] == TEST_CIRCLE_ID
        assert data["data"]["member_count"] == 1


@pytest.mark.asyncio
async def test_create_circle_user_already_in_circle():
    """Test that user cannot create circle if already in one."""
    with patch("app.routers.circle.get_current_user") as mock_get_user, \
         patch("app.routers.circle.supabase_client") as mock_supabase:

        mock_get_user.return_value = {"sub": TEST_USER_ID}

        # Mock: user already has a circle membership
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"circle_id": TEST_CIRCLE_ID, "user_id": TEST_USER_ID}]
        )

        async with AsyncClient(app=app, base_url="http://test") as client:
            r = await client.post(
                "/api/circle/create",
                json=CIRCLE_CREATE_BODY,
                headers={"Authorization": "Bearer test_token"},
            )

        assert r.status_code == 409
        assert "already in a circle" in r.json()["detail"]


@pytest.mark.asyncio
async def test_join_circle_success():
    """Test joining a circle by invite code."""
    with patch("app.routers.circle.get_current_user") as mock_get_user, \
         patch("app.routers.circle.supabase_client") as mock_supabase:

        mock_get_user.return_value = {"sub": TEST_USER_ID_2}

        # Mock: look up circle by invite code
        circle_lookup = MagicMock()
        circle_lookup.data = [{"id": TEST_CIRCLE_ID, "name": "Family", "invite_code": TEST_INVITE_CODE, "qf_room_id": "qf-123"}]

        # Mock: check user not already in circle
        membership_check = MagicMock()
        membership_check.data = []

        # Mock: insert membership and count members
        member_count_result = MagicMock()
        member_count_result.data = [
            {"user_id": TEST_USER_ID},  # creator
            {"user_id": TEST_USER_ID_2},  # new member
        ]

        call_count = 0
        def side_effect(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if "circle_members" in str(mock_supabase.table.call_args_list[-1]):
                if call_count == 1:  # membership check
                    return MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=membership_check))))
                elif call_count == 2:  # insert
                    return MagicMock(insert=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))))
                else:  # member count
                    return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=member_count_result))))))
            else:  # circles table
                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=circle_lookup))))))

        mock_supabase.table.side_effect = side_effect

        async with AsyncClient(app=app, base_url="http://test") as client:
            r = await client.get(
                f"/api/circle/join/{TEST_INVITE_CODE}",
                headers={"Authorization": "Bearer test_token"},
            )

        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert data["data"]["member_count"] == 2


@pytest.mark.asyncio
async def test_join_circle_not_found():
    """Test joining with invalid invite code."""
    with patch("app.routers.circle.get_current_user") as mock_get_user, \
         patch("app.routers.circle.supabase_client") as mock_supabase:

        mock_get_user.return_value = {"sub": TEST_USER_ID_2}

        # Mock: circle not found
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        async with AsyncClient(app=app, base_url="http://test") as client:
            r = await client.get(
                f"/api/circle/join/invalid-code",
                headers={"Authorization": "Bearer test_token"},
            )

        assert r.status_code == 404
        assert "not found" in r.json()["detail"]


@pytest.mark.asyncio
async def test_get_my_circle_success():
    """Test retrieving user's circle."""
    with patch("app.routers.circle.get_current_user") as mock_get_user, \
         patch("app.routers.circle.supabase_client") as mock_supabase:

        mock_get_user.return_value = {"sub": TEST_USER_ID}

        # Mock: find membership
        membership = MagicMock()
        membership.data = [{"circle_id": TEST_CIRCLE_ID}]

        # Mock: get circle data
        circle_data = MagicMock()
        circle_data.data = [{
            "id": TEST_CIRCLE_ID,
            "name": "Family",
            "invite_code": TEST_INVITE_CODE,
            "qf_room_id": "qf-123"
        }]

        # Mock: count members
        members = MagicMock()
        members.data = [{"user_id": TEST_USER_ID}, {"user_id": TEST_USER_ID_2}]

        def table_side_effect(name):
            if name == "circle_members":
                return MagicMock(
                    select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=membership)))))
                )
            else:  # circles
                return MagicMock(
                    select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=circle_data)))))
                )

        # Second call for member count
        call_index = 0
        original_side_effect = table_side_effect

        def dual_side_effect(name):
            nonlocal call_index
            call_index += 1
            if call_index <= 2:
                return original_side_effect(name)
            else:
                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=members))))))

        mock_supabase.table.side_effect = dual_side_effect

        async with AsyncClient(app=app, base_url="http://test") as client:
            r = await client.get(
                "/api/circle/my",
                headers={"Authorization": "Bearer test_token"},
            )

        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert data["data"]["id"] == TEST_CIRCLE_ID
        assert data["data"]["member_count"] == 2


@pytest.mark.asyncio
async def test_get_my_circle_not_in_circle():
    """Test getting circle when user not in any circle."""
    with patch("app.routers.circle.get_current_user") as mock_get_user, \
         patch("app.routers.circle.supabase_client") as mock_supabase:

        mock_get_user.return_value = {"sub": TEST_USER_ID}

        # Mock: no membership
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        async with AsyncClient(app=app, base_url="http://test") as client:
            r = await client.get(
                "/api/circle/my",
                headers={"Authorization": "Bearer test_token"},
            )

        assert r.status_code == 404


@pytest.mark.asyncio
async def test_get_circle_feed_success():
    """Test fetching circle feed with shared reflections."""
    with patch("app.routers.circle.get_current_user") as mock_get_user, \
         patch("app.routers.circle.supabase_client") as mock_supabase:

        mock_get_user.return_value = {"sub": TEST_USER_ID}

        # Mock: find membership
        membership = MagicMock()
        membership.data = [{"circle_id": TEST_CIRCLE_ID}]

        # Mock: get all circle members
        members = MagicMock()
        members.data = [{"user_id": TEST_USER_ID}, {"user_id": TEST_USER_ID_2}]

        # Mock: get shared reflections
        reflections = MagicMock()
        reflections.data = [
            {
                "id": "refl-1",
                "user_id": TEST_USER_ID_2,
                "verse_key": "2:255",
                "prompt_1_answer": "This verse shows me that God is watching over all things.",
                "mood": "peaceful",
                "created_at": "2026-04-13T10:00:00Z",
                "qf_post_id": "qf-post-1"
            }
        ]

        # Mock: get author profile
        profile = MagicMock()
        profile.data = [{"display_name": "Sister Aisha"}]

        call_count = 0
        def side_effect(name):
            nonlocal call_count
            call_count += 1
            if name == "circle_members" and call_count == 1:
                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=membership))))))
            elif name == "circle_members":
                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=members))))))
            elif name == "reflections":
                return MagicMock(
                    select=MagicMock(return_value=MagicMock(
                        in_=MagicMock(return_value=MagicMock(
                            eq=MagicMock(return_value=MagicMock(
                                order=MagicMock(return_value=MagicMock(
                                    limit=MagicMock(return_value=MagicMock(
                                        execute=MagicMock(return_value=reflections)
                                    ))
                                ))
                            ))
                        ))
                    ))
                )
            else:  # profiles
                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=profile))))))

        mock_supabase.table.side_effect = side_effect

        async with AsyncClient(app=app, base_url="http://test") as client:
            r = await client.get(
                "/api/circle/feed",
                headers={"Authorization": "Bearer test_token"},
            )

        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert len(data["data"]["feed"]) == 1
        assert data["data"]["feed"][0]["user_display_name"] == "Sister Aisha"
        assert data["data"]["feed"][0]["verse_key"] == "2:255"


@pytest.mark.asyncio
async def test_like_reflection_success():
    """Test liking a reflection awards XP."""
    with patch("app.routers.circle.get_current_user") as mock_get_user, \
         patch("app.routers.circle.supabase_client") as mock_supabase, \
         patch("app.routers.circle.like_qf_post") as mock_like:

        mock_get_user.return_value = {"sub": TEST_USER_ID}
        mock_like.return_value = True

        # Mock: get reflection
        reflection = MagicMock()
        reflection.data = [{
            "id": "refl-1",
            "qf_post_id": "qf-post-1"
        }]

        # Mock: get current user's XP
        profile = MagicMock()
        profile.data = [{"xp": 50}]

        call_count = 0
        def side_effect(name):
            nonlocal call_count
            call_count += 1
            if name == "reflections":
                return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=reflection))))))
            elif name == "xp_events":
                return MagicMock(insert=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))))
            else:  # profiles
                return MagicMock(
                    select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=profile))))),
                    update=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[]))))))
                )

        mock_supabase.table.side_effect = side_effect

        async with AsyncClient(app=app, base_url="http://test") as client:
            r = await client.post(
                "/api/circle/like/refl-1",
                headers={"Authorization": "Bearer test_token"},
            )

        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert data["data"]["liked"] is True
        assert data["data"]["xp_earned"] == 3


@pytest.mark.asyncio
async def test_like_reflection_not_found():
    """Test liking non-existent reflection."""
    with patch("app.routers.circle.get_current_user") as mock_get_user, \
         patch("app.routers.circle.supabase_client") as mock_supabase:

        mock_get_user.return_value = {"sub": TEST_USER_ID}

        # Mock: reflection not found
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        async with AsyncClient(app=app, base_url="http://test") as client:
            r = await client.post(
                "/api/circle/like/invalid-refl",
                headers={"Authorization": "Bearer test_token"},
            )

        assert r.status_code == 404

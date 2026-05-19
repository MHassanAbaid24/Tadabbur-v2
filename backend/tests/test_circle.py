"""Unit tests for circle endpoints (reflection groups)."""

import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

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
        print(r.json()); assert "already in a circle" in r.json().get("detail", r.json().get("error", ""))


@pytest.mark.asyncio
async def test_join_circle_success():
    """Test joining a circle endpoint returns success payload."""
    with patch("app.routers.circle.get_current_user") as mock_get_user, \
         patch("app.routers.circle._join_circle_internal", new=AsyncMock(return_value={
             "success": True,
             "data": {
                 "id": TEST_CIRCLE_ID,
                 "name": "Family",
                 "invite_code": TEST_INVITE_CODE,
                 "member_count": 2,
                 "qf_room_id": "qf-123",
             },
         })):
        mock_get_user.return_value = {"sub": TEST_USER_ID_2}
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
        assert "not found" in r.json().get("detail", r.json().get("error", ""))


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
                "prompt_2_answer": "I will try to be mindful.",
                "mood": "peaceful",
                "created_at": "2026-04-13T10:00:00Z",
                "qf_post_id": "qf-post-1"
            }
        ]

        # Mock: get author profile
        profile = MagicMock()
        profile.data = [{"id": TEST_USER_ID_2, "display_name": "Sister Aisha"}]

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
            elif name == "reflection_likes":
                likes_mock = MagicMock()
                likes_mock.data = [{"reflection_id": "refl-1", "user_id": TEST_USER_ID_2}]
                return MagicMock(select=MagicMock(return_value=MagicMock(in_=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=likes_mock))))))
            else:  # profiles
                return MagicMock(select=MagicMock(return_value=MagicMock(in_=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=profile))))))

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


@pytest.mark.asyncio
async def test_join_circle_idempotent_when_already_member_of_target():
    """Joining the same circle twice should return success (idempotent)."""
    target_circle = {"id": TEST_CIRCLE_ID, "name": "Family", "invite_code": TEST_INVITE_CODE, "qf_room_id": "qf-123"}
    memberships = MagicMock(data=[{"circle_id": TEST_CIRCLE_ID}])

    with patch("app.routers.circle._get_circle_by_invite_code", new=AsyncMock(return_value=target_circle)), \
         patch("app.routers.circle._get_circle_response", new=AsyncMock(return_value={"id": TEST_CIRCLE_ID, "name": "Family"})), \
         patch("app.routers.circle.asyncio.to_thread", new=AsyncMock(return_value=memberships)):
        from app.routers.circle import _join_circle_internal

        response = await _join_circle_internal(TEST_INVITE_CODE, TEST_USER_ID, allow_switch=False)

    assert response["success"] is True
    assert response["data"]["id"] == TEST_CIRCLE_ID


@pytest.mark.asyncio
async def test_join_circle_requires_switch_for_different_circle():
    """Joining a different circle should return a structured requires_switch conflict."""
    target_circle = {"id": TEST_CIRCLE_ID_2, "name": "Friends", "invite_code": "newcode", "qf_room_id": "qf-456"}
    memberships = MagicMock(data=[{"circle_id": TEST_CIRCLE_ID}])
    current_circle = MagicMock(data=[{"id": TEST_CIRCLE_ID, "name": "Family", "invite_code": TEST_INVITE_CODE}])

    with patch("app.routers.circle._get_circle_by_invite_code", new=AsyncMock(return_value=target_circle)), \
         patch("app.routers.circle.asyncio.to_thread", new=AsyncMock(side_effect=[memberships, current_circle])):
        from app.routers.circle import _join_circle_internal

        with pytest.raises(HTTPException) as exc_info:
            await _join_circle_internal("newcode", TEST_USER_ID, allow_switch=False)

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["code"] == "requires_switch"
    assert exc_info.value.detail["current_circle"]["name"] == "Family"
    assert exc_info.value.detail["target_circle"]["name"] == "Friends"


@pytest.mark.asyncio
async def test_join_circle_duplicate_insert_maps_to_success():
    """Duplicate membership insert race should be treated as success."""
    target_circle = {"id": TEST_CIRCLE_ID, "name": "Family", "invite_code": TEST_INVITE_CODE, "qf_room_id": "qf-123"}
    memberships = MagicMock(data=[])

    class DuplicateMembershipError(Exception):
        code = "23505"

    with patch("app.routers.circle._get_circle_by_invite_code", new=AsyncMock(return_value=target_circle)), \
         patch("app.routers.circle._get_circle_response", new=AsyncMock(return_value={"id": TEST_CIRCLE_ID, "name": "Family"})), \
         patch(
             "app.routers.circle.asyncio.to_thread",
             new=AsyncMock(side_effect=[memberships, DuplicateMembershipError("duplicate key")]),
         ):
        from app.routers.circle import _join_circle_internal

        response = await _join_circle_internal(TEST_INVITE_CODE, TEST_USER_ID, allow_switch=False)

    assert response["success"] is True
    assert response["data"]["id"] == TEST_CIRCLE_ID

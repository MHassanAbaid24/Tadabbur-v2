"""Integration-style tests for onboarding profile sync behavior."""

from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.auth.jwt import get_current_user
from main import app


class _FakeProfilesTable:
    def __init__(self, row: dict):
        self._row = row
        self._pending_update: dict = {}

    def update(self, payload: dict):
        self._pending_update = payload
        return self

    def select(self, _fields: str):
        return self

    def eq(self, _field: str, _value: str):
        return self

    def execute(self):
        if self._pending_update:
            self._row.update(self._pending_update)
            self._pending_update = {}
        return SimpleNamespace(data=[self._row.copy()])


class _FakeSupabaseClient:
    def __init__(self, row: dict):
        self._table = _FakeProfilesTable(row)

    def table(self, _name: str):
        return self._table


def _test_client_with_auth() -> TestClient:
    app.dependency_overrides[get_current_user] = lambda: {
        "sub": "user_uuid_123",
        "email": "user@example.com",
    }
    return TestClient(app)


def test_profile_reminder_sync_persists_across_profile_fetches() -> None:
    profile_row = {
        "id": "user_uuid_123",
        "username": "tester",
        "display_name": "Tester",
        "avatar_url": None,
        "xp": 0,
        "level": 1,
        "daily_reminder_time": None,
        "timezone": "UTC",
        "reminders_enabled": False,
        "qf_access_token": None,
        "onboarded": False,
        "created_at": "2026-05-17T00:00:00Z",
    }
    fake_supabase = _FakeSupabaseClient(profile_row)

    with patch("main.start_reminder_scheduler"), patch("main.stop_reminder_scheduler"):
        client = _test_client_with_auth()
        with patch("app.routers.auth.supabase_client", fake_supabase):
            update_response = client.put(
                "/api/auth/profile",
                json={
                    "daily_reminder_time": "08:00",
                    "timezone": "Asia/Karachi",
                    "reminders_enabled": True,
                },
            )
            assert update_response.status_code == 200
            assert update_response.json()["data"]["daily_reminder_time"] == "08:00"
            assert update_response.json()["data"]["timezone"] == "Asia/Karachi"
            assert update_response.json()["data"]["reminders_enabled"] is True

            # Simulate returning login session fetching current profile after update.
            me_response = client.get("/api/auth/me")
            assert me_response.status_code == 200
            assert me_response.json()["data"]["daily_reminder_time"] == "08:00"
            assert me_response.json()["data"]["timezone"] == "Asia/Karachi"

        client.close()

    app.dependency_overrides.clear()


def test_profile_update_rejects_invalid_reminder_time_format() -> None:
    profile_row = {
        "id": "user_uuid_123",
        "username": "tester",
        "display_name": "Tester",
        "avatar_url": None,
        "xp": 0,
        "level": 1,
        "daily_reminder_time": None,
        "timezone": "UTC",
        "reminders_enabled": False,
        "qf_access_token": None,
        "onboarded": False,
        "created_at": "2026-05-17T00:00:00Z",
    }
    fake_supabase = _FakeSupabaseClient(profile_row)

    with patch("main.start_reminder_scheduler"), patch("main.stop_reminder_scheduler"):
        client = _test_client_with_auth()
        with patch("app.routers.auth.supabase_client", fake_supabase):
            response = client.put(
                "/api/auth/profile",
                json={
                    "daily_reminder_time": "invalid-time",
                    "timezone": "Asia/Karachi",
                    "reminders_enabled": True,
                },
            )

            assert response.status_code == 422

        client.close()

    app.dependency_overrides.clear()

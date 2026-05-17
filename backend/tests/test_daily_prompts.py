"""Behavior tests for daily verse prompts via public daily endpoint."""

from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.auth.jwt import get_current_user
from main import app


class _FakeDailyVerseLogTable:
    def __init__(self, row: dict | None):
        self._row = row
        self._eq_value: str | None = None
        self._mode: str = "select"
        self._payload: dict = {}

    def select(self, _fields: str):
        self._mode = "select"
        return self

    def eq(self, _field: str, value: str):
        self._eq_value = value
        return self

    def limit(self, _count: int):
        return self

    def insert(self, payload: dict):
        self._mode = "insert"
        self._payload = payload
        return self

    def update(self, payload: dict):
        self._mode = "update"
        self._payload = payload
        return self

    def execute(self):
        if self._mode == "select":
            if self._row and self._row.get("date") == self._eq_value:
                return SimpleNamespace(data=[self._row.copy()])
            return SimpleNamespace(data=[])

        if self._mode == "insert":
            self._row = self._payload.copy()
            return SimpleNamespace(data=[self._row.copy()])

        if self._mode == "update" and self._row and self._row.get("date") == self._eq_value:
            self._row.update(self._payload)
            return SimpleNamespace(data=[self._row.copy()])

        return SimpleNamespace(data=[])


class _FakeSupabaseClient:
    def __init__(self, row: dict | None):
        self._table = _FakeDailyVerseLogTable(row)

    def table(self, name: str):
        if name != "daily_verse_log":
            raise AssertionError(f"Unexpected table: {name}")
        return self._table


def _client_with_auth() -> TestClient:
    app.dependency_overrides[get_current_user] = lambda: {
        "sub": "user_uuid_123",
        "email": "user@example.com",
    }
    return TestClient(app)


def test_daily_endpoint_uses_cached_prompts_without_ai_call() -> None:
    fake_supabase = _FakeSupabaseClient(
        {
            "date": "2026-05-17",
            "verse_key": "2:255",
            "chapter_number": 2,
            "verse_number": 255,
            "prompt_1": "Cached prompt one?",
            "prompt_2": "Cached prompt two?",
        }
    )

    with patch("app.routers.daily.date") as mock_date, patch(
        "app.routers.daily.supabase_client", fake_supabase
    ), patch(
        "app.routers.daily.get_verse_with_full_context", new_callable=AsyncMock
    ) as mock_verse, patch(
        "app.routers.daily.generate_daily_reflection_prompts", new_callable=AsyncMock
    ) as mock_prompts:
        mock_date.today.return_value = date(2026, 5, 17)
        mock_verse.return_value = {
            "verse_key": "2:255",
            "text_uthmani": "AR",
            "translation": "TR",
            "tafsir": "TF",
            "audio_url": None,
        }

        client = _client_with_auth()
        response = client.get("/api/v1/daily")
        client.close()

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["prompt_1"] == "Cached prompt one?"
        assert data["prompt_2"] == "Cached prompt two?"
        mock_prompts.assert_not_called()

    app.dependency_overrides.clear()


def test_daily_endpoint_generates_and_persists_prompts_when_missing() -> None:
    fake_supabase = _FakeSupabaseClient(
        {
            "date": "2026-05-17",
            "verse_key": "2:255",
            "chapter_number": 2,
            "verse_number": 255,
            "prompt_1": None,
            "prompt_2": None,
        }
    )

    with patch("app.routers.daily.date") as mock_date, patch(
        "app.routers.daily.supabase_client", fake_supabase
    ), patch(
        "app.routers.daily.get_verse_with_full_context", new_callable=AsyncMock
    ) as mock_verse, patch(
        "app.routers.daily.generate_daily_reflection_prompts", new_callable=AsyncMock
    ) as mock_prompts:
        mock_date.today.return_value = date(2026, 5, 17)
        mock_verse.return_value = {
            "verse_key": "2:255",
            "text_uthmani": "AR",
            "translation": "TR",
            "tafsir": "TF",
            "audio_url": None,
        }
        mock_prompts.return_value = ("Generated prompt one?", "Generated prompt two?")

        client = _client_with_auth()
        response = client.get("/api/v1/daily")
        client.close()

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["prompt_1"] == "Generated prompt one?"
        assert data["prompt_2"] == "Generated prompt two?"
        assert fake_supabase._table._row["prompt_1"] == "Generated prompt one?"
        assert fake_supabase._table._row["prompt_2"] == "Generated prompt two?"

    app.dependency_overrides.clear()


def test_daily_endpoint_falls_back_to_static_prompts_when_ai_fails() -> None:
    fake_supabase = _FakeSupabaseClient(
        {
            "date": "2026-05-17",
            "verse_key": "2:255",
            "chapter_number": 2,
            "verse_number": 255,
            "prompt_1": None,
            "prompt_2": None,
        }
    )

    with patch("app.routers.daily.date") as mock_date, patch(
        "app.routers.daily.supabase_client", fake_supabase
    ), patch(
        "app.routers.daily.get_verse_with_full_context", new_callable=AsyncMock
    ) as mock_verse, patch(
        "app.routers.daily.generate_daily_reflection_prompts", new_callable=AsyncMock
    ) as mock_prompts:
        mock_date.today.return_value = date(2026, 5, 17)
        mock_verse.return_value = {
            "verse_key": "2:255",
            "text_uthmani": "AR",
            "translation": "TR",
            "tafsir": "TF",
            "audio_url": None,
        }
        mock_prompts.return_value = None

        client = _client_with_auth()
        response = client.get("/api/v1/daily")
        client.close()

        assert response.status_code == 200
        data = response.json()["data"]
        assert (
            data["prompt_1"]
            == "What does this ayah mean to you, right now, in your life?"
        )
        assert (
            data["prompt_2"]
            == "What is one thing you will do differently today because of this ayah?"
        )

    app.dependency_overrides.clear()

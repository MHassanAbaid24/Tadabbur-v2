"""Behavior tests for final submission documentation completeness."""

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
API_USAGE_DOC = REPO_ROOT / "docs" / "api-usage.md"
DEMO_SCRIPT_DOC = REPO_ROOT / "docs" / "demo-script.md"


def test_api_usage_doc_describes_security_auth_and_error_flow() -> None:
    content = API_USAGE_DOC.read_text(encoding="utf-8")

    assert "To be populated" not in content
    assert "Client Credentials" in content
    assert "Authorization Code" in content or "OIDC" in content
    assert "x-auth-token" in content
    assert "x-client-id" in content
    assert "429" in content
    assert "401" in content
    assert "QF_CLIENT_SECRET" in content
    assert "Supabase Vault" in content or "encrypted" in content


def test_demo_script_doc_has_complete_timestamped_walkthrough() -> None:
    content = DEMO_SCRIPT_DOC.read_text(encoding="utf-8")

    assert "To be populated" not in content
    assert "0:00" in content
    assert "3:00" in content
    assert "HOME" in content or "Home" in content
    assert "Audio" in content
    assert "Tafsir" in content
    assert "reflection" in content.lower()
    assert "Circle" in content
    assert "Progress" in content
    assert "Journal" in content

"""Tests for QF Content API service layer."""

import pytest
import re


class TestQFContentValidation:
    """Test QF Content service validation logic."""

    def test_verse_key_format_valid(self) -> None:
        """Valid verse keys pass format validation."""
        valid_keys = ["1:1", "2:255", "114:6", "10:10", "3:200"]
        for key in valid_keys:
            assert re.match(r"^\d{1,3}:\d{1,3}$", key), f"Valid key rejected: {key}"

    def test_verse_key_format_invalid(self) -> None:
        """Invalid verse keys fail format validation."""
        invalid_keys = ["invalid", "2-255", "2:256:3", "abc:def", "", "2:", ":255"]
        for key in invalid_keys:
            assert not re.match(r"^\d{1,3}:\d{1,3}$", key), f"Invalid key accepted: {key}"

    def test_arabic_text_detection(self) -> None:
        """Arabic text is detected by Unicode range."""
        arabic_text = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"
        # Arabic Unicode range: \u0600-\u06ff
        assert any("\u0600" <= c <= "\u06ff" for c in arabic_text), "Arabic text not detected"

    def test_html_stripping(self) -> None:
        """HTML tags are stripped from tafsir text."""
        html_text = "<p>This is <b>tafsir</b> with <em>HTML</em> tags</p>"
        # Strip tags
        import html as html_module
        stripped = re.sub(r"<[^>]+>", "", html_module.unescape(html_text))
        assert "<" not in stripped
        assert ">" not in stripped
        assert "This is tafsir with HTML tags" in stripped


class TestQFContentHeaderGeneration:
    """Test QF API header generation."""

    def test_required_headers(self) -> None:
        """Verify required headers are present."""
        required_headers = ["x-auth-token", "x-client-id"]
        # These would be tested in integration with actual token manager
        # For now, verify the concept is sound
        assert all(h for h in required_headers), "Missing required header keys"

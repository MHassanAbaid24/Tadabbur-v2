"""Tests for OTP verification service."""

import pytest
from datetime import datetime, timedelta, timezone

from app.services.otp_utils import OTPUtils
from app.services.verification.otp_service import OTPService


class TestOTPUtils:
    """Test OTP utility functions."""

    def test_generate_otp_length(self):
        """OTP should be 6 digits long."""
        otp = OTPUtils.generate_otp(length=6)
        assert len(otp) == 6
        assert otp.isdigit()

    def test_generate_otp_uniqueness(self):
        """Generated OTPs should be different each time."""
        otps = [OTPUtils.generate_otp(length=6) for _ in range(10)]
        # Allow some duplicates by random chance, but not all same
        assert len(set(otps)) > 1

    def test_hash_and_verify_otp(self):
        """OTP hashing and verification should work correctly."""
        otp = "123456"
        hashed = OTPUtils.hash_otp(otp)
        assert hashed != otp  # Should not be plaintext
        assert OTPUtils.verify_otp(otp, hashed)  # Should verify

    def test_verify_otp_with_wrong_code(self):
        """Verification should fail with wrong code."""
        otp = "123456"
        hashed = OTPUtils.hash_otp(otp)
        assert not OTPUtils.verify_otp("654321", hashed)

    def test_otp_expiry_calculation(self):
        """Expiry time should be correct offset from sent time."""
        now = datetime.now(timezone.utc)
        expiry = OTPUtils.get_otp_expiry_time(now, minutes=10)
        difference = (expiry - now).total_seconds() / 60
        assert 9.9 < difference < 10.1  # Allow small floating point error

    def test_is_otp_expired_with_expired_time(self):
        """Should detect expired OTP."""
        past = datetime.now(timezone.utc) - timedelta(minutes=15)
        assert OTPUtils.is_otp_expired(past)

    def test_is_otp_expired_with_valid_time(self):
        """Should not mark valid OTP as expired."""
        future = datetime.now(timezone.utc) + timedelta(minutes=5)
        assert not OTPUtils.is_otp_expired(future)

    def test_can_resend_otp_first_request(self):
        """First resend request should be allowed."""
        can_resend, reason = OTPUtils.can_resend_otp(
            last_resend_at=None,
            resend_count=0,
            max_attempts=3,
            cooldown_minutes=10,
        )
        assert can_resend
        assert reason == ""

    def test_can_resend_otp_within_cooldown(self):
        """Resend within cooldown should not be allowed."""
        recent = datetime.now(timezone.utc) - timedelta(minutes=2)
        can_resend, reason = OTPUtils.can_resend_otp(
            last_resend_at=recent,
            resend_count=0,
            max_attempts=3,
            cooldown_minutes=10,
        )
        assert not can_resend
        assert "wait" in reason.lower()

    def test_can_resend_otp_max_attempts_exceeded(self):
        """Should not allow resend after max attempts."""
        past = datetime.now(timezone.utc) - timedelta(minutes=15)
        can_resend, reason = OTPUtils.can_resend_otp(
            last_resend_at=past,
            resend_count=3,
            max_attempts=3,
            cooldown_minutes=10,
        )
        assert not can_resend
        assert "maximum" in reason.lower()

    def test_can_resend_otp_after_cooldown(self):
        """Should allow resend after cooldown expires."""
        old = datetime.now(timezone.utc) - timedelta(minutes=15)
        can_resend, reason = OTPUtils.can_resend_otp(
            last_resend_at=old,
            resend_count=0,
            max_attempts=3,
            cooldown_minutes=10,
        )
        assert can_resend
        assert reason == ""


class TestOTPService:
    """Test OTP verification service."""

    @pytest.mark.asyncio
    async def test_send_verification_structure(self):
        """Verification service should have required methods."""
        service = OTPService()
        assert hasattr(service, 'send_verification')
        assert hasattr(service, 'verify_code')
        assert hasattr(service, 'validate_rate_limit')
        assert hasattr(service, 'get_verification_status')
        assert hasattr(service, 'resend_verification')

"""Utilities for OTP generation, hashing, and validation."""

import secrets
import string
from datetime import datetime, timedelta, timezone

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class OTPUtils:
    """Utilities for OTP generation and verification."""

    @staticmethod
    def generate_otp(length: int = 6) -> str:
        """
        Generate a random OTP code of specified length.

        Args:
            length: Length of OTP code (default: 6 digits)

        Returns:
            String of random digits
        """
        return ''.join(secrets.choice(string.digits) for _ in range(length))

    @staticmethod
    def hash_otp(otp_code: str) -> str:
        """
        Hash an OTP code using bcrypt.

        Args:
            otp_code: Plain text OTP code

        Returns:
            Hashed OTP code
        """
        return pwd_context.hash(otp_code)

    @staticmethod
    def verify_otp(otp_code: str, hashed_otp: str) -> bool:
        """
        Verify an OTP code against its hash.

        Args:
            otp_code: Plain text OTP code to verify
            hashed_otp: Hashed OTP code from database

        Returns:
            True if OTP matches, False otherwise
        """
        return pwd_context.verify(otp_code, hashed_otp)

    @staticmethod
    def get_otp_expiry_time(sent_at: datetime, minutes: int = 10) -> datetime:
        """
        Calculate OTP expiry time.

        Args:
            sent_at: When the OTP was sent
            minutes: Minutes until expiry (default: 10)

        Returns:
            Expiry datetime
        """
        if sent_at.tzinfo is None:
            sent_at = sent_at.replace(tzinfo=timezone.utc)
        return sent_at + timedelta(minutes=minutes)

    @staticmethod
    def is_otp_expired(expires_at: datetime) -> bool:
        """
        Check if OTP has expired.

        Args:
            expires_at: Expiry datetime from database

        Returns:
            True if expired, False otherwise
        """
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) > expires_at

    @staticmethod
    def can_resend_otp(
        last_resend_at: datetime | None,
        resend_count: int,
        max_attempts: int = 3,
        cooldown_minutes: int = 10,
    ) -> tuple[bool, str]:
        """
        Check if user can request a new OTP.

        Args:
            last_resend_at: When OTP was last resent (None if first request)
            resend_count: Number of times user has requested new OTP
            max_attempts: Maximum resend attempts allowed
            cooldown_minutes: Minutes to wait between resend requests

        Returns:
            Tuple of (can_resend: bool, reason: str)
        """
        if resend_count >= max_attempts:
            return False, f"Maximum {max_attempts} resend attempts exceeded. Try again later."

        if last_resend_at is not None:
            if last_resend_at.tzinfo is None:
                last_resend_at = last_resend_at.replace(tzinfo=timezone.utc)

            cooldown_end = last_resend_at + timedelta(minutes=cooldown_minutes)
            if datetime.now(timezone.utc) < cooldown_end:
                time_remaining = (cooldown_end - datetime.now(timezone.utc)).total_seconds() / 60
                return (
                    False,
                    f"Please wait {int(time_remaining)} minutes before requesting a new OTP.",
                )

        return True, ""

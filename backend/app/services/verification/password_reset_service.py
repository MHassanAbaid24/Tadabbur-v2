"""Password Reset verification service (future implementation)."""

from app.services.verification.base import VerificationService


class PasswordResetService(VerificationService):
    """
    Password Reset email verification.

    Planned features:
    - Send password reset OTP/link via email
    - Verify identity with OTP/token
    - Allow user to set new password after verification
    - One-time use tokens
    - Expiry handling
    """

    async def send_verification(self, user_id: str, email: str) -> bool:
        """Send password reset verification code."""
        # TODO: Implement
        raise NotImplementedError("Password Reset verification not yet implemented")

    async def verify_code(self, user_id: str, code: str) -> tuple[bool, str]:
        """Verify password reset code."""
        # TODO: Implement
        raise NotImplementedError("Password Reset verification not yet implemented")

    async def validate_rate_limit(self, user_id: str) -> tuple[bool, str]:
        """Check rate limits for password reset requests."""
        # TODO: Implement
        raise NotImplementedError("Password Reset verification not yet implemented")

"""Magic Link verification service (future implementation)."""

from app.services.verification.base import VerificationService


class MagicLinkService(VerificationService):
    """
    Magic Link-based email verification (passwordless login).

    Planned features:
    - Generate unique magic link token
    - Send link via email
    - Verify by extracting token from link
    - Automatic user creation on first-time link verification
    - Token expiry handling
    """

    async def send_verification(self, user_id: str, email: str) -> bool:
        """Send magic link via email."""
        # TODO: Implement
        raise NotImplementedError("Magic Link verification not yet implemented")

    async def verify_code(self, user_id: str, code: str) -> tuple[bool, str]:
        """Verify magic link token."""
        # TODO: Implement
        raise NotImplementedError("Magic Link verification not yet implemented")

    async def validate_rate_limit(self, user_id: str) -> tuple[bool, str]:
        """Check rate limits for magic link requests."""
        # TODO: Implement
        raise NotImplementedError("Magic Link verification not yet implemented")

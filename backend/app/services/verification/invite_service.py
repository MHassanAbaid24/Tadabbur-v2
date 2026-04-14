"""User Invite verification service (future implementation)."""

from app.services.verification.base import VerificationService


class InviteService(VerificationService):
    """
    User Invite email verification.

    Planned features:
    - Admin/circle-creator sends invite to new user's email
    - Invite contains pre-filled verification token
    - New user clicks link with token
    - User can set password during invite verification
    - Automatic circle membership on verification
    - Invite link expiry and one-time use
    """

    async def send_verification(self, user_id: str, email: str) -> bool:
        """Send user invite email."""
        # TODO: Implement
        raise NotImplementedError("User Invite verification not yet implemented")

    async def verify_code(self, user_id: str, code: str) -> tuple[bool, str]:
        """Verify user invite code."""
        # TODO: Implement
        raise NotImplementedError("User Invite verification not yet implemented")

    async def validate_rate_limit(self, user_id: str) -> tuple[bool, str]:
        """Check rate limits for invite requests."""
        # TODO: Implement
        raise NotImplementedError("User Invite verification not yet implemented")

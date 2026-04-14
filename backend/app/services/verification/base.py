"""Verification service abstraction for extensible verification methods."""

import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Optional

from app.db.supabase import supabase_client
from app.services.otp_utils import OTPUtils

logger = logging.getLogger(__name__)


class VerificationService(ABC):
    """
    Abstract base class for verification methods.

    Supports multiple verification approaches:
    - OTP (email verification)
    - Magic links (passwordless)
    - Password reset
    - User invites

    Concrete implementations extend this class and override abstract methods.
    """

    @abstractmethod
    async def send_verification(self, user_id: str, email: str) -> bool:
        """
        Send verification code/link to user.

        Args:
            user_id: User ID to verify
            email: Email address to send to

        Returns:
            True if sent successfully, False otherwise
        """
        pass

    @abstractmethod
    async def verify_code(self, user_id: str, code: str) -> tuple[bool, str]:
        """
        Verify the code/token provided by user.

        Args:
            user_id: User ID attempting verification
            code: Code/token to verify

        Returns:
            Tuple of (success: bool, message: str)
        """
        pass

    @abstractmethod
    async def validate_rate_limit(self, user_id: str) -> tuple[bool, str]:
        """
        Check if user is within rate limits for this verification method.

        Args:
            user_id: User ID to check

        Returns:
            Tuple of (allowed: bool, reason: str)
        """
        pass

    async def get_verification_status(self, user_id: str) -> dict:
        """
        Get current verification status for user.

        Args:
            user_id: User ID to check

        Returns:
            Dict with status info: {verified: bool, email: str, expires_at: datetime, method: str}
        """
        try:
            response = supabase_client.table("email_verification").select("*").eq(
                "user_id", user_id
            ).execute()

            if not response.data:
                return {
                    "verified": False,
                    "email": None,
                    "expires_at": None,
                    "method": None,
                    "verified_at": None,
                }

            record = response.data[0]
            return {
                "verified": record.get("verified_at") is not None,
                "email": record.get("email"),
                "expires_at": record.get("expires_at"),
                "method": record.get("verification_method"),
                "verified_at": record.get("verified_at"),
                "otp_attempts": record.get("otp_attempts", 0),
            }
        except Exception as e:
            logger.error(f"Error getting verification status for {user_id}: {str(e)}")
            return {"verified": False, "email": None, "expires_at": None, "method": None}

    async def resend_verification(
        self,
        user_id: str,
        max_resend_attempts: int = 3,
        cooldown_minutes: int = 10,
    ) -> tuple[bool, str]:
        """
        Resend verification code (generic implementation).

        Checks rate limits and resends if allowed.

        Args:
            user_id: User ID requesting resend
            max_resend_attempts: Max resend attempts allowed
            cooldown_minutes: Cooldown between resends

        Returns:
            Tuple of (success: bool, message: str)
        """
        try:
            response = supabase_client.table("email_verification").select("*").eq(
                "user_id", user_id
            ).execute()

            if not response.data:
                return False, "No pending verification found"

            record = response.data[0]

            # Check rate limit
            can_resend, reason = OTPUtils.can_resend_otp(
                last_resend_at=record.get("otp_last_resend_at"),
                resend_count=record.get("otp_resend_count", 0),
                max_attempts=max_resend_attempts,
                cooldown_minutes=cooldown_minutes,
            )

            if not can_resend:
                return False, reason

            # Get email from record
            email = record.get("email")

            # Call concrete implementation's send method
            sent = await self.send_verification(user_id, email)

            if sent:
                # Update resend tracking
                supabase_client.table("email_verification").update(
                    {
                        "otp_last_resend_at": datetime.now(timezone.utc).isoformat(),
                        "otp_resend_count": record.get("otp_resend_count", 0) + 1,
                    }
                ).eq("user_id", user_id).execute()

                return True, "Verification code resent successfully"

            return False, "Failed to resend verification code"

        except Exception as e:
            logger.error(f"Error resending verification for {user_id}: {str(e)}")
            return False, "Error resending verification code"

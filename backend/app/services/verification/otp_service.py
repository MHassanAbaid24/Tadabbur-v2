"""OTP-based email verification service implementation."""

import logging
from datetime import datetime, timezone

from app.config import settings
from app.db.supabase import supabase_client
from app.services.email_service import EmailService
from app.services.otp_utils import OTPUtils
from app.services.verification.base import VerificationService

logger = logging.getLogger(__name__)


class OTPService(VerificationService):
    """
    OTP-based email verification implementation.

    Sends 6-digit OTP codes to user's email, allows verification up to 5 times,
    enforces rate limiting for resends (max 3 per 10 minutes).
    """

    async def send_verification(self, user_id: str, email: str) -> bool:
        """
        Generate OTP and send via email.

        Args:
            user_id: User ID to send OTP to
            email: Email address to send OTP to

        Returns:
            True if OTP sent successfully, False otherwise
        """
        try:
            # Generate 6-digit OTP
            otp_code = OTPUtils.generate_otp(length=6)

            # Hash OTP for storage
            hashed_otp = OTPUtils.hash_otp(otp_code)

            # Calculate expiry time
            now = datetime.now(timezone.utc)
            expires_at = OTPUtils.get_otp_expiry_time(
                now,
                minutes=settings.otp_expiry_minutes,
            )

            # Check if verification record exists
            existing = supabase_client.table("email_verification").select("*").eq(
                "user_id", user_id
            ).execute()

            if existing.data:
                # Update existing record
                supabase_client.table("email_verification").update(
                    {
                        "email": email,
                        "otp_code": hashed_otp,
                        "otp_attempts": 0,
                        "verification_method": "otp",
                        "verified_at": None,
                        "otp_sent_at": now.isoformat(),
                        "otp_last_resend_at": None,
                        "otp_resend_count": 0,
                        "expires_at": expires_at.isoformat(),
                    }
                ).eq("user_id", user_id).execute()
                logger.info(f"Updated verification record for user {user_id}")
            else:
                # Create new verification record
                supabase_client.table("email_verification").insert(
                    {
                        "user_id": user_id,
                        "email": email,
                        "otp_code": hashed_otp,
                        "otp_attempts": 0,
                        "verification_method": "otp",
                        "verified_at": None,
                        "otp_sent_at": now.isoformat(),
                        "otp_last_resend_at": None,
                        "otp_resend_count": 0,
                        "expires_at": expires_at.isoformat(),
                    }
                ).execute()
                logger.info(f"Created verification record for user {user_id}")

            # Send email with OTP
            email_sent = await EmailService.send_otp_email(email, otp_code)

            if not email_sent:
                logger.error(f"Failed to send OTP email to {email} for user {user_id}")
                return False

            logger.info(f"OTP sent successfully to {email} for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Error in send_verification for {user_id}: {str(e)}")
            return False

    async def verify_code(self, user_id: str, code: str) -> tuple[bool, str]:
        """
        Verify OTP code.

        Args:
            user_id: User ID verifying
            code: OTP code to verify

        Returns:
            Tuple of (success: bool, message: str)
        """
        try:
            # Fetch verification record
            response = supabase_client.table("email_verification").select("*").eq(
                "user_id", user_id
            ).execute()

            if not response.data:
                return False, "No verification record found"

            record = response.data[0]

            # Check if already verified
            if record.get("verified_at") is not None:
                return False, "Email already verified"

            # Check if OTP expired
            expires_at = record.get("expires_at")
            if expires_at and OTPUtils.is_otp_expired(datetime.fromisoformat(expires_at)):
                return False, "OTP has expired. Please request a new one."

            # Check attempt count
            attempts = record.get("otp_attempts", 0)
            if attempts >= settings.otp_max_verification_attempts:
                # Block user temporarily
                supabase_client.table("profiles").update(
                    {"verification_status": "blocked"}
                ).eq("id", user_id).execute()
                return False, "Too many failed attempts. Please try again later."

            # Verify OTP
            stored_hash = record.get("otp_code")
            if not stored_hash or not OTPUtils.verify_otp(code, stored_hash):
                # Increment attempt counter
                new_attempts = attempts + 1
                supabase_client.table("email_verification").update(
                    {"otp_attempts": new_attempts}
                ).eq("user_id", user_id).execute()

                remaining = settings.otp_max_verification_attempts - new_attempts
                if remaining <= 0:
                    return False, "Too many failed attempts. Please request a new OTP."
                return False, f"Invalid OTP. {remaining} attempts remaining."

            # OTP verified! Mark as verified
            now = datetime.now(timezone.utc)
            supabase_client.table("email_verification").update(
                {"verified_at": now.isoformat()}
            ).eq("user_id", user_id).execute()

            # Mark user as verified in profiles
            supabase_client.table("profiles").update(
                {
                    "email_verified": True,
                    "verification_status": "verified",
                }
            ).eq("id", user_id).execute()

            logger.info(f"User {user_id} successfully verified their email")
            return True, "Email verified successfully"

        except Exception as e:
            logger.error(f"Error verifying OTP for {user_id}: {str(e)}")
            return False, "Error verifying OTP"

    async def validate_rate_limit(self, user_id: str) -> tuple[bool, str]:
        """
        Check if user can request new OTP.

        Args:
            user_id: User ID to check

        Returns:
            Tuple of (allowed: bool, reason: str)
        """
        try:
            response = supabase_client.table("email_verification").select("*").eq(
                "user_id", user_id
            ).execute()

            if not response.data:
                return True, ""  # No existing record, can proceed

            record = response.data[0]

            # Check resend rate limit
            can_resend, reason = OTPUtils.can_resend_otp(
                last_resend_at=record.get("otp_last_resend_at"),
                resend_count=record.get("otp_resend_count", 0),
                max_attempts=settings.otp_max_resend_attempts,
                cooldown_minutes=settings.otp_resend_cooldown_minutes,
            )

            return can_resend, reason

        except Exception as e:
            logger.error(f"Error validating rate limit for {user_id}: {str(e)}")
            return False, "Error checking rate limit"

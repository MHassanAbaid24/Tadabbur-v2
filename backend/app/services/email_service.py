"""Email service for sending OTP and verification codes via Gmail SMTP."""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)

# Gmail SMTP configuration
GMAIL_SMTP_HOST = "smtp.gmail.com"
GMAIL_SMTP_PORT = 587


class EmailService:
    """Service for sending emails via Gmail SMTP with App Passwords."""

    @staticmethod
    async def send_otp_email(recipient_email: str, otp_code: str) -> bool:
        """
        Send OTP verification code via email.

        Args:
            recipient_email: Email address to send OTP to
            otp_code: 6-digit OTP code to include in email

        Returns:
            True if email sent successfully, False otherwise

        Raises:
            Does not raise exceptions; logs errors and returns False
        """
        try:
            subject = "Tadabbur - Email Verification Code"
            html_body = f"""
            <html>
              <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
                <div style="background-color: white; border-radius: 8px; padding: 30px; max-width: 500px; margin: 0 auto;">
                  <h2 style="color: #1A6B4A; text-align: center;">Tadabbur</h2>
                  <p style="color: #333; font-size: 16px; text-align: center;">
                    Welcome to Tadabbur! Read. Reflect. Grow Together.
                  </p>
                  
                  <div style="background-color: #f9f9f9; border-left: 4px solid #C9A84C; padding: 15px; margin: 20px 0;">
                    <p style="color: #666; margin: 0 0 10px 0;">Your verification code is:</p>
                    <p style="color: #1A6B4A; font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 2px; margin: 0;">
                      {otp_code}
                    </p>
                  </div>
                  
                  <p style="color: #666; font-size: 14px; text-align: center;">
                    This code expires in 10 minutes.
                  </p>
                  <p style="color: #999; font-size: 12px; text-align: center;">
                    If you didn't request this code, you can safely ignore this email.
                  </p>
                  
                  <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                  <p style="color: #999; font-size: 12px; text-align: center;">
                    © 2026 Tadabbur. All rights reserved.
                  </p>
                </div>
              </body>
            </html>
            """

            return EmailService._send_email(
                recipient_email=recipient_email,
                subject=subject,
                html_body=html_body,
            )

        except Exception as e:
            logger.error(f"Error preparing OTP email for {recipient_email}: {str(e)}")
            return False

    @staticmethod
    def _send_email(
        recipient_email: str,
        subject: str,
        html_body: str,
    ) -> bool:
        """
        Send email via Gmail SMTP.

        Args:
            recipient_email: Recipient email address
            subject: Email subject line
            html_body: HTML body of the email

        Returns:
            True if sent successfully, False otherwise
        """
        try:
            # Create MIME message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.gmail_sender_email
            msg["To"] = recipient_email

            # Attach HTML body
            html_part = MIMEText(html_body, "html")
            msg.attach(html_part)

            # Send via Gmail SMTP
            with smtplib.SMTP(GMAIL_SMTP_HOST, GMAIL_SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(settings.gmail_sender_email, settings.gmail_app_password)
                server.sendmail(
                    settings.gmail_sender_email,
                    recipient_email,
                    msg.as_string(),
                )

            logger.info(f"Email sent successfully to {recipient_email}")
            return True

        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"Gmail authentication failed: {str(e)}")
            return False
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error while sending email to {recipient_email}: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending email to {recipient_email}: {str(e)}")
            return False

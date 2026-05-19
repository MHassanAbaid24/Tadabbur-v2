from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    qf_client_id: str
    qf_client_secret: str
    qf_env: str = "prelive"
    qf_test_user_token: Optional[str] = None
    supabase_url: str
    supabase_service_key: str
    gemini_api_key: str
    gemini_model: str = "gemini-flash-latest"
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    jwt_secret: str
    jwt_expiry_hours: int = 168
    frontend_url: str = "http://localhost:5173"
    backend_url: Optional[str] = None
    
    # Gmail SMTP settings for OTP email verification
    gmail_sender_email: str
    gmail_app_password: str
    otp_expiry_minutes: int = 10
    otp_max_resend_attempts: int = 3
    otp_resend_cooldown_minutes: int = 10
    otp_max_verification_attempts: int = 5

    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def qf_auth_base_url(self) -> str:
        """Quran Foundation OAuth2 auth base URL based on environment."""
        if self.qf_env == "production":
            return "https://oauth2.quran.foundation"
        return "https://prelive-oauth2.quran.foundation"

    @property
    def qf_oauth2_base_url(self) -> str:
        """Quran Foundation OAuth2 base URL (alias for consistency)."""
        return self.qf_auth_base_url

    @property
    def qf_api_base_url(self) -> str:
        """Quran Foundation Content API base URL based on environment."""
        if self.qf_env == "production":
            return "https://apis.quran.foundation"
        return "https://apis-prelive.quran.foundation"

    @property
    def qf_user_api_base_url(self) -> str:
        """Quran Foundation User API base URL (same as content API)."""
        return self.qf_api_base_url


settings = Settings()

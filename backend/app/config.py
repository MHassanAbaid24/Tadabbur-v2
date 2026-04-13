from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    qf_client_id: str
    qf_client_secret: str
    qf_env: str = "prelive"
    supabase_url: str
    supabase_service_key: str
    openrouter_api_key: str
    openrouter_model: str = "anthropic/claude-3.5-haiku"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    jwt_secret: str
    jwt_expiry_hours: int = 168
    frontend_url: str = "http://localhost:5173"

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
    def qf_api_base_url(self) -> str:
        """Quran Foundation API base URL based on environment."""
        if self.qf_env == "production":
            return "https://apis.quran.foundation"
        return "https://apis-prelive.quran.foundation"


settings = Settings()

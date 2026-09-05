"""
NAWI TestFlow — Application Configuration

Uses pydantic-settings for environment variable management.
All secrets loaded from environment variables, never hardcoded.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "NAWI TestFlow"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/nawi_testflow"
    DATABASE_ECHO: bool = False
    
    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""

    # Gemini (AI assistance — on-demand only, gated by Settings key)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"
    AI_ASSISTANCE_ENABLED: bool = True
    
    # JWT
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60
    
    # Storage
    STORAGE_BUCKET: str = "nawi-attachments"

    # SMTP (outbound notifications — optional)
    SMTP_EMAIL: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 465
    SMTP_FROM_NAME: str = "NAWI TestFlow"
    
    # CORS — comma-separated in env, e.g.
    # CORS_ORIGINS="http://localhost:3000,https://nawi-testflow.vercel.app"
    # The deployed frontend origin MUST be listed here or browsers block API calls.
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ORIGINS env (comma-separated, or a JSON list)."""
        raw = (self.CORS_ORIGINS or "").strip()
        if not raw:
            return []
        if raw.startswith("["):
            try:
                import json
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return [str(o).strip() for o in parsed if str(o).strip()]
            except Exception:
                pass
        return [o.strip() for o in raw.split(",") if o.strip()]
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

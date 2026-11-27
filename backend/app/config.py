from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://archaeologist:archaeologist@localhost:5432/archaeologist"
    cors_origins: str = "http://localhost:3000"
    public_url: str = ""
    log_level: str = "INFO"
    llm_base_url: str = ""
    llm_api_key: str = ""
    llm_model: str = ""
    llm_timeout_seconds: int = 45
    min_evidence_score: float = 0.08
    # Auth
    environment: str = "development"
    allow_dev_login: bool = True
    auth_secret: str = ""
    backend_internal_secret: str = ""
    # OAuth Login (GitHub / Google)
    auth_github_id: str = ""
    auth_github_secret: str = ""
    auth_google_id: str = ""
    auth_google_secret: str = ""
    # Rate limiting
    max_login_attempts: int = 5
    rate_limit_window_seconds: int = 60
    # Email domain allowlist (comma-separated, empty = allow all domains)
    allowed_email_domains: str = ""
    # GitHub App (for repository connection, NOT login)
    github_app_id: str = ""
    github_app_client_id: str = ""
    github_app_client_secret: str = ""
    github_app_private_key: str = ""
    github_app_slug: str = ""
    github_webhook_secret: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    @property
    def cors_origin_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

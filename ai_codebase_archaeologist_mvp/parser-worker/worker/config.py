from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://archaeologist:archaeologist@localhost:5432/archaeologist"
    repo_workdir: str = "/workspace/repos"
    max_repo_files: int = 5000
    max_file_bytes: int = 262144
    max_history_commits: int = 200
    max_clone_seconds: int = 120
    poll_seconds: float = 2.0

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)


@lru_cache
def get_settings() -> Settings:
    return Settings()

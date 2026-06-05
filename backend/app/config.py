"""
Application configuration using pydantic-settings.
All settings are loaded from environment variables / .env file.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ----- App -----
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    # ----- OpenAI -----
    openai_api_key: str
    openai_model: str = "gpt-4o"
    openai_embedding_model: str = "text-embedding-3-small"

    # ----- Database -----
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/career_copilot"
    postgres_user: str = "postgres"
    postgres_password: str = "password"
    postgres_db: str = "career_copilot"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    # ----- ChromaDB -----
    chroma_host: str = "localhost"
    chroma_port: int = 8001
    chroma_persist_dir: str = "./chroma_db"

    # ----- JWT -----
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 1440  # 24 hours

    # ----- File Upload -----
    max_upload_size_mb: int = 10
    upload_dir: str = "./uploads"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance — loaded once on first call."""
    return Settings()

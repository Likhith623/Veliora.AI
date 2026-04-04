"""
Veliora.AI — Application Settings
Loads all configuration from environment variables via Pydantic Settings.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Central configuration loaded from .env file."""

    # ─── Application ───
    APP_NAME: str = "Veliora.AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    CORS_ORIGINS: str = "*"  # Comma-separated origins

    # ─── Supabase ───
    SUPABASE_URL: str
    SUPABASE_KEY: str  # anon/public key
    SUPABASE_SERVICE_ROLE_KEY: str  # service role key for admin ops
    SUPABASE_JWT_SECRET: str  # JWT secret for token validation

    # ─── Redis Stack (Local Docker — redis-py) ───
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # ─── RabbitMQ ───
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672/"
    RABBITMQ_API_URL: str = "http://localhost:15672/api/queues"
    RABBITMQ_API_USER: str = "guest"
    RABBITMQ_API_PASS: str = "guest"

    # ─── Gemini API ───
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.0-flash"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"
    GEMINI_EMBEDDING_DIMENSIONS: int = 768

    # ─── Google GenAI SDK (used by Redis_chat memory system) ───
    GOOGLE_API_KEY: str = ""  # Falls back to GEMINI_API_KEY if empty

    # ─── Deepgram (Speech-to-Text) ───
    DEEPGRAM_API_KEY: str

    # ─── Cartesia (Text-to-Speech) ───
    CARTESIA_API_KEY: str
    CARTESIA_MODEL: str = "sonic-2"

    # ─── HuggingFace Serverless API ───
    HF_API_TOKEN: str
    HF_RERANKER_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    HF_IMAGE_MODEL: str = "stabilityai/stable-diffusion-xl-base-1.0"

    # ─── Vector Search ───
    VECTOR_TOP_K: int = 50
    RERANK_TOP_K: int = 8

    # ─── Redis Cache TTLs (seconds) ───
    REDIS_CONTEXT_TTL: int = 86400        # 24 hours
    REDIS_GAME_STATE_TTL: int = 7200      # 2 hours
    REDIS_CONTEXT_MAX_MESSAGES: int = 50

    # ─── RabbitMQ Cleanup ───
    CLEANUP_INTERVAL_SEC: int = 60

    # ─── Background Workers ───
    XP_FLUSH_INTERVAL: int = 60
    DIARY_CRON_HOUR: int = 0

    @property
    def effective_google_api_key(self) -> str:
        """Return GOOGLE_API_KEY if set, else fall back to GEMINI_API_KEY."""
        return self.GOOGLE_API_KEY if self.GOOGLE_API_KEY else self.GEMINI_API_KEY

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Singleton settings instance, cached for performance."""
    return Settings()

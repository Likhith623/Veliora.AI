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

    # ─── Upstash Redis (REST API) ───
    UPSTASH_REDIS_URL: str  # e.g., https://xyz.upstash.io
    UPSTASH_REDIS_TOKEN: str

    # ─── Gemini API ───
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-1.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"
    GEMINI_EMBEDDING_DIMENSIONS: int = 768

    # ─── Deepgram (Speech-to-Text) ───
    DEEPGRAM_API_KEY: str

    # ─── Cartesia (Text-to-Speech) ───
    CARTESIA_API_KEY: str
    CARTESIA_MODEL: str = "sonic-2"  # or sonic-3 when available

    # ─── HuggingFace Serverless API ───
    HF_API_TOKEN: str
    HF_RERANKER_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    HF_IMAGE_MODEL: str = "stabilityai/stable-diffusion-xl-base-1.0"

    # ─── Vector Search ───
    VECTOR_TOP_K: int = 50  # Stage 1: HNSW retrieval count
    RERANK_TOP_K: int = 8   # Stage 2: final reranked results

    # ─── Redis Cache TTLs (seconds) ───
    REDIS_CONTEXT_TTL: int = 86400        # 24 hours
    REDIS_GAME_STATE_TTL: int = 7200      # 2 hours
    REDIS_CONTEXT_MAX_MESSAGES: int = 50  # max messages in Redis list

    # ─── Background Workers ───
    XP_FLUSH_INTERVAL: int = 60  # seconds between XP flushes
    DIARY_CRON_HOUR: int = 0     # midnight UTC

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Singleton settings instance, cached for performance."""
    return Settings()

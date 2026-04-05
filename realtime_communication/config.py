import os
import sys
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List
from pathlib import Path


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Veliora.AI Realtime"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Supabase (handles auth + database)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""                  # anon key (maps from .env SUPABASE_KEY)
    SUPABASE_SERVICE_ROLE_KEY: str = ""     # service role key

    # Aliases so old code referencing ANON_KEY / SERVICE_KEY still works
    @property
    def SUPABASE_ANON_KEY(self) -> str:
        return self.SUPABASE_KEY

    @property
    def SUPABASE_SERVICE_KEY(self) -> str:
        return self.SUPABASE_SERVICE_ROLE_KEY

    # Google Cloud Translation API key
    GOOGLE_TRANSLATE_API_KEY: str = ""

    # Deepgram (Speech-to-Text)
    DEEPGRAM_API_KEY: str = ""

    # Cartesia (Text-to-Speech)
    CARTESIA_API_KEY: str = ""

    # Gemini (for idiom detection fallback)
    GEMINI_API_KEY: str = ""

    # CORS
    CORS_ORIGINS: str = "*"

    @property
    def cors_origins_list(self) -> List[str]:
        if self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    class Config:
        # Walk up to find the root .env file
        _env = Path(__file__).resolve().parent.parent / ".env"
        env_file = str(_env) if _env.exists() else ".env"
        extra = "allow"


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()

    missing = []
    if not settings.SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not settings.SUPABASE_KEY:
        missing.append("SUPABASE_KEY")
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")

    if missing:
        print(f"\n⚠️  Missing env vars: {', '.join(missing)}\n", file=sys.stderr)
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")

    return settings

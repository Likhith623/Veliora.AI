"""
Veliora.AI — Main Application Entry Point
FastAPI app with lifespan handler, CORS, routers, and background workers.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging

from config.settings import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("veliora")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LIFESPAN HANDLER
# Manages startup/shutdown of background workers.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    
    Startup:
    - Initialize settings
    - Start XP flush worker (every 60s)
    - Start diary CRON worker (nightly)
    
    Shutdown:
    - Cancel background workers
    - Close Redis connection
    """
    settings = get_settings()
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # Import workers
    from services.background_tasks import xp_flush_worker, diary_cron_worker
    from services.redis_cache import close_redis_client

    # Start background workers
    xp_task = asyncio.create_task(xp_flush_worker())
    diary_task = asyncio.create_task(diary_cron_worker())

    logger.info("✅ Background workers started (XP flush, Diary CRON)")

    yield  # App is running

    # Shutdown
    logger.info("🛑 Shutting down background workers...")
    xp_task.cancel()
    diary_task.cancel()

    try:
        await xp_task
    except asyncio.CancelledError:
        pass

    try:
        await diary_task
    except asyncio.CancelledError:
        pass

    await close_redis_client()
    logger.info("✅ Shutdown complete")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# APP INITIALIZATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app = FastAPI(
    title="Veliora.AI API",
    description=(
        "Real-time multimodal persona chat backend. "
        "Features: semantic memory, voice calls, games, selfie compositing, "
        "persona diaries, and gamification."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS Middleware ───
settings = get_settings()
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# INCLUDE ROUTERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from api.auth import router as auth_router
from api.chat import router as chat_router
from api.games import router as games_router
from api.voice import router as voice_router
from api.selfie import router as selfie_router
from api.multimodal import router as multimodal_router
from api.diary import router as diary_router

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(games_router)
app.include_router(voice_router)
app.include_router(selfie_router)
app.include_router(multimodal_router)
app.include_router(diary_router)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HEALTH CHECK
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint for deployment probes."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/", tags=["System"])
async def root():
    """Root endpoint with API information."""
    return {
        "app": "Veliora.AI",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "auth": "/api/auth",
            "chat": "/api/chat",
            "games": "/api/games",
            "voice": "/api/voice",
            "selfie": "/api/selfie",
            "multimodal": "/api/multimodal",
            "diary": "/api/diary",
        },
    }

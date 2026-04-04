"""
Veliora.AI — Main Application Entry Point
FastAPI app with Redis Stack + RabbitMQ workers + background tasks.
"""

import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from config.settings import get_settings

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LOGGING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-30s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("veliora")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BACKGROUND WORKER TASKS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

_worker_tasks: list[asyncio.Task] = []


async def _queue_cleanup_loop():
    """Periodically clean empty RabbitMQ queues."""
    from Redis_chat.working_files.queue_cleanup import cleanup_empty_queues
    settings = get_settings()
    while True:
        try:
            await asyncio.to_thread(cleanup_empty_queues)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning(f"Queue cleanup error: {e}")
        await asyncio.sleep(settings.CLEANUP_INTERVAL_SEC)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LIFESPAN
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start/stop Redis Stack, RabbitMQ workers, and background tasks."""
    global _worker_tasks

    # ─── Startup ───
    logger.info("🔥 Veliora.AI starting up...")

    # 1. Initialize Redis Stack (connect + create indexes)
    try:
        from services.redis_cache import init_redis
        init_redis()
        logger.info("✅ Redis Stack connected and indexes created")
    except Exception as e:
        logger.error(f"❌ Redis Stack initialization failed: {e}")
        logger.warning("⚠️  Chat memory features will be unavailable — start Docker redis-stack!")

    # 2. Start RabbitMQ workers
    try:
        from Redis_chat.working_files.memory_worker import monitor_and_consume_memory_queues
        from Redis_chat.working_files.message_worker import monitor_and_consume_message_queues
        from services.redis_cache import get_redis_manager

        redis_mgr = get_redis_manager()

        memory_task = asyncio.create_task(
            monitor_and_consume_memory_queues(redis_mgr),
            name="memory_worker"
        )
        message_task = asyncio.create_task(
            monitor_and_consume_message_queues(redis_mgr),
            name="message_worker"
        )
        cleanup_task = asyncio.create_task(
            _queue_cleanup_loop(),
            name="queue_cleanup"
        )
        _worker_tasks = [memory_task, message_task, cleanup_task]
        logger.info("✅ RabbitMQ workers started (memory, message, cleanup)")
    except Exception as e:
        logger.error(f"❌ RabbitMQ workers failed to start: {e}")
        logger.warning("⚠️  Background processing unavailable — start Docker rabbitmq!")

    # 3. Start XP flush worker
    try:
        from services.background_tasks import xp_flush_worker
        xp_task = asyncio.create_task(xp_flush_worker(), name="xp_flush")
        _worker_tasks.append(xp_task)
        logger.info("✅ XP flush worker started")
    except Exception as e:
        logger.error(f"❌ XP flush worker failed: {e}")

    # 4. Start diary CRON worker
    try:
        from services.background_tasks import diary_cron_worker
        diary_task = asyncio.create_task(diary_cron_worker(), name="diary_cron")
        _worker_tasks.append(diary_task)
        logger.info("✅ Diary CRON worker started")
    except Exception as e:
        logger.error(f"❌ Diary CRON worker failed: {e}")

    logger.info("🚀 Veliora.AI ready!")

    yield  # ─── App is running ───

    # ─── Shutdown ───
    logger.info("🛑 Veliora.AI shutting down...")

    # Cancel all background workers
    for task in _worker_tasks:
        task.cancel()

    # Wait for graceful shutdown
    if _worker_tasks:
        await asyncio.gather(*_worker_tasks, return_exceptions=True)

    # Close RabbitMQ connection
    try:
        from services.rabbitmq_service import close_rabbitmq
        close_rabbitmq()
    except Exception:
        pass

    logger.info("👋 Veliora.AI shut down gracefully.")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# APP CREATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "**Veliora.AI** — AI companion backend with memory-enhanced chat, "
        "voice calls, games, and more. Powered by Redis Stack + RabbitMQ + "
        "Gemini AI + Supabase."
    ),
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ROUTERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from api.auth import router as auth_router
from api.chat import router as chat_router
from api.voice import router as voice_router
from api.games import router as games_router
from api.images import router as images_router
from api.multimodal import router as multimodal_router
from api.diary import router as diary_router
from api.selfie import router as selfie_router

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(voice_router)
app.include_router(games_router)
app.include_router(images_router)
app.include_router(multimodal_router)
app.include_router(diary_router)
app.include_router(selfie_router)

# Mount static files for serving generated images + voice notes
os.makedirs("static/images", exist_ok=True)
os.makedirs("static/audio", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HEALTH CHECK
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint — verifies Redis + RabbitMQ connectivity."""
    from services.redis_cache import get_redis_manager

    redis_ok = False
    try:
        redis_ok = get_redis_manager().ping()
    except Exception:
        pass

    rabbitmq_ok = False
    try:
        import requests as req
        resp = req.get(
            settings.RABBITMQ_API_URL,
            auth=(settings.RABBITMQ_API_USER, settings.RABBITMQ_API_PASS),
            timeout=3,
        )
        rabbitmq_ok = resp.status_code == 200
    except Exception:
        pass

    return {
        "status": "ok" if redis_ok and rabbitmq_ok else "degraded",
        "redis_stack": "connected" if redis_ok else "disconnected",
        "rabbitmq": "connected" if rabbitmq_ok else "disconnected",
        "version": settings.APP_VERSION,
    }


@app.get("/", tags=["System"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }

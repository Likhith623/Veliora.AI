"""
Veliora.AI — Background Tasks & Workers
Handles: message DB sync, XP flushing, diary CRON, embedding generation.
All run asynchronously outside the request-response cycle.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional
from config.settings import get_settings
from config.mappings import XP_REWARDS, calculate_level

logger = logging.getLogger(__name__)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MESSAGE SYNC (Write-Behind Pattern)
# Called as FastAPI BackgroundTask after each chat response
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


async def sync_message_to_db(
    user_id: str,
    bot_id: str,
    role: str,
    content: str,
    language: Optional[str] = None,
):
    """
    Background task: Generate embedding for the message and insert
    into Supabase messages table. Called after every chat exchange.
    
    Both user messages AND bot responses are stored.
    """
    from services.llm_engine import generate_embedding
    from services.supabase_client import insert_message

    try:
        # Generate embedding for vector search
        embedding = await generate_embedding(content)

        # Insert into Supabase
        await insert_message(
            user_id=user_id,
            bot_id=bot_id,
            role=role,
            content=content,
            embedding=embedding if embedding else None,
            language=language,
        )

        logger.debug(f"Synced {role} message to DB for {user_id}:{bot_id}")

    except Exception as e:
        logger.error(f"Failed to sync message to DB: {e}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# XP FLUSH WORKER
# Runs every 60 seconds to flush accumulated XP from Redis to Supabase
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


async def xp_flush_worker():
    """
    Background worker: Periodically flush XP from Redis to Supabase.
    Uses micro-batching — XP accumulates in Redis via HINCRBY,
    then batch-upserted to the user_xp table.
    """
    settings = get_settings()
    logger.info("XP flush worker started")

    while True:
        try:
            await asyncio.sleep(settings.XP_FLUSH_INTERVAL)
            await flush_xp_to_db()
        except asyncio.CancelledError:
            logger.info("XP flush worker cancelled, performing final flush...")
            await flush_xp_to_db()
            break
        except Exception as e:
            logger.error(f"XP flush worker error: {e}")
            await asyncio.sleep(5)  # Brief pause before retry


async def flush_xp_to_db():
    """Execute a single XP flush cycle."""
    from services.redis_cache import get_all_pending_xp, delete_pending_xp_field
    from services.supabase_client import upsert_user_xp

    try:
        pending = await get_all_pending_xp()
        if not pending:
            return

        logger.info(f"Flushing {len(pending)} XP entries to Supabase")

        for key, xp_amount in pending.items():
            try:
                parts = key.split(":", 1)
                if len(parts) == 2:
                    user_id, bot_id = parts
                    await upsert_user_xp(user_id, bot_id, xp_amount)
                    # Delete only THIS key after successful flush (race-safe)
                    await delete_pending_xp_field(key)
            except Exception as e:
                logger.error(f"Failed to flush XP for {key}: {e}")

        logger.info("XP flush completed")

    except Exception as e:
        logger.error(f"XP flush failed: {e}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DIARY CRON JOB
# Runs nightly to generate persona diary entries
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


async def diary_cron_worker():
    """
    Background worker: Generate persona diary entries nightly.
    
    Flow:
    1. Get all active user-bot pairs
    2. For each pair, fetch today's messages
    3. Ask Gemini to write a first-person diary entry
    4. Save to diaries table
    """
    settings = get_settings()
    logger.info("Diary CRON worker started")

    while True:
        try:
            # Calculate time until next midnight UTC
            now = datetime.now(timezone.utc)
            next_run = now.replace(
                hour=settings.DIARY_CRON_HOUR,
                minute=0,
                second=0,
                microsecond=0,
            )
            if next_run <= now:
                # If we've passed today's run time, schedule for tomorrow
                from datetime import timedelta
                next_run = next_run + timedelta(days=1)

            wait_seconds = (next_run - now).total_seconds()
            logger.info(f"Diary CRON: next run in {wait_seconds:.0f}s at {next_run}")
            await asyncio.sleep(wait_seconds)

            await generate_all_diaries()

        except asyncio.CancelledError:
            logger.info("Diary CRON worker cancelled")
            break
        except Exception as e:
            logger.error(f"Diary CRON worker error: {e}")
            await asyncio.sleep(3600)  # Retry in 1 hour


async def generate_all_diaries():
    """Execute a single diary generation cycle for all active pairs."""
    from services.supabase_client import (
        get_all_user_bot_pairs,
        get_today_messages,
        insert_diary_entry,
    )
    from services.llm_engine import generate_diary_entry
    try:
        pairs = await get_all_user_bot_pairs()
        if not pairs:
            logger.info("No active user-bot pairs for diary generation")
            return

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        generated_count = 0

        for pair in pairs:
            user_id = pair.get("user_id")
            bot_id = pair.get("bot_id")

            if not user_id or not bot_id:
                continue

            try:
                messages = await get_today_messages(user_id, bot_id)
                if not messages or len(messages) < 3:
                    # Skip if very few messages (not enough for a meaningful diary)
                    continue

                # Get bot name from prompts (extract from the prompt template)
                bot_name = bot_id.replace("_", " ").title()

                diary_text, mood = await generate_diary_entry(
                    bot_id, bot_name, messages
                )

                await insert_diary_entry(
                    user_id=user_id,
                    bot_id=bot_id,
                    entry_date=today,
                    content=diary_text,
                    mood=mood,
                )

                generated_count += 1

            except Exception as e:
                logger.error(f"Diary generation failed for {user_id}:{bot_id}: {e}")
                continue

        logger.info(f"Diary CRON: generated {generated_count} entries")

    except Exception as e:
        logger.error(f"Diary generation cycle failed: {e}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# XP EVENT HANDLER
# Centralised XP awarding with streak multiplier
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


async def award_xp(
    user_id: str,
    bot_id: str,
    action: str,
    custom_amount: Optional[int] = None,
) -> dict:
    """
    Award XP for an action. Uses the configured XP_REWARDS table.
    Applies streak multiplier for bonus XP.
    
    Args:
        user_id: The user's ID
        bot_id: The bot interacted with
        action: XP action key from XP_REWARDS
        custom_amount: Override amount (for dynamic XP like message length)
    
    Returns: {"base_xp": int, "multiplier": float, "total_earned": int}
    """
    from services.redis_cache import increment_xp
    from services.supabase_client import get_user_profile
    from config.mappings import calculate_streak_multiplier

    base_xp = custom_amount if custom_amount is not None else XP_REWARDS.get(action, 0)
    if base_xp == 0:
        return {"base_xp": 0, "multiplier": 1.0, "total_earned": 0}

    # Get streak multiplier
    try:
        profile = await get_user_profile(user_id)
        streak_days = profile.get("streak_days", 0) if profile else 0
        multiplier = calculate_streak_multiplier(streak_days)
    except Exception:
        multiplier = 1.0

    total_earned = int(base_xp * multiplier)

    # Accumulate in Redis (flushed to DB every 60s)
    await increment_xp(user_id, bot_id, total_earned)

    return {
        "base_xp": base_xp,
        "multiplier": multiplier,
        "total_earned": total_earned,
    }

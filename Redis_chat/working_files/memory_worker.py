"""
Redis_chat — Memory Worker
Consumes RabbitMQ memory_tasks queues, extracts and stores memories in Redis.

Adapted for Veliora.AI: uses bot_id, Veliora settings.
"""

import os
import json
import asyncio
import aio_pika
import requests
import time
import logging

from config.settings import get_settings
from Redis_chat.working_files.memory_functions import (
    generate_candidate_memories, update_user_memory,
)
from Redis_chat.working_files.redis_class import RedisManager

logger = logging.getLogger(__name__)

_settings = get_settings()
RABBIT_URL = _settings.RABBITMQ_URL
RABBITMQ_API_URL = _settings.RABBITMQ_API_URL
RABBITMQ_API_USER = _settings.RABBITMQ_API_USER
RABBITMQ_API_PASS = _settings.RABBITMQ_API_PASS
POLL_INTERVAL_SEC = 20


def is_memory_queue(queue_name):
    return queue_name.startswith("memory_tasks_user_")


async def on_memory_task(redis_manager, msg: aio_pika.IncomingMessage):
    """Process a memory extraction task from RabbitMQ."""
    async with msg.process():
        try:
            data = json.loads(msg.body)
            user_id = data.get("user_id")
            user_msg = data.get("user_message", "")
            bot_resp = data.get("bot_response", "")
            bot_id = data.get("bot_id")

            if not user_id or not user_msg or not bot_resp or not bot_id:
                logger.warning(f"[MemoryWorker] Skipping: missing fields: {data}")
                return

            start_time = time.perf_counter()
            logger.info(f"[MemoryWorker] Processing: user={user_id}, bot={bot_id}")

            try:
                candidates = await generate_candidate_memories(user_id, user_msg, bot_resp)
                logger.info(f"[MemoryWorker] Generated {len(candidates)} memories")
            except Exception as e:
                logger.error(f"[MemoryWorker] Candidate generation error: {e}")
                candidates = []

            if not candidates:
                logger.info(f"[MemoryWorker] No new memories for {user_id}")
            else:
                for i, cand in enumerate(candidates):
                    try:
                        result = await update_user_memory(
                            redis_manager, cand, user_id, user_msg, bot_resp, bot_id
                        )
                        logger.info(f"[MemoryWorker] Memory {i+1}: {result}")
                    except Exception as e:
                        logger.error(f"[MemoryWorker] Update memory {i+1} error: {e}")

            total = time.perf_counter() - start_time
            logger.info(f"[MemoryWorker] Done for {user_id} in {total:.3f}s")
        except Exception as e:
            logger.error(f"[MemoryWorker] Fatal error: {e}")


async def monitor_and_consume_memory_queues(redis_manager: RedisManager = None):
    """Continuously discover and consume memory task queues from RabbitMQ."""
    if redis_manager is None:
        redis_manager = RedisManager()

    logger.info("[MemoryWorker] Connecting to RabbitMQ...")
    conn = await aio_pika.connect_robust(RABBIT_URL)
    channel = await conn.channel()
    await channel.set_qos(prefetch_count=3)

    consumers = {}

    async def add_consumer(queue_name):
        if queue_name in consumers:
            return
        queue = await channel.declare_queue(queue_name, durable=True)
        tag = await queue.consume(lambda msg: on_memory_task(redis_manager, msg))
        consumers[queue_name] = tag
        logger.info(f"[MemoryWorker] Consuming: {queue_name}")

    while True:
        try:
            resp = requests.get(
                RABBITMQ_API_URL,
                auth=(RABBITMQ_API_USER, RABBITMQ_API_PASS),
                timeout=5,
            )
            resp.raise_for_status()
            all_queues = [q['name'] for q in resp.json()]
            memory_queues = [q for q in all_queues if is_memory_queue(q)]

            for q in memory_queues:
                await add_consumer(q)

            # Prune stale consumers
            active = set(memory_queues)
            stale = [q for q in list(consumers.keys()) if q not in active]
            for q in stale:
                del consumers[q]

            logger.debug(f"[MemoryWorker] Listening to {len(consumers)} queues")
        except Exception as e:
            logger.warning(f"[MemoryWorker] Queue discovery error: {e}")
        await asyncio.sleep(POLL_INTERVAL_SEC)


if __name__ == "__main__":
    asyncio.run(monitor_and_consume_memory_queues())

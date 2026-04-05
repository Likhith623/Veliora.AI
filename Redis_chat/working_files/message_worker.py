"""
Redis_chat — Message Worker
Consumes RabbitMQ message_logs queues, logs chat exchanges to Redis.

Adapted for Veliora.AI: uses bot_id, Veliora settings.
"""

import os
import json
import asyncio
import aio_pika
import requests
import logging

from config.settings import get_settings
from Redis_chat.working_files.memory_functions import log_message
from Redis_chat.working_files.redis_class import RedisManager

logger = logging.getLogger(__name__)

_settings = get_settings()
RABBIT_URL = _settings.RABBITMQ_URL
RABBITMQ_API_URL = _settings.RABBITMQ_API_URL
RABBITMQ_API_USER = _settings.RABBITMQ_API_USER
RABBITMQ_API_PASS = _settings.RABBITMQ_API_PASS
POLL_INTERVAL_SEC = 20


def is_message_log_queue(queue_name):
    return queue_name.startswith("message_logs_user_")


async def on_message_log(redis_manager, msg: aio_pika.IncomingMessage):
    """Process a message log from RabbitMQ and store in Redis."""
    async with msg.process():
        try:
            data = json.loads(msg.body)
            user_id = data.get("user_id", "")
            bot_id = data.get("bot_id", "")
            user_message = data.get("user_message", "")
            bot_response = data.get("bot_response", "")
            activity_type = data.get("activity_type", "chat")
            media_url = data.get("media_url")

            if not user_id or not bot_id:
                logger.warning(f"[MessageWorker] Skipping: missing user_id or bot_id")
                return

            await log_message(
                redis_manager, user_id, bot_id,
                user_message, bot_response,
                activity_type=activity_type,
                media_url=media_url
            )
            logger.debug(f"[MessageWorker] Logged for {user_id}:{bot_id}")
        except Exception as e:
            logger.error(f"[MessageWorker] Error: {e}")


async def monitor_and_consume_message_queues(redis_manager: RedisManager = None):
    """Continuously discover and consume message log queues from RabbitMQ."""
    if redis_manager is None:
        redis_manager = RedisManager()

    logger.info("[MessageWorker] Connecting to RabbitMQ...")
    conn = await aio_pika.connect_robust(RABBIT_URL)
    channel = await conn.channel()
    await channel.set_qos(prefetch_count=10)

    consumers = {}

    async def add_consumer(queue_name):
        if queue_name in consumers:
            return
        queue = await channel.declare_queue(queue_name, durable=True)
        tag = await queue.consume(lambda msg: on_message_log(redis_manager, msg))
        consumers[queue_name] = tag
        logger.info(f"[MessageWorker] Consuming: {queue_name}")

    while True:
        try:
            resp = requests.get(
                RABBITMQ_API_URL,
                auth=(RABBITMQ_API_USER, RABBITMQ_API_PASS),
                timeout=5,
            )
            resp.raise_for_status()
            all_queues = [q['name'] for q in resp.json()]
            log_queues = [q for q in all_queues if is_message_log_queue(q)]

            for q in log_queues:
                await add_consumer(q)

            # Prune stale consumers
            active = set(log_queues)
            stale = [q for q in list(consumers.keys()) if q not in active]
            for q in stale:
                del consumers[q]

            logger.debug(f"[MessageWorker] Listening to {len(consumers)} queues")
        except Exception as e:
            logger.warning(f"[MessageWorker] Queue discovery error: {e}")
        await asyncio.sleep(POLL_INTERVAL_SEC)


if __name__ == "__main__":
    asyncio.run(monitor_and_consume_message_queues())

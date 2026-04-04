"""
Veliora.AI — RabbitMQ Publisher Service
Publishes messages to RabbitMQ queues for async background processing.

Queues:
- memory_tasks_user_{user_id} : Memory extraction tasks
- message_logs_user_{user_id} : Chat message log tasks
"""

import json
import logging
import pika
from typing import Optional

from config.settings import get_settings

logger = logging.getLogger(__name__)

_connection: Optional[pika.BlockingConnection] = None
_channel = None


def _get_channel():
    """Get or create a persistent RabbitMQ channel."""
    global _connection, _channel

    try:
        if _connection and _connection.is_open and _channel and _channel.is_open:
            return _channel
    except Exception:
        pass

    settings = get_settings()
    try:
        params = pika.URLParameters(settings.RABBITMQ_URL)
        _connection = pika.BlockingConnection(params)
        _channel = _connection.channel()
        logger.info("RabbitMQ connection established")
        return _channel
    except Exception as e:
        logger.error(f"Failed to connect to RabbitMQ: {e}")
        return None


def publish_memory_task(
    user_id: str, bot_id: str, user_message: str, bot_response: str
):
    """
    Publish a memory extraction task to the user's memory queue.
    The memory_worker will consume this and extract/store memories.
    """
    channel = _get_channel()
    if not channel:
        logger.warning("RabbitMQ unavailable, skipping memory task")
        return

    queue_name = f"memory_tasks_user_{user_id}"
    try:
        channel.queue_declare(queue=queue_name, durable=True)
        body = json.dumps({
            "user_id": user_id,
            "bot_id": bot_id,
            "user_message": user_message,
            "bot_response": bot_response,
        })
        channel.basic_publish(
            exchange="",
            routing_key=queue_name,
            body=body,
            properties=pika.BasicProperties(delivery_mode=2),  # persistent
        )
        logger.debug(f"Published memory task for {user_id}:{bot_id}")
    except Exception as e:
        logger.error(f"Failed to publish memory task: {e}")
        # Reset channel on failure
        global _connection
        _connection = None


def publish_message_log(
    user_id: str, bot_id: str, user_message: str, bot_response: str
):
    """
    Publish a chat message log to the user's message queue.
    The message_worker will consume this and store in Redis.
    """
    channel = _get_channel()
    if not channel:
        logger.warning("RabbitMQ unavailable, skipping message log")
        return

    queue_name = f"message_logs_user_{user_id}"
    try:
        channel.queue_declare(queue=queue_name, durable=True)
        body = json.dumps({
            "user_id": user_id,
            "bot_id": bot_id,
            "user_message": user_message,
            "bot_response": bot_response,
        })
        channel.basic_publish(
            exchange="",
            routing_key=queue_name,
            body=body,
            properties=pika.BasicProperties(delivery_mode=2),
        )
        logger.debug(f"Published message log for {user_id}:{bot_id}")
    except Exception as e:
        logger.error(f"Failed to publish message log: {e}")
        global _connection
        _connection = None


def close_rabbitmq():
    """Close the RabbitMQ connection gracefully."""
    global _connection, _channel
    try:
        if _channel and _channel.is_open:
            _channel.close()
        if _connection and _connection.is_open:
            _connection.close()
        logger.info("RabbitMQ connection closed")
    except Exception as e:
        logger.warning(f"Error closing RabbitMQ: {e}")
    _connection = None
    _channel = None

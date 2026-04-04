"""
Redis_chat — Queue Cleanup Service
Periodically removes empty RabbitMQ queues.

Adapted for Veliora.AI: uses settings.
"""

import requests
import time
import logging

from config.settings import get_settings

logger = logging.getLogger(__name__)

_settings = get_settings()
RABBITMQ_API_URL = _settings.RABBITMQ_API_URL
RABBITMQ_API_USER = _settings.RABBITMQ_API_USER
RABBITMQ_API_PASS = _settings.RABBITMQ_API_PASS
CLEANUP_INTERVAL_SEC = _settings.CLEANUP_INTERVAL_SEC

auth = (RABBITMQ_API_USER, RABBITMQ_API_PASS)


def cleanup_empty_queues():
    """Delete all empty memory/message log queues from RabbitMQ."""
    try:
        resp = requests.get(RABBITMQ_API_URL, auth=auth, timeout=10)
        resp.raise_for_status()
        for queue in resp.json():
            name = queue['name']
            if name.startswith("message_logs_user_") or name.startswith("memory_tasks_user_"):
                if queue['messages'] == 0:
                    vhost = queue['vhost'].replace('/', '%2F')
                    base_url = RABBITMQ_API_URL.rsplit('/api/queues', 1)[0]
                    del_url = f"{base_url}/api/queues/{vhost}/{name}"
                    r = requests.delete(del_url, auth=auth, timeout=10)
                    if r.status_code == 204:
                        logger.debug(f"Deleted empty queue: {name}")
        logger.debug("Queue cleanup completed.")
    except Exception as e:
        logger.warning(f"Queue cleanup error: {e}")


if __name__ == "__main__":
    print("Starting periodic RabbitMQ cleanup...")
    while True:
        cleanup_empty_queues()
        time.sleep(CLEANUP_INTERVAL_SEC)

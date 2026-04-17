import sys

with open("api/emotion_dashboard.py", "r") as f:
    text = f.read()

text = text.replace("from services.redis_cache import get_redis_client", "from services.redis_cache import get_redis_manager")

old_redis_try = """        try:
            rc = get_redis_client()
            if rc:
                # We can check specific bot or general. Assuming general for simplicity here or we can just fetch if the dashboard provides bot_id.
                # It is requested to merge live alert state into the analytics response.
                active_alert_state = get_active_alert_state(rc, user_id, "default")
        except Exception as e:"""

new_redis_try = """        try:
            rm = get_redis_manager()
            if rm and rm.client:
                # We can check specific bot or general. Assuming general for simplicity here or we can just fetch if the dashboard provides bot_id.
                # It is requested to merge live alert state into the analytics response.
                active_alert_state = get_active_alert_state(rm.client, user_id, "default")
        except Exception as e:"""

text = text.replace(old_redis_try, new_redis_try)

with open("api/emotion_dashboard.py", "w") as f:
    f.write(text)


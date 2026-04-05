from realtime_communication.services.supabase_client import get_supabase
db = get_supabase()
try:
    print("Testing profiles:sender_id(display_name)")
    res = db.table("family_room_messages_realtime").select("*, profiles:sender_id(display_name, avatar_config, country)").limit(1).execute()
    print("Success profiles:sender_id")
except Exception as e:
    print(f"Error: {e}")

try:
    print("Testing profiles_realtime(display_name)")
    res = db.table("family_room_messages_realtime").select("*, profiles_realtime(display_name, avatar_config, country)").limit(1).execute()
    print("Success profiles_realtime")
except Exception as e:
    print(f"Error: {e}")

try:
    print("\nTesting matching_queue_realtime_user_id_fkey")
    res = db.table("matching_queue_realtime").select("*, profiles_realtime!matching_queue_realtime_user_id_fkey(*)").limit(1).execute()
    print("Success matching_queue_realtime_user_id_fkey")
except Exception as e:
    print(f"Error: {e}")

try:
    print("\nTesting original matching_queue_user_id_fkey")
    res = db.table("matching_queue_realtime").select("*, profiles!matching_queue_user_id_fkey(*)").limit(1).execute()
    print("Success original matching_queue_user_id_fkey")
except Exception as e:
    print(f"Error: {e}")

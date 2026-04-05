from supabase import create_client, Client
from realtime_communication.config import get_settings
from typing import Dict, Any, Optional

# Specific mappings for anomaly tables that deviate from standard naming
TABLE_MAPPINGS: Dict[str, str] = {
    "messages": "messages_realtime_comunicatio_realtime",
    "games_realtime_communication": "games_realtime_communication"
}

def get_table_name(base_name: str) -> str:
    """
    O(1) mapping of logical table names to actual Supabase schema names.
    Automatically appends the required '_realtime' suffix.
    """
    if base_name in TABLE_MAPPINGS:
        return TABLE_MAPPINGS[base_name]
    
    if base_name.endswith("_realtime"):
        return base_name
        
    return f"{base_name}_realtime"

class RealtimeSupabaseClient:
    """
    Architectural Wrapper around Supabase Client.
    Intercepts .table() calls to automatically resolve mapped names, while 
    delegating `.auth` seamlessly to maintain the Unified Auth architecture requirements.
    """
    def __init__(self, client: Client):
        self._client = client

    def table(self, table_name: str):
        actual_name = get_table_name(table_name)
        return self._client.table(actual_name)

    def __getattr__(self, item: str) -> Any:
        """Delegate auth, storage, and functions native to the Supabase client."""
        return getattr(self._client, item)

# Lazy-initialized clients
_supabase_admin: Optional[RealtimeSupabaseClient] = None
_supabase_auth: Optional[RealtimeSupabaseClient] = None

def get_supabase() -> RealtimeSupabaseClient:
    """Get the admin Supabase client (bypasses RLS)."""
    global _supabase_admin
    if _supabase_admin is None:
        settings = get_settings()
        raw_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        _supabase_admin = RealtimeSupabaseClient(raw_client)
    return _supabase_admin

def get_auth_client() -> RealtimeSupabaseClient:
    """Get the auth Supabase client (for user authentication)."""
    global _supabase_auth
    if _supabase_auth is None:
        settings = get_settings()
        raw_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        _supabase_auth = RealtimeSupabaseClient(raw_client)
    return _supabase_auth
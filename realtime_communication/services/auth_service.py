"""Authentication service - JWT verification and user extraction."""
from fastapi import Header, HTTPException, Depends
from typing import Optional
from realtime_communication.services.supabase_client import get_supabase


async def get_current_user_id(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_user_id: Optional[str] = Header(None, alias="X-User-ID")
) -> str:
    """
    Extract user_id from JWT token or X-User-ID header.
    For demo purposes, also accepts X-User-ID header.
    """
    db = get_supabase()
    
    # First try X-User-ID header (for demo/development)
    if x_user_id:
        return x_user_id
    
    # Try to get from Authorization header
    if authorization:
        try:
            # Remove "Bearer " prefix if present
            token = authorization.replace("Bearer ", "").strip()
            if not token:
                raise HTTPException(status_code=401, detail="No token provided")
            
            # Verify token with Supabase
            user_response = db.auth.get_user(token)
            if user_response and user_response.user:
                return str(user_response.user.id)
        except Exception as e:
            # Token invalid or expired
            raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    
    raise HTTPException(status_code=401, detail="Authentication required")


async def get_optional_user_id(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_user_id: Optional[str] = Header(None, alias="X-User-ID")
) -> Optional[str]:
    """
    Same as get_current_user_id but returns None instead of raising error.
    Useful for endpoints that can work with or without authentication.
    """
    try:
        return await get_current_user_id(authorization, x_user_id)
    except HTTPException:
        return None

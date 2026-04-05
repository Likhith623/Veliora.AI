"""XP router — gift XP, view leaderboard, check stats, transaction history."""
from fastapi import APIRouter, HTTPException, Depends

from realtime_communication.models.schemas import GiftXPRequest
from realtime_communication.services.auth_service import get_current_user_id
from realtime_communication.services.supabase_client import get_supabase
from realtime_communication.services.xp_service import gift_xp, get_friend_leaderboard, _ensure_xp_row

router = APIRouter(prefix="/xp", tags=["XP & Leaderboard"])


@router.get("/me")
async def get_my_xp(current_user: str = Depends(get_current_user_id)):
    """Get current user's XP stats."""
    db = get_supabase()
    xp = _ensure_xp_row(db, current_user)
    return {"xp": xp}


@router.post("/gift")
async def send_xp_gift(req: GiftXPRequest, current_user: str = Depends(get_current_user_id)):
    """Gift XP to a friend. Your XP is deducted, theirs increases."""
    if current_user == req.receiver_id:
        raise HTTPException(status_code=400, detail="Cannot gift XP to yourself")
    
    db = get_supabase()
    
    # Verify friendship
    rel = db.table("relationships_realtime") \
        .select("id") \
        .or_(
            f"and(user_a_id.eq.{current_user},user_b_id.eq.{req.receiver_id}),"
            f"and(user_a_id.eq.{req.receiver_id},user_b_id.eq.{current_user})"
        ) \
        .eq("status", "active") \
        .execute()
    
    if not rel.data:
        raise HTTPException(status_code=403, detail="You can only gift XP to friends")
    
    result = await gift_xp(current_user, req.receiver_id, req.amount)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/leaderboard")
async def get_leaderboard(current_user: str = Depends(get_current_user_id)):
    """Get XP leaderboard of your friends."""
    leaderboard = await get_friend_leaderboard(current_user)
    return {"leaderboard": leaderboard}


@router.get("/transactions")
async def get_xp_transactions(
    limit: int = 20,
    offset: int = 0,
    current_user: str = Depends(get_current_user_id)
):
    """Get XP transaction history."""
    db = get_supabase()
    
    txs = db.table("xp_transactions_realtime") \
        .select("*") \
        .eq("user_id", current_user) \
        .order("created_at", desc=True) \
        .range(offset, offset + limit - 1) \
        .execute()
    
    return {"transactions": txs.data or [], "count": len(txs.data or [])}


@router.get("/{user_id}")
async def get_user_xp(user_id: str, current_user: str = Depends(get_current_user_id)):
    """Get another user's XP stats (if friends)."""
    db = get_supabase()
    
    # Verify friendship
    rel = db.table("relationships_realtime") \
        .select("id") \
        .or_(
            f"and(user_a_id.eq.{current_user},user_b_id.eq.{user_id}),"
            f"and(user_a_id.eq.{user_id},user_b_id.eq.{current_user})"
        ) \
        .eq("status", "active") \
        .execute()
    
    if not rel.data and user_id != current_user:
        raise HTTPException(status_code=403, detail="You can only view XP of friends")
    
    xp = _ensure_xp_row(db, user_id)
    return {"xp": xp}

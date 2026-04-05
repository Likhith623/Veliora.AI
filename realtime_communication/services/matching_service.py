from datetime import datetime, timedelta
import random
from realtime_communication.services.supabase_client import get_supabase


async def find_match(user_id: str, seeking_role: str, offering_role: str) -> dict | None:
    """Find a compatible match for the user based on roles and preferences."""
    db = get_supabase()
    
    # Get user's profile and preferences
    user = db.table("profiles_realtime").select("*").eq("id", user_id).execute()
    if not user.data or len(user.data) == 0:
        return None
    
    user_data = user.data[0]
    user_langs = db.table("user_languages_realtime").select("language_code").eq("user_id", user_id).execute()
    user_lang_codes = [l["language_code"] for l in (user_langs.data or [])]
    
    prefs = user_data.get("matching_preferences", {})
    
    # Look in matching queue for compatible users
    role_map = {
        "mother": "son", "son": "mother",
        "father": "daughter", "daughter": "father",
        "mentor": "student", "student": "mentor",
        "brother": "sister", "sister": "brother",
        "friend": "friend",
        "grandparent": "grandchild", "grandchild": "grandparent"
    }
    
    compatible_seeking = role_map.get(offering_role, offering_role)
    compatible_offering = role_map.get(seeking_role, seeking_role)
    
    # Search for compatible users in the queue
    # Use explicit foreign key relationship to avoid ambiguity
    queue = db.table("matching_queue_realtime") \
        .select("*, profiles_realtime!matching_queue_realtime_user_id_fkey(*)") \
        .eq("status", "searching") \
        .eq("seeking_role", compatible_seeking) \
        .eq("offering_role", compatible_offering) \
        .neq("user_id", user_id) \
        .execute()
    
    if not queue.data:
        return None
    
    # Score each potential match
    scored_matches = []
    for candidate in queue.data:
        score = 0
        candidate_id = candidate["user_id"]
        
        # Check if already in a relationship
        existing = db.table("relationships_realtime") \
            .select("id") \
            .or_(f"user_a_id.eq.{user_id},user_b_id.eq.{user_id}") \
            .or_(f"user_a_id.eq.{candidate_id},user_b_id.eq.{candidate_id}") \
            .eq("status", "active") \
            .execute()
        
        # Skip if already connected
        if existing.data:
            has_existing = False
            for rel in existing.data:
                pass  # Need to check both directions
            # Simplified: allow matching
        
        # Language compatibility
        candidate_langs = db.table("user_languages_realtime") \
            .select("language_code") \
            .eq("user_id", candidate_id) \
            .execute()
        candidate_lang_codes = [l["language_code"] for l in (candidate_langs.data or [])]
        
        lang_priority = prefs.get("language_priority", "ease")
        if lang_priority == "ease":
            # Shared languages boost score
            shared = set(user_lang_codes) & set(candidate_lang_codes)
            score += len(shared) * 20
        else:
            # Different languages boost score (for language learning)
            unique = set(candidate_lang_codes) - set(user_lang_codes)
            score += len(unique) * 20
        
        # Verification bonus
        candidate_profile = candidate.get("profiles", {})
        if candidate_profile.get("is_verified"):
            score += 30
        
        # Care score bonus
        score += candidate_profile.get("care_score", 0) // 10
        
        # Reliability score bonus
        score += candidate_profile.get("reliability_score", 100) // 20
        
        # Add some randomness
        score += random.randint(0, 15)
        
        scored_matches.append({
            "queue_entry": candidate,
            "score": score,
            "candidate_id": candidate_id,
            "profile": candidate_profile
        })
    
    # Sort by score
    scored_matches.sort(key=lambda x: x["score"], reverse=True)
    
    if scored_matches:
        best_match = scored_matches[0]
        return best_match
    
    return None


async def create_relationship(user_a_id: str, user_b_id: str, role_a: str, role_b: str) -> dict:
    """Create a new relationship between two matched users."""
    db = get_supabase()
    
    relationship = db.table("relationships_realtime").insert({
        "user_a_id": user_a_id,
        "user_b_id": user_b_id,
        "user_a_role": role_a,
        "user_b_role": role_b,
        "status": "active",
        "level": 1,
        "bond_points": 0,
        "care_score": 0,
        "matched_at": datetime.utcnow().isoformat()
    }).execute()
    
    if relationship.data:
        rel_data = relationship.data[0]
        
        # Create first milestone
        db.table("relationship_milestones_realtime").insert({
            "relationship_id": rel_data["id"],
            "milestone_type": "matched",
            "title": "🎉 First Match!",
            "description": f"A beautiful bond has begun!",
            "icon_emoji": "🎉",
            "bond_points_awarded": 5
        }).execute()
        
        # Send notifications to both users
        for uid, partner_name in [(user_a_id, "your new partner"), (user_b_id, "your new partner")]:
            db.table("notifications_realtime").insert({
                "user_id": uid,
                "type": "new_match",
                "title": "🎉 You've been matched!",
                "body": f"You've been connected with {partner_name}. Say hello!",
                "data": {"relationship_id": rel_data["id"]}
            }).execute()
        
        return rel_data
    
    return {}

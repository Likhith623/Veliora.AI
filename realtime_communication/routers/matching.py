"""Matching router - Find and create bonds."""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime
from realtime_communication.models.schemas import MatchRequest
from realtime_communication.services.supabase_client import get_supabase
from realtime_communication.services.matching_service import find_match, create_relationship
from realtime_communication.services.auth_service import get_current_user_id

router = APIRouter(prefix="/matching", tags=["Matching"])

# Valid roles constant
VALID_ROLES = ["mother", "father", "son", "daughter", "mentor", "student", 
               "brother", "sister", "friend", "grandparent", "grandchild", 
               "sibling", "penpal"]


# ─── Public Endpoints (No Auth Required) ───────────────────────────────────────

@router.get("/browse/{role}")
async def browse_by_role(role: str):
    """Browse profiles offering a specific role. This is the MAIN search endpoint.
    Searches both the dedicated 'role' column AND matching_preferences JSONB."""
    db = get_supabase()
    
    role_lower = role.lower().strip()
    
    # Handle aliases
    role_aliases = {
        "sibling": ["brother", "sister", "sibling"],
        "brother": ["brother", "sibling"],
        "sister": ["sister", "sibling"],
        "penpal": ["penpal", "friend"],
    }
    
    search_roles = role_aliases.get(role_lower, [role_lower])
    
    if role_lower not in VALID_ROLES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid role '{role}'. Valid roles: {', '.join(VALID_ROLES)}"
        )
    
    # Get ALL profiles that aren't banned — include top-level offering/role columns
    profiles = db.table("profiles_realtime") \
        .select("id, display_name, country, city, avatar_config, is_verified, care_score, bio, matching_preferences, offering_role, role") \
        .eq("is_banned", False) \
        .execute()
    
    matching_profiles = []
    seen_ids = set()
    
    for profile in (profiles.data or []):
        if profile["id"] in seen_ids:
            continue
            
        # Check matching_preferences JSONB and top-level columns for role info
        prefs = profile.get("matching_preferences") or {}
        pref_offering = (prefs.get("offering_role") or profile.get("offering_role") or profile.get("role") or "").lower().strip()
        preferred_roles = [r.lower().strip() for r in (prefs.get("preferred_roles") or [])]
        
        # Check if any of the search roles match
        is_match = False
        matched_role = None
        
        for search_role in search_roles:
            # Check matching_preferences.offering_role
            if pref_offering == search_role:
                is_match = True
                matched_role = pref_offering
                break
            # Check matching_preferences.preferred_roles array
            elif search_role in preferred_roles:
                is_match = True
                matched_role = search_role
                break
        
        if is_match:
            seen_ids.add(profile["id"])
            matching_profiles.append({
                "id": profile["id"],
                "display_name": profile["display_name"],
                "country": profile.get("country"),
                "city": profile.get("city"),
                "avatar_config": profile.get("avatar_config"),
                "is_verified": profile.get("is_verified", False),
                "care_score": profile.get("care_score", 0),
                "bio": profile.get("bio"),
                "offering_role": matched_role,
                "seeking_role": prefs.get("seeking_role")
            })
    
    # Sort by care_score descending, then verified first
    matching_profiles.sort(key=lambda p: (p.get("is_verified", False), p.get("care_score", 0)), reverse=True)
    
    return {
        "role": role_lower,
        "count": len(matching_profiles),
        "profiles": matching_profiles,
        "searched_roles": search_roles
    }


@router.get("/browse-public/{role}")
async def browse_by_role_public(role: str):
    """Alias for browse endpoint (backwards compatibility)."""
    return await browse_by_role(role)


# ─── Authenticated Endpoints ───────────────────────────────────────────────────

@router.post("/connect/{target_user_id}")
async def connect_with_user(
    target_user_id: str,
    role: str = Query(..., description="The role you are browsing (e.g. 'mother')"),
    current_user: str = Depends(get_current_user_id)
):
    """Directly connect with a browsed user — creates a relationship and opens chat."""
    if current_user == target_user_id:
        raise HTTPException(status_code=400, detail="You cannot connect with yourself")

    db = get_supabase()

    # Check both profiles exist and aren't banned
    my_profile = db.table("profiles_realtime").select("id, display_name, is_banned, matching_preferences").eq("id", current_user).execute()
    target_profile = db.table("profiles_realtime").select("id, display_name, country, city, avatar_config, is_verified, care_score, bio, is_banned, matching_preferences").eq("id", target_user_id).execute()

    if not my_profile.data:
        raise HTTPException(status_code=404, detail="Your profile was not found")
    if not target_profile.data:
        raise HTTPException(status_code=404, detail="User not found")
    if my_profile.data[0].get("is_banned"):
        raise HTTPException(status_code=403, detail="Your account is banned")
    if target_profile.data[0].get("is_banned"):
        raise HTTPException(status_code=403, detail="This user is no longer available")

    # Check if there's already an active relationship between them
    existing = db.table("relationships_realtime") \
        .select("id, status") \
        .or_(
            f"and(user_a_id.eq.{current_user},user_b_id.eq.{target_user_id}),"
            f"and(user_a_id.eq.{target_user_id},user_b_id.eq.{current_user})"
        ) \
        .execute()

    for rel in (existing.data or []):
        if rel["status"] == "active":
            # Already connected — just return the existing relationship
            return {
                "status": "already_connected",
                "relationship": rel,
                "partner": target_profile.data[0],
                "message": "You are already connected with this person!"
            }

    # Determine roles
    role_lower = role.lower().strip()
    target_prefs = target_profile.data[0].get("matching_preferences") or {}
    target_offering = (target_prefs.get("offering_role") or role_lower).lower().strip()

    # My role: infer from my preferences or use a complementary role
    my_prefs = my_profile.data[0].get("matching_preferences") or {}
    my_offering = (my_prefs.get("offering_role") or "").lower().strip()
    # If I don't have an offering role, use a sensible default
    if not my_offering:
        role_complements = {
            "mother": "son", "father": "daughter", "son": "mother", "daughter": "father",
            "mentor": "student", "student": "mentor", "brother": "sister", "sister": "brother",
            "friend": "friend", "grandparent": "grandchild", "grandchild": "grandparent",
            "sibling": "sibling", "penpal": "penpal",
        }
        my_offering = role_complements.get(role_lower, "friend")

    # Create the relationship
    relationship = await create_relationship(
        user_a_id=current_user,
        user_b_id=target_user_id,
        role_a=my_offering,
        role_b=target_offering
    )

    return {
        "status": "connected",
        "relationship": relationship,
        "partner": target_profile.data[0],
        "message": f"You are now connected with {target_profile.data[0].get('display_name', 'your new bond')}!"
    }


@router.post("/search")
async def search_for_match(req: MatchRequest, user_id: str = Depends(get_current_user_id)):
    """Enter the matching queue and search for a partner."""
    db = get_supabase()
    
    # Check if user is verified
    profile = db.table("profiles_realtime").select("is_verified, is_banned").eq("id", user_id).execute()
    if not profile.data or len(profile.data) == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile_data = profile.data[0]
    if profile_data.get("is_banned"):
        raise HTTPException(status_code=403, detail="Account is banned")
    
    # Cancel any existing queue entries
    db.table("matching_queue_realtime") \
        .update({"status": "cancelled"}) \
        .eq("user_id", user_id) \
        .eq("status", "searching") \
        .execute()
    
    # Add to matching queue
    queue_entry = db.table("matching_queue_realtime").insert({
        "user_id": user_id,
        "seeking_role": req.seeking_role,
        "offering_role": req.offering_role,
        "preferred_age_min": req.preferred_age_min,
        "preferred_age_max": req.preferred_age_max,
        "preferred_countries": req.preferred_countries,
        "preferred_languages": [],
        "language_priority": req.language_priority,
        "status": "searching"
    }).execute()
    
    # Try to find a match immediately
    match_result = await find_match(user_id, req.seeking_role, req.offering_role)
    
    if match_result:
        candidate = match_result
        candidate_id = candidate["candidate_id"]
        
        # Create relationship
        relationship = await create_relationship(
            user_a_id=user_id,
            user_b_id=candidate_id,
            role_a=req.offering_role,
            role_b=candidate["queue_entry"]["offering_role"]
        )
        
        # Update queue entries
        db.table("matching_queue_realtime") \
            .update({"status": "matched", "matched_with": candidate_id, "matched_at": datetime.utcnow().isoformat()}) \
            .eq("user_id", user_id) \
            .eq("status", "searching") \
            .execute()
        
        db.table("matching_queue_realtime") \
            .update({"status": "matched", "matched_with": user_id, "matched_at": datetime.utcnow().isoformat()}) \
            .eq("user_id", candidate_id) \
            .eq("status", "searching") \
            .execute()
        
        # Get partner profile
        partner_profile = db.table("profiles_realtime") \
            .select("id, display_name, country, city, avatar_config, is_verified, care_score, bio") \
            .eq("id", candidate_id) \
            .execute()
        
        return {
            "status": "matched",
            "relationship": relationship,
            "partner": partner_profile.data[0] if partner_profile.data else None,
            "match_score": candidate["score"]
        }
    
    # No immediate match - get queue position
    queue_count = db.table("matching_queue_realtime") \
        .select("id", count="exact") \
        .eq("status", "searching") \
        .eq("seeking_role", req.seeking_role) \
        .execute()
    
    return {
        "status": "searching",
        "queue_id": queue_entry.data[0]["id"] if queue_entry.data else None,
        "queue_position": queue_count.count or 1,
        "estimated_wait": "2-5 minutes",
        "tips": [
            "Complete your profile to increase match chances",
            "Add more languages for wider matching",
            "Record your voice bio for better connections"
        ]
    }


@router.get("/queue/{user_id}")
async def check_queue_status(user_id: str, current_user: str = Depends(get_current_user_id)):
    """Check current matching queue status."""
    db = get_supabase()
    
    entry = db.table("matching_queue_realtime") \
        .select("*") \
        .eq("user_id", user_id) \
        .eq("status", "searching") \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()
    
    if not entry.data:
        return {"status": "not_in_queue"}
    
    return {
        "status": "searching",
        "queue_entry": entry.data[0],
        "seeking_role": entry.data[0]["seeking_role"],
        "offering_role": entry.data[0]["offering_role"]
    }


@router.delete("/queue/{user_id}")
async def cancel_matching(user_id: str, current_user: str = Depends(get_current_user_id)):
    """Cancel matching search."""
    db = get_supabase()
    
    db.table("matching_queue_realtime") \
        .update({"status": "cancelled"}) \
        .eq("user_id", user_id) \
        .eq("status", "searching") \
        .execute()
    
    return {"status": "cancelled"}


@router.get("/browse-all")
async def browse_all_roles():
    """Get counts of available profiles per role. Used for the role selection UI."""
    db = get_supabase()

    profiles_result = db.table("profiles_realtime") \
        .select("id, matching_preferences, offering_role, role") \
        .eq("is_banned", False) \
        .execute()

    role_counts = {role: 0 for role in VALID_ROLES}
    for profile in (profiles_result.data or []):
        # Collect the set of roles this profile should contribute to (dedupe)
        prefs = profile.get("matching_preferences") or {}
        # Consider top-level offering/role column as fallback
        offering = (prefs.get("offering_role") or profile.get("offering_role") or profile.get("role") or "").lower().strip()
        preferred = [r.lower().strip() for r in (prefs.get("preferred_roles") or []) if r]

        roles_for_profile = set()
        if offering:
            roles_for_profile.add(offering)
        for r in preferred:
            if r:
                roles_for_profile.add(r)

        # Increment each role once per profile
        for r in roles_for_profile:
            if r in role_counts:
                role_counts[r] += 1

    return {
        "role_counts": role_counts,
        "total_profiles": len(profiles_result.data or []),
    }


@router.get("/roles")
async def get_available_roles():
    """Get available relationship roles with descriptions."""
    return {
        "roles": [
            {
                "id": "mother", "label": "Digital Mother", "emoji": "👩",
                "description": "A caring, nurturing presence who offers guidance and warmth",
                "pairs_with": "son/daughter"
            },
            {
                "id": "father", "label": "Digital Father", "emoji": "👨",
                "description": "A supportive, wise presence who offers stability and advice",
                "pairs_with": "son/daughter"
            },
            {
                "id": "son", "label": "Digital Son", "emoji": "👦",
                "description": "Someone seeking parental guidance and a family connection",
                "pairs_with": "mother/father"
            },
            {
                "id": "daughter", "label": "Digital Daughter", "emoji": "👧",
                "description": "Someone seeking parental guidance and a family connection",
                "pairs_with": "mother/father"
            },
            {
                "id": "mentor", "label": "Mentor", "emoji": "🎓",
                "description": "An experienced guide who shares knowledge and wisdom",
                "pairs_with": "student"
            },
            {
                "id": "student", "label": "Student", "emoji": "📚",
                "description": "An eager learner seeking guidance and growth",
                "pairs_with": "mentor"
            },
            {
                "id": "brother", "label": "Digital Brother", "emoji": "👦",
                "description": "A peer-level bond with shared adventures and support",
                "pairs_with": "brother/sister"
            },
            {
                "id": "sister", "label": "Digital Sister", "emoji": "👧",
                "description": "A peer-level bond with shared adventures and support",
                "pairs_with": "brother/sister"
            },
            {
                "id": "friend", "label": "Global Friend", "emoji": "🤝",
                "description": "A cross-cultural friendship based on shared interests",
                "pairs_with": "friend"
            },
            {
                "id": "grandparent", "label": "Digital Grandparent", "emoji": "👴",
                "description": "Wisdom of a lifetime, stories from another era",
                "pairs_with": "grandchild"
            },
            {
                "id": "grandchild", "label": "Digital Grandchild", "emoji": "🧒",
                "description": "Youthful energy with a desire to learn from elders",
                "pairs_with": "grandparent"
            }
        ]
    }

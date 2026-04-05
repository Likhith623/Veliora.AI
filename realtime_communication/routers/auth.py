"""Authentication router - Sign up, login, verification."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from realtime_communication.models.schemas import (
    SignUpRequest, LoginRequest, AuthResponse, 
    VerificationRequest, ProfileUpdate, LanguageInput
)
from realtime_communication.services.supabase_client import get_supabase, get_auth_client
from realtime_communication.services.auth_service import get_current_user_id

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=AuthResponse)
async def signup(req: SignUpRequest):
    """Register a new user."""
    db = get_supabase()  # Admin client for database operations
    auth = get_auth_client()  # Auth client for user authentication
    
    try:
        # Check if username already exists
        existing = db.table("profiles_realtime").select("id").eq("username", req.username).execute()
        if existing.data and len(existing.data) > 0:
            raise HTTPException(status_code=400, detail="Username already taken")
        
        # Create auth user in Supabase using auth client
        auth_response = auth.auth.sign_up({
            "email": req.email,
            "password": req.password,
            "options": {
                "email_redirect_to": None  # Disable email confirmation redirect
            }
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Failed to create user")
        
        user_id = auth_response.user.id
        
        # Determine if minor
        today = datetime.utcnow().date()
        age = today.year - req.date_of_birth.year
        is_minor = age < 18
        
        # Create profile using admin client (bypasses RLS)
        profile = db.table("profiles_realtime").insert({
            "id": user_id,
            "username": req.username,
            "display_name": req.display_name,
            "email": req.email,
            "date_of_birth": req.date_of_birth.isoformat(),
            "gender": req.gender,
            "country": req.country,
            "city": req.city,
            "timezone": req.timezone,
            "is_minor": is_minor
        }).execute()
        
        if not profile.data:
            raise HTTPException(status_code=400, detail="Failed to create profile")
        
        # Return the session token if available, otherwise empty string
        access_token = ""
        if auth_response.session:
            access_token = auth_response.session.access_token
        
        return AuthResponse(
            access_token=access_token,
            user_id=user_id,
            email=req.email
        )
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "User already registered" in error_msg:
            raise HTTPException(status_code=400, detail="An account with this email already exists")
        elif "Password should be" in error_msg:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        else:
            raise HTTPException(status_code=400, detail=f"Signup failed: {error_msg}")


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    """Login with email and password."""
    db = get_supabase()  # Admin client for database operations
    auth = get_auth_client()  # Auth client for user authentication
    
    try:
        auth_response = auth.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        if not auth_response.session:
            raise HTTPException(status_code=401, detail="Email not confirmed. Please check your inbox.")
        
        user_id = auth_response.user.id
        
        # Check if profile exists using admin client
        profile = db.table("profiles_realtime").select("id").eq("id", user_id).execute()
        
        if not profile.data or len(profile.data) == 0:
            # Create profile if it doesn't exist (for legacy auth users)
            # Using default values for required fields
            username = auth_response.user.email.split('@')[0]
            db.table("profiles_realtime").insert({
                "id": user_id,
                "username": username,
                "display_name": username,
                "email": auth_response.user.email,
                "date_of_birth": "2000-01-01",  # Default DOB for legacy users
                "country": "Unknown",  # Default country for legacy users
                "timezone": "UTC",
                "status": "active"
            }).execute()
        else:
            # Update last active
            db.table("profiles_realtime").update({
                "last_active_at": datetime.utcnow().isoformat(),
                "status": "active"
            }).eq("id", user_id).execute()
        
        return AuthResponse(
            access_token=auth_response.session.access_token,
            user_id=auth_response.user.id,
            email=req.email
        )
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        # Parse common Supabase auth errors
        if "Invalid login credentials" in error_msg:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        elif "Email not confirmed" in error_msg:
            raise HTTPException(status_code=401, detail="Please confirm your email before logging in")
        elif "User not found" in error_msg:
            raise HTTPException(status_code=401, detail="No account found with this email")
        else:
            raise HTTPException(status_code=401, detail=f"Login failed: {error_msg}")


@router.post("/verify")
async def submit_verification(req: VerificationRequest, user_id: str = Depends(get_current_user_id)):
    """Submit human verification (video/voice/ID)."""
    db = get_supabase()
    
    # Create verification record
    record = db.table("verification_records_realtime").insert({
        "user_id": user_id,
        "verification_type": req.verification_type,
        "video_url": req.video_url,
        "voice_url": req.voice_url,
        "photo_url": req.photo_url,
        "intent_voice_url": req.intent_voice_url,
        "status": "pending",
        "liveness_score": 0.95,  # Mock liveness check
        "is_real_human": True  # Mock - in production, use AI liveness detection
    }).execute()
    
    if record.data:
        # Auto-approve for demo (in production, add to moderation queue)
        db.table("profiles_realtime").update({
            "is_verified": True,
            "verification_method": req.verification_type,
            "verified_at": datetime.utcnow().isoformat()
        }).eq("id", user_id).execute()
        
        db.table("verification_records_realtime").update({
            "status": "approved"
        }).eq("id", record.data[0]["id"]).execute()
    
    return {"status": "verified", "badge": "✅ Verified Human"}


@router.get("/me")
async def get_current_user(user_id: str = Depends(get_current_user_id)):
    """Get current user's profile."""
    db = get_supabase()
    
    profile = db.table("profiles_realtime").select("*").eq("id", user_id).execute()
    if not profile.data or len(profile.data) == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    profile_data = profile.data[0]
    
    languages = db.table("user_languages_realtime").select("*").eq("user_id", user_id).execute()
    achievements = db.table("user_achievements_realtime") \
        .select("*, achievements_realtime(*)") \
        .eq("user_id", user_id) \
        .execute()
    
    # Get relationships
    rels = db.table("relationships_realtime") \
        .select("*") \
        .or_(f"user_a_id.eq.{user_id},user_b_id.eq.{user_id}") \
        .eq("status", "active") \
        .execute()
    
    enriched_rels = []
    for rel in (rels.data or []):
        partner_id = rel["user_b_id"] if rel["user_a_id"] == user_id else rel["user_a_id"]
        partner = db.table("profiles_realtime") \
            .select("id, display_name, country, avatar_config, is_verified, status") \
            .eq("id", partner_id) \
            .execute()
        
        partner_data = partner.data[0] if partner.data else None
        
        my_role = rel["user_a_role"] if rel["user_a_id"] == user_id else rel["user_b_role"]
        partner_role = rel["user_b_role"] if rel["user_a_id"] == user_id else rel["user_a_role"]
        
        enriched_rels.append({
            **rel,
            "partner": partner_data,
            "my_role": my_role,
            "partner_role": partner_role
        })
    
    return {
        "profile": profile_data,
        "languages": languages.data or [],
        "achievements": achievements.data or [],
        "relationships": enriched_rels
    }


@router.post("/logout")
async def logout(user_id: str = Depends(get_current_user_id)):
    """Logout current user."""
    db = get_supabase()
    
    # Update status to offline
    db.table("profiles_realtime").update({
        "status": "offline",
        "last_active_at": datetime.utcnow().isoformat()
    }).eq("id", user_id).execute()
    
    return {"status": "logged_out"}


@router.post("/refresh")
async def refresh_token(refresh_token: str):
    """Refresh access token."""
    db = get_supabase()
    
    try:
        auth_response = db.auth.refresh_session(refresh_token)
        if auth_response.session:
            return {
                "access_token": auth_response.session.access_token,
                "refresh_token": auth_response.session.refresh_token
            }
        raise HTTPException(status_code=401, detail="Failed to refresh token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

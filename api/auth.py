"""
Veliora.AI — Auth & User Profile Routes
Handles: signup, login, profile CRUD, avatar upload, daily login XP.
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import logging
from datetime import datetime, timezone
from config.settings import get_settings
from config.mappings import XP_REWARDS, calculate_level, calculate_streak_multiplier
from models.schemas import (
    UserSignUpRequest, UserProfileUpdate, UserProfileResponse,
    LoginRequest, AuthResponse, XPStatusResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication & Profile"])
security = HTTPBearer()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# JWT VALIDATION DEPENDENCY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Validate Supabase JWT and return user info."""
    settings = get_settings()
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no subject")
        return {"user_id": user_id, "email": payload.get("email", "")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SIGNUP
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/signup", response_model=AuthResponse)
async def signup(request: UserSignUpRequest):
    """
    Register a new user with email/password + profile details.
    Awards profile_complete XP if all fields are filled.
    """
    from services.supabase_client import sign_up_user, create_user_profile
    from services.background_tasks import award_xp

    try:
        # Create auth user in Supabase
        auth_result = await sign_up_user(request.email, request.password)
        user = auth_result["user"]
        session = auth_result["session"]

        if not user or not session:
            raise HTTPException(status_code=400, detail="Signup failed. Check your credentials.")

        user_id = user.id

        # Create profile record
        profile_data = {
            "email": request.email,
            "name": request.name,
            "username": request.username,
            "age": request.age,
            "gender": request.gender,
            "location": request.location,
            "bio": request.bio,
            "total_xp": 0,
            "level": 0,
            "streak_days": 0,
            "last_login_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        }

        profile = await create_user_profile(user_id, profile_data)

        # Award profile completion XP
        all_filled = all([request.name, request.username, request.age, request.gender])
        if all_filled:
            await award_xp(user_id, "system", "profile_complete")

        return AuthResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            user=UserProfileResponse(
                id=user_id,
                email=request.email,
                name=request.name,
                username=request.username,
                age=request.age,
                gender=request.gender,
                location=request.location,
                bio=request.bio,
                total_xp=0,
                level=0,
                streak_days=0,
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(e)}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LOGIN
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Login with email/password. Awards daily login XP and updates streak.
    """
    from services.supabase_client import sign_in_user, get_user_profile, update_user_streak
    from services.background_tasks import award_xp

    try:
        auth_result = await sign_in_user(request.email, request.password)
        user = auth_result["user"]
        session = auth_result["session"]

        if not user or not session:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        user_id = user.id

        # Fetch profile
        profile = await get_user_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found")

        # Handle daily login streak
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        last_login = profile.get("last_login_date", "")
        current_streak = profile.get("streak_days", 0)

        if last_login != today:
            # Check if consecutive day
            from datetime import timedelta
            yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")

            if last_login == yesterday:
                new_streak = current_streak + 1
            else:
                new_streak = 1  # Reset streak

            await update_user_streak(user_id, new_streak, today)

            # Award daily login XP
            await award_xp(user_id, "system", "daily_login")

            # Award streak bonus
            if new_streak > 1:
                streak_bonus = min(new_streak, 7) * XP_REWARDS["daily_login_streak_bonus"]
                await award_xp(user_id, "system", "daily_login_streak_bonus", streak_bonus)

            profile["streak_days"] = new_streak
            profile["last_login_date"] = today

        return AuthResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            user=UserProfileResponse(
                id=user_id,
                email=profile.get("email", ""),
                name=profile.get("name", ""),
                username=profile.get("username", ""),
                age=profile.get("age", 0),
                gender=profile.get("gender", ""),
                location=profile.get("location"),
                bio=profile.get("bio"),
                avatar_url=profile.get("avatar_url"),
                total_xp=profile.get("total_xp", 0),
                level=calculate_level(profile.get("total_xp", 0)),
                streak_days=profile.get("streak_days", 0),
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=401, detail="Invalid email or password")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PROFILE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get the current user's profile."""
    from services.supabase_client import get_user_profile

    profile = await get_user_profile(current_user["user_id"])
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return UserProfileResponse(
        id=current_user["user_id"],
        email=profile.get("email", ""),
        name=profile.get("name", ""),
        username=profile.get("username", ""),
        age=profile.get("age", 0),
        gender=profile.get("gender", ""),
        location=profile.get("location"),
        bio=profile.get("bio"),
        avatar_url=profile.get("avatar_url"),
        total_xp=profile.get("total_xp", 0),
        level=calculate_level(profile.get("total_xp", 0)),
        streak_days=profile.get("streak_days", 0),
        created_at=profile.get("created_at"),
    )


@router.put("/profile", response_model=UserProfileResponse)
async def update_profile(
    updates: UserProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update the current user's profile."""
    from services.supabase_client import update_user_profile, get_user_profile

    update_data = updates.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    await update_user_profile(current_user["user_id"], update_data)
    profile = await get_user_profile(current_user["user_id"])

    return UserProfileResponse(
        id=current_user["user_id"],
        email=profile.get("email", ""),
        name=profile.get("name", ""),
        username=profile.get("username", ""),
        age=profile.get("age", 0),
        gender=profile.get("gender", ""),
        location=profile.get("location"),
        bio=profile.get("bio"),
        avatar_url=profile.get("avatar_url"),
        total_xp=profile.get("total_xp", 0),
        level=calculate_level(profile.get("total_xp", 0)),
        streak_days=profile.get("streak_days", 0),
    )


@router.post("/profile/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload or update the user's profile photo."""
    from services.supabase_client import upload_avatar
    from services.background_tasks import award_xp

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="Image must be under 5MB")

    url = await upload_avatar(current_user["user_id"], file_bytes, file.content_type)

    # Award XP for profile photo upload
    await award_xp(current_user["user_id"], "system", "profile_photo_upload")

    return {"avatar_url": url, "message": "Avatar uploaded successfully"}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# XP STATUS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/xp", response_model=XPStatusResponse)
async def get_xp_status(current_user: dict = Depends(get_current_user)):
    """Get the user's XP status, level, and streak info."""
    from services.supabase_client import get_user_profile

    profile = await get_user_profile(current_user["user_id"])
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    total_xp = profile.get("total_xp", 0)
    level = calculate_level(total_xp)
    streak_days = profile.get("streak_days", 0)
    multiplier = calculate_streak_multiplier(streak_days)
    next_level_xp = (level + 1) ** 2 * 100  # Inverse of sqrt formula
    xp_to_next = max(0, next_level_xp - total_xp)

    return XPStatusResponse(
        user_id=current_user["user_id"],
        total_xp=total_xp,
        level=level,
        streak_days=streak_days,
        streak_multiplier=multiplier,
        next_level_xp=next_level_xp,
        xp_to_next_level=xp_to_next,
    )

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date

class SignUpRequest(BaseModel):
    email: str
    password: str
    display_name: str
    username: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    country: str
    city: Optional[str] = None
    timezone: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    token: str
    user: dict

class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    timezone: Optional[str] = None
    gender: Optional[str] = None
    avatar_config: Optional[dict] = None
    status: Optional[str] = None
    status_message: Optional[str] = None
    matching_preferences: Optional[dict] = None

class LanguageInput(BaseModel):
    language_code: str
    language_name: str
    proficiency: str = "native"
    is_primary: bool = False
    show_original: bool = False

class MatchRequest(BaseModel):
    seeking_role: str
    offering_role: str
    preferred_age_min: Optional[int] = None
    preferred_age_max: Optional[int] = None
    preferred_countries: Optional[List[str]] = None
    language_priority: Optional[str] = None

class SendMessageRequest(BaseModel):
    relationship_id: str
    original_text: str = ""
    content_type: str = "text"
    original_language: Optional[str] = None
    voice_url: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    reply_to_id: Optional[str] = None

class MessageResponse(BaseModel):
    translated_text: Optional[str] = None
    has_idiom: bool = False
    idiom_explanation: Optional[str] = None
    cultural_note: Optional[str] = None
    content_type: str = "text"

class ReactRequest(BaseModel):
    emoji: str

class ForwardMessageRequest(BaseModel):
    target_relationship_id: str

class CreatePollRequest(BaseModel):
    question: str
    options: List[str]
    relationship_id: Optional[str] = None
    room_id: Optional[str] = None
    allow_multiple: bool = False
    is_anonymous: bool = False
    expires_at: Optional[str] = None

class VotePollRequest(BaseModel):
    selected_option: int

class ContestRequest(BaseModel):
    relationship_id: str
    contest_type: str

class AnswerRequest(BaseModel):
    question_id: str
    answer: str

class StartGameRequest(BaseModel):
    game_id: str
    relationship_id: Optional[str] = None
    room_id: Optional[str] = None

class GameActionRequest(BaseModel):
    action: str
    data: Optional[dict] = None

class CreateLiveGameRequest(BaseModel):
    game_type: str
    relationship_id: str

class CreateRoomRequest(BaseModel):
    room_name: str
    description: Optional[str] = None
    room_type: str = "family"
    max_members: int = 8

class InviteToRoomRequest(BaseModel):
    user_id: str
    role_in_room: str

class RoomMessageRequest(BaseModel):
    original_text: str = ""
    content_type: str = "text"
    original_language: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    reply_to_id: Optional[str] = None

class JoinRoomRequest(BaseModel):
    username: Optional[str] = None
    role_in_room: str = "member"

class CreateJoinCodeRequest(BaseModel):
    max_uses: Optional[int] = None
    expires_at: Optional[str] = None

class JoinByCodeRequest(BaseModel):
    code: str

class CreatePotluckRequest(BaseModel):
    theme: str
    dish_name: Optional[str] = None
    cultural_significance: Optional[str] = None
    recipe: Optional[str] = None
    country_of_origin: Optional[str] = None
    scheduled_at: str

class ReportRequest(BaseModel):
    reported_user_id: str
    reason: str
    relationship_id: Optional[str] = None
    description: Optional[str] = None

class SeverBondRequest(BaseModel):
    relationship_id: str
    farewell_message: Optional[str] = None

class VerificationRequest(BaseModel):
    verification_type: str
    video_url: Optional[str] = None
    voice_url: Optional[str] = None
    photo_url: Optional[str] = None
    intent_voice_url: Optional[str] = None
    gov_id_url: Optional[str] = None
    gov_id_country: Optional[str] = None

class TimeCapsuleRequest(BaseModel):
    relationship_id: str
    content: str
    content_type: str = "text"
    media_url: Optional[str] = None
    open_date: str

class GratitudeRequest(BaseModel):
    message: str
    is_anonymous: bool = False

class FriendRequestCreate(BaseModel):
    receiver_id: str
    message: Optional[str] = None

class FriendRequestRespond(BaseModel):
    action: str

class GiftXPRequest(BaseModel):
    receiver_id: str
    amount: int = Field(gt=0)

class PrivacySettingsUpdate(BaseModel):
    profile_visibility: Optional[str] = None
    show_last_active: Optional[bool] = None
    show_care_score: Optional[bool] = None
    show_achievements: Optional[bool] = None
    show_bio: Optional[bool] = None
    allow_friend_requests: Optional[bool] = None
    allow_search: Optional[bool] = None
    translation_language: Optional[str] = None

class CreateUserQuestionRequest(BaseModel):
    question_text: str
    category: str

class AnswerUserQuestionRequest(BaseModel):
    answer: str

class BatchTranslateRequest(BaseModel):
    texts: List[str]
    source_lang: Optional[str] = None
    target_lang: str = "en"

class ToggleShowOriginalRequest(BaseModel):
    show_original: bool

# Phase 7: Call Logs and Leaderboard

class CallLogCreate(BaseModel):
    relationship_id: str
    caller_id: str
    receiver_id: str
    call_type: str = "audio" # audio/video
    started_at: str
    ended_at: Optional[str] = None
    duration_seconds: int = 0
    status: str = "completed"

class CallLogResponse(CallLogCreate):
    id: str
    created_at: str

class LeaderboardEntry(BaseModel):
    user_id: str
    display_name: str
    total_xp: int
    rank: int

class LeaderboardResponse(BaseModel):
    leaderboard: List[LeaderboardEntry]

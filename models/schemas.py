"""
Veliora.AI — Pydantic Request/Response Schemas
All API contract models in one place.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ENUMS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class MessageRole(str, Enum):
    USER = "user"
    BOT = "bot"
    SYSTEM = "system"


class GameStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AUTH / USER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class UserSignUpRequest(BaseModel):
    email: str
    password: str
    name: str
    username: str
    age: int = Field(..., ge=13, le=120)
    gender: str
    location: Optional[str] = None
    bio: Optional[str] = None


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    age: Optional[int] = Field(None, ge=13, le=120)
    gender: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None


class UserProfileResponse(BaseModel):
    id: str
    email: str
    name: str
    username: str
    age: int
    gender: str
    location: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    total_xp: int = 0
    level: int = 0
    streak_days: int = 0
    created_at: Optional[datetime] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserProfileResponse


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHAT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ChatRequest(BaseModel):
    bot_id: str
    message: str
    language: str = "english"
    custom_bot_name: Optional[str] = None
    traits: Optional[str] = None


class ChatResponse(BaseModel):
    bot_id: str
    user_message: str
    bot_response: str
    language: str
    xp_earned: int = 0
    semantic_memory_used: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ChatHistoryRequest(BaseModel):
    bot_id: str
    page: int = 1
    page_size: int = 50


class MessageItem(BaseModel):
    id: Optional[str] = None
    role: MessageRole
    content: str
    bot_id: str
    created_at: Optional[datetime] = None


class ChatHistoryResponse(BaseModel):
    messages: list[MessageItem]
    total: int
    page: int
    page_size: int


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GAMES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class GameInfo(BaseModel):
    id: str
    name: str
    description: str
    archetype: str  # mentor, friend, romantic
    category: str
    min_turns: int = 3
    max_turns: int = 15
    xp_reward: int = 250


class GameCatalogResponse(BaseModel):
    games: list[GameInfo]


class GameStartRequest(BaseModel):
    bot_id: str
    game_id: str


class GameStartResponse(BaseModel):
    session_id: str
    game_name: str
    bot_id: str
    opening_message: str
    xp_earned: int = 50


class GameActionRequest(BaseModel):
    bot_id: str
    session_id: str
    action: str


class GameActionResponse(BaseModel):
    session_id: str
    bot_response: str
    turn_number: int
    is_game_over: bool = False
    result: Optional[str] = None  # "win", "lose", "draw", or None
    xp_earned: int = 25


class GameEndRequest(BaseModel):
    bot_id: str
    session_id: str


class GameEndResponse(BaseModel):
    session_id: str
    total_xp_earned: int
    summary: str


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# VOICE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class VoiceNoteRequest(BaseModel):
    bot_id: str
    message: str
    language: str = "english"
    custom_bot_name: Optional[str] = None
    traits: Optional[str] = None


class VoiceNoteResponse(BaseModel):
    bot_id: str
    text_response: str
    audio_url: str
    duration_seconds: Optional[float] = None
    xp_earned: int = 75


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SELFIE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class SelfieRequest(BaseModel):
    bot_id: str
    include_user: bool = False  # For future: composite user + bot


class SelfieResponse(BaseModel):
    bot_id: str
    image_url: str
    scene_description: str
    xp_earned: int = 150


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MULTIMODAL
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ImageDescribeResponse(BaseModel):
    description: str
    bot_response: str
    xp_earned: int = 50


class URLSummarizeRequest(BaseModel):
    bot_id: str
    url: str
    language: str = "english"


class URLSummarizeResponse(BaseModel):
    url: str
    summary: str
    bot_response: str
    xp_earned: int = 50


class WeatherResponse(BaseModel):
    city: str
    country: str
    temperature: Optional[float] = None
    description: str
    bot_commentary: str
    xp_earned: int = 25


class MemeRequest(BaseModel):
    bot_id: str
    topic: Optional[str] = None
    language: str = "english"


class MemeResponse(BaseModel):
    text_meme: str
    # image_url: Optional[str] = None  # Uncomment when image generation is enabled
    xp_earned: int = 100


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DIARY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class DiaryEntry(BaseModel):
    id: str
    bot_id: str
    entry_date: str
    content: str
    mood: Optional[str] = None
    created_at: Optional[datetime] = None


class DiaryResponse(BaseModel):
    entries: list[DiaryEntry]
    xp_earned: int = 30


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# XP
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class XPStatusResponse(BaseModel):
    user_id: str
    total_xp: int
    level: int
    streak_days: int
    streak_multiplier: float
    next_level_xp: int
    xp_to_next_level: int


class XPEventResponse(BaseModel):
    action: str
    base_xp: int
    multiplier: float
    total_xp_earned: int
    new_total_xp: int
    new_level: int

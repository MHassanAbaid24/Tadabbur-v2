"""Pydantic v2 request/response schemas for Tadabbur API."""

from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """Request body for user registration."""

    email: EmailStr
    password: str = Field(min_length=8, description="Password must be 8+ characters")
    username: str = Field(
        min_length=3,
        max_length=30,
        pattern=r"^[a-zA-Z0-9_]+$",
        description="Username: 3-30 chars, alphanumeric + underscore only",
    )
    display_name: str = Field(default="", max_length=50, description="Display name, max 50 chars (optional)")


class LoginRequest(BaseModel):
    """Request body for user login."""

    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    """Response body for successful authentication."""

    access_token: str
    user_id: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    qf_connected: bool = False
    onboarded: bool = False



class VerificationInitResponse(BaseModel):
    """Response after successful registration initiation (before verification)."""

    user_id: str
    email: str
    message: str = "Verification code sent to your email"


class VerifyOTPRequest(BaseModel):
    """Request body for verifying OTP code."""

    user_id: str = Field(description="User ID from registration response")
    otp_code: str = Field(
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
        description="6-digit OTP code",
    )


class ResendOTPRequest(BaseModel):
    """Request body for resending OTP code."""

    user_id: str = Field(description="User ID to resend OTP for")


class VerificationStatusResponse(BaseModel):
    """Response with verification status."""

    verified: bool
    email: Optional[str]
    expires_at: Optional[str]
    method: Optional[str]
    otp_attempts: int = 0


class APIResponse(BaseModel):
    """Wrapper for all API responses (success or error)."""

    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    code: Optional[str] = None


class ReflectionSubmitRequest(BaseModel):
    """Request body for submitting a daily reflection."""

    verse_key: str = Field(
        pattern=r"^\d{1,3}:\d{1,3}$",
        description="Verse key in format 'chapter:verse' (e.g., '2:255')",
    )
    prompt_1_answer: str = Field(
        max_length=2000,
        description="Answer to 'What does this ayah mean to you?'",
    )
    prompt_2_answer: str = Field(
        max_length=2000,
        description="Answer to 'What will you do differently today?'",
    )
    mood: Optional[str] = Field(
        None,
        description="Mood: supplication, moved, peaceful, grateful, or thoughtful",
    )
    is_shared: bool = Field(
        False,
        description="Whether to share reflection with circle",
    )
    circle_id: Optional[str] = Field(
        None,
        description="QF Room ID (required if is_shared=True)",
    )


class ReflectionResponse(BaseModel):
    """Response body for successfully submitted reflection."""

    id: str = Field(description="Reflection ID (UUID)")
    verse_key: str
    date: str = Field(description="Date in YYYY-MM-DD format")
    prompt_1_answer: str = Field(default="", description="Reflection answer 1")
    prompt_2_answer: str = Field(default="", description="Reflection answer 2")
    mood: Optional[str]
    is_shared: bool
    qf_note_id: Optional[str] = Field(
        None,
        description="QF Notes API ID (proof of integration)",
    )
    qf_post_id: Optional[str] = Field(
        None,
        description="QF Posts API ID (if shared to circle)",
    )
    ai_action_suggestion: Optional[str] = Field(
        None,
        description="AI-generated action suggestion (may be None if API failed)",
    )
    xp_earned: int = Field(
        description="XP points awarded for this reflection",
    )
    verse_text: Optional[str] = None
    verse_translation: Optional[str] = None


class CreateCircleRequest(BaseModel):
    """Request body for creating a reflection circle."""

    name: str = Field(
        min_length=2,
        max_length=50,
        description="Circle name (e.g., 'Family', 'Study Group')",
    )


class CircleResponse(BaseModel):
    """Response body for circle data."""

    id: str = Field(description="Circle ID (UUID)")
    name: str
    invite_code: str = Field(description="URL-safe invite code for joining")
    member_count: int = Field(description="Number of members in circle")
    qf_room_id: Optional[str] = Field(
        None,
        description="QF Room ID (may be None if creation failed)",
    )


class CircleMemberResponse(BaseModel):
    """Data for a single circle member."""

    user_id: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    joined_at: str
    is_admin: bool
    is_creator: bool = False


class CircleFeedItem(BaseModel):
    """Single reflection item in circle feed."""

    reflection_id: str = Field(description="Reflection ID (UUID)")
    user_display_name: str = Field(description="Display name of reflection author")
    verse_key: str = Field(description="Verse key (e.g., '2:255')")
    prompt_1_answer: str = Field(
        description="Full answer for first prompt",
    )
    prompt_2_answer: str = Field(
        description="Full answer for second prompt",
    )
    mood: Optional[str] = Field(
        None,
        description="Mood selected by author",
    )
    created_at: str = Field(description="Creation timestamp (ISO 8601)")
    qf_post_id: Optional[str] = Field(
        None,
        description="QF Post ID (for likes/interactions)",
    )
    likes_count: Optional[int] = Field(
        0,
        description="Number of likes on this reflection",
    )
    is_liked: Optional[bool] = Field(
        False,
        description="Whether the current user has liked this reflection",
    )
    verse_text: Optional[str] = None
    verse_translation: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    """Request body for updating user profile."""

    display_name: Optional[str] = Field(None, max_length=50)
    avatar_url: Optional[str] = Field(None)
    daily_reminder_time: Optional[str] = Field(
        None,
        pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$",
        description="Format HH:MM or HH:MM:SS",
    )
    reminders_enabled: Optional[bool] = Field(None)
    timezone: Optional[str] = Field(None)


class ChapterResponse(BaseModel):
    """Quran chapter (Surah) metadata."""
    id: int
    revelation_place: str
    revelation_order: int
    bismillah_pre: bool
    name_simple: str
    name_complex: str
    name_arabic: str
    verses_count: int
    pages: list[int]


class VerseListResponse(BaseModel):
    """A verse within a chapter list."""
    id: int
    verse_number: int
    verse_key: str
    text_uthmani: str
    translation: str

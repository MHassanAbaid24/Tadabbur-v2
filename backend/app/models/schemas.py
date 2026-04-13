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
    display_name: str = Field(max_length=50, description="Display name, max 50 chars")


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


class APIResponse(BaseModel):
    """Wrapper for all API responses (success or error)."""

    success: bool
    data: Optional[dict[str, Any]] = None
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
        description="Mood: peaceful, grateful, hopeful, challenged, or moved",
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


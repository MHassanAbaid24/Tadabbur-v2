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

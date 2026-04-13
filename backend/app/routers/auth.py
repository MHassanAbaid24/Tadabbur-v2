"""Authentication routes: register, login, get current user profile."""

import logging
import secrets
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from postgrest.exceptions import APIError

from app.auth.jwt import create_access_token, get_current_user
from app.auth.qf_user_auth import (
    exchange_code_for_token,
    get_qf_authorization_url,
    store_user_qf_token,
)
from app.db.supabase import supabase_client
from app.models.schemas import APIResponse, AuthResponse, LoginRequest, RegisterRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
async def register(req: RegisterRequest) -> APIResponse:
    """
    Register a new user with Supabase Auth and create local profile.

    Args:
        req: Registration request with email, password, username, display_name

    Returns:
        APIResponse with access_token and user details

    Raises:
        HTTPException(409): Email or username already exists
        HTTPException(500): Database or auth service error
    """
    try:
        # Sign up with Supabase Auth
        auth_response = supabase_client.auth.sign_up(
            {"email": req.email, "password": req.password}
        )
        user_id = auth_response.user.id

        # Check if username already exists
        username_check = supabase_client.table("profiles").select("id").eq(
            "username", req.username
        ).execute()
        if username_check.data:
            logger.warning("Username already exists: %s", req.username)
            raise HTTPException(status_code=409, detail="Username already taken")

        # Create profile record
        supabase_client.table("profiles").insert(
            {
                "id": user_id,
                "username": req.username,
                "display_name": req.display_name,
            }
        ).execute()

        # Generate JWT
        access_token = create_access_token(user_id, req.email)

        logger.info("User registered: %s (%s)", req.username, user_id)

        return APIResponse(
            success=True,
            data=AuthResponse(
                access_token=access_token,
                user_id=user_id,
                username=req.username,
                display_name=req.display_name,
            ).model_dump(),
        )

    except APIError as e:
        if "duplicate" in str(e).lower() or "already exists" in str(e).lower():
            logger.warning("Duplicate email: %s", req.email)
            raise HTTPException(status_code=409, detail="Email already exists") from e
        logger.error("Database error during registration: %s", str(e))
        raise HTTPException(status_code=500, detail="Registration failed") from e
    except Exception as e:
        logger.error("Unexpected error during registration: %s", str(e))
        raise HTTPException(status_code=500, detail="Registration failed") from e


@router.post("/login")
async def login(req: LoginRequest) -> APIResponse:
    """
    Authenticate user and issue JWT.

    Args:
        req: Login request with email and password

    Returns:
        APIResponse with access_token and user details

    Raises:
        HTTPException(401): Invalid credentials
        HTTPException(500): Auth service error
    """
    try:
        # Sign in with Supabase Auth
        auth_response = supabase_client.auth.sign_in_with_password(
            {"email": req.email, "password": req.password}
        )
        user_id = auth_response.user.id

        # Fetch user profile
        profile_response = supabase_client.table("profiles").select(
            "username,display_name"
        ).eq("id", user_id).execute()

        if not profile_response.data:
            logger.error("Profile not found for user: %s", user_id)
            raise HTTPException(status_code=500, detail="User profile not found")

        profile = profile_response.data[0]

        # Generate JWT
        access_token = create_access_token(user_id, req.email)

        logger.info("User logged in: %s", user_id)

        return APIResponse(
            success=True,
            data=AuthResponse(
                access_token=access_token,
                user_id=user_id,
                username=profile["username"],
                display_name=profile["display_name"],
            ).model_dump(),
        )

    except Exception as e:
        if "Invalid login credentials" in str(e) or "invalid credentials" in str(e).lower():
            logger.warning("Invalid login attempt for email: %s", req.email)
            raise HTTPException(status_code=401, detail="Invalid credentials") from e
        logger.error("Error during login: %s", str(e))
        raise HTTPException(status_code=500, detail="Login failed") from e


@router.get("/me")
async def get_profile(current_user: Dict[str, Any] = Depends(get_current_user)) -> APIResponse:
    """
    Get current authenticated user's profile.

    Args:
        current_user: Current user dict from JWT (injected by get_current_user dependency)

    Returns:
        APIResponse with user profile details

    Raises:
        HTTPException(401): Invalid or missing token (handled by get_current_user)
        HTTPException(404): Profile not found
    """
    user_id = current_user["sub"]

    try:
        profile_response = supabase_client.table("profiles").select("*").eq(
            "id", user_id
        ).execute()

        if not profile_response.data:
            logger.warning("Profile not found for user: %s", user_id)
            raise HTTPException(status_code=404, detail="Profile not found")

        profile = profile_response.data[0]
        logger.debug("Fetched profile for user: %s", user_id)

        return APIResponse(
            success=True,
            data={
                "id": profile["id"],
                "username": profile["username"],
                "display_name": profile["display_name"],
                "email": current_user["email"],
                "xp": profile.get("xp", 0),
                "level": profile.get("level", 1),
                "created_at": profile.get("created_at"),
            },
        )

    except Exception as e:
        logger.error("Error fetching profile for user %s: %s", user_id, str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch profile") from e


@router.get("/qf/connect")
async def qf_connect(current_user: Dict[str, Any] = Depends(get_current_user)) -> APIResponse:
    """
    Start QF OAuth2 flow: generate state and return authorization URL.

    This endpoint is called by the frontend to initiate QF account connection.
    The state token is used for CSRF protection.

    Args:
        current_user: Current user dict from JWT (injected by get_current_user dependency)

    Returns:
        APIResponse with authorization_url for frontend to redirect to

    Raises:
        HTTPException(401): Invalid or missing token (handled by get_current_user)
    """
    try:
        state = secrets.token_urlsafe(16)
        auth_url = get_qf_authorization_url(state)

        logger.info("Generated QF OAuth2 authorization URL for user: %s", current_user["sub"])

        return APIResponse(
            success=True,
            data={"authorization_url": auth_url, "state": state},
        )

    except Exception as e:
        logger.error("Error generating QF authorization URL: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to generate authorization URL") from e


class QFCallbackRequest(APIResponse):
    """Request body for QF OAuth2 callback."""

    code: str
    state: str


@router.post("/qf/callback")
async def qf_callback(
    body: Dict[str, str],
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> APIResponse:
    """
    Complete QF OAuth2 flow: exchange code for token and store in user profile.

    This endpoint is called by the frontend after QF redirects back with auth code.

    Args:
        body: Request body with code and state
        current_user: Current user dict from JWT (injected by get_current_user dependency)

    Returns:
        APIResponse indicating successful connection

    Raises:
        HTTPException(400): Code exchange failed
        HTTPException(401): Invalid or missing token
        HTTPException(500): Database error
    """
    try:
        code = body.get("code")
        state = body.get("state")

        if not code or not state:
            logger.warning("QF callback missing code or state")
            raise HTTPException(status_code=400, detail="Missing code or state")

        user_id = current_user["sub"]

        # Exchange authorization code for access token
        token_data = await exchange_code_for_token(code)

        # Store token in user profile
        await store_user_qf_token(user_id, token_data)

        logger.info("Successfully connected QF account for user: %s", user_id)

        return APIResponse(
            success=True,
            data={"qf_connected": True, "message": "QF account connected successfully"},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in QF callback: %s", str(e))
        raise HTTPException(status_code=500, detail="QF callback failed") from e

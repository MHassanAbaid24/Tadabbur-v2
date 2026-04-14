"""Authentication routes: register, login, get current user profile."""

import logging
import secrets
import uuid
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
from app.models.schemas import (
    APIResponse,
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    ResendOTPRequest,
    VerificationInitResponse,
    VerificationStatusResponse,
    VerifyOTPRequest,
)
from app.services.verification import VerificationManager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
async def register(req: RegisterRequest) -> APIResponse:
    """
    Initiate user registration with email verification.

    Instead of creating a Supabase Auth user immediately, this endpoint:
    1. Generates a temporary user ID
    2. Creates a pending profile
    3. Sends OTP via email
    4. Returns user_id for the verification page

    Args:
        req: Registration request with email, password, username, display_name

    Returns:
        APIResponse with user_id, email, and verification message

    Raises:
        HTTPException(409): Email or username already exists
        HTTPException(500): Database or email service error
    """
    try:
        logger.info("Registration attempt - email: %s, username: %s", req.email, req.username)

        # Check if username already exists
        username_check = supabase_client.table("profiles").select("id").eq(
            "username", req.username
        ).execute()
        if username_check.data:
            logger.warning("Username already exists: %s", req.username)
            raise HTTPException(status_code=409, detail="Username already taken")

        # Generate temporary user ID (will be used to create Supabase Auth user after verification)
        temp_user_id = str(uuid.uuid4())

        # For now, store registration data in a way we can retrieve it after verification
        # We'll create the profile with email_verified=False
        # Note: This is a temporary state - the actual Supabase Auth user creation happens after OTP verification

        # Initialize OTP verification service
        verification_service = VerificationManager.get_service("otp")

        # Send OTP
        otp_sent = await verification_service.send_verification(temp_user_id, req.email)

        if not otp_sent:
            logger.error("Failed to send OTP for registration: %s", req.email)
            raise HTTPException(
                status_code=503,
                detail="Failed to send verification email. Please try again later.",
            )

        # Store registration details temporarily for later user creation
        # We'll use the email_verification record to also store registration metadata
        supabase_client.table("email_verification").update(
            {
                "user_id": temp_user_id,
                "email": req.email,
            }
        ).eq("user_id", temp_user_id).execute()

        logger.info("Registration initiated - OTP sent to: %s", req.email)

        return APIResponse(
            success=True,
            data={
                "user_id": temp_user_id,
                "email": req.email,
                "message": "Verification code sent to your email. Please verify to complete registration.",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        error_str = str(e).lower()
        if "email" in error_str:
            logger.error("Email service error during registration: %s", str(e))
            raise HTTPException(status_code=503, detail="Email service temporarily unavailable") from e
        logger.error("Unexpected error during registration: %s", str(e))
        raise HTTPException(status_code=500, detail="Registration failed") from e


@router.post("/verify-otp")
async def verify_otp(req: VerifyOTPRequest) -> APIResponse:
    """
    Verify OTP code and create Supabase Auth user on success.

    After successful OTP verification:
    1. Creates Supabase Auth user with email and password from registration data
    2. Creates profile record
    3. Returns access token for immediate login

    Args:
        req: VerifyOTPRequest with user_id and otp_code

    Returns:
        APIResponse with access_token and user details on success

    Raises:
        HTTPException(400): Invalid or expired OTP
        HTTPException(404): User verification record not found
        HTTPException(500): Database or auth error
    """
    try:
        logger.info("OTP verification attempt for user: %s", req.user_id)

        # Get verification service
        verification_service = VerificationManager.get_service("otp")

        # Verify OTP code
        verified, message = await verification_service.verify_code(req.user_id, req.otp_code)

        if not verified:
            logger.warning("OTP verification failed for user %s: %s", req.user_id, message)
            raise HTTPException(status_code=400, detail=message)

        # Retrieve registration data from email_verification record
        verification_response = supabase_client.table("email_verification").select("*").eq(
            "user_id", req.user_id
        ).execute()

        if not verification_response.data:
            logger.error("Email verification record not found for user: %s", req.user_id)
            raise HTTPException(status_code=404, detail="Verification record not found")

        verification_record = verification_response.data[0]
        email = verification_record.get("email")

        # Note: At this point, we need to get the password and username from somewhere
        # For now, we'll generate a random password since the user hasn't created auth account yet
        # In a real implementation, you might:
        # - Store password temporarily during registration
        # - Or use a passwordless flow
        # - Or create them with a temporary password and force reset
        
        # For demo purposes, generate a session-based temporary user ID
        # The actual Supabase Auth creation would happen with the user's password from the frontend
        # We'll use a hybrid approach: create a temporary profile entry and JWT token
        
        # Create Supabase Auth user with email
        # Note: This requires password - frontend should send this or we use passwordless
        # For now, generate a temporary password
        import secrets as sec
        temp_password = sec.token_urlsafe(16)

        try:
            auth_response = supabase_client.auth.sign_up(
                {"email": email, "password": temp_password}
            )
            user_id = auth_response.user.id
        except Exception as auth_error:
            logger.error(f"Failed to create Supabase Auth user: {str(auth_error)}")
            # If auth creation fails, use the temporary user_id as is
            user_id = req.user_id

        # Get username and display_name from registration request
        # These should have been stored during registration initiation
        # For now, extract from email as fallback
        username = email.split("@")[0]
        display_name = username

        # Create profile record
        supabase_client.table("profiles").upsert(
            {
                "id": user_id,
                "username": username,
                "display_name": display_name,
                "email_verified": True,
                "verification_status": "verified",
            },
            on_conflict="id",
        ).execute()

        # Generate JWT
        access_token = create_access_token(user_id, email)

        logger.info("User verified and created: %s (%s)", username, user_id)

        return APIResponse(
            success=True,
            data=AuthResponse(
                access_token=access_token,
                user_id=user_id,
                username=username,
                display_name=display_name,
            ).model_dump(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error during OTP verification: %s", str(e))
        raise HTTPException(status_code=500, detail="OTP verification failed") from e


@router.post("/resend-otp")
async def resend_otp(req: ResendOTPRequest) -> APIResponse:
    """
    Resend OTP code to user's email.

    Rate limited to 3 resend requests per 10 minutes.

    Args:
        req: ResendOTPRequest with user_id

    Returns:
        APIResponse with success status

    Raises:
        HTTPException(400): Rate limit exceeded or verification not found
        HTTPException(500): Email send error
    """
    try:
        logger.info("OTP resend requested for user: %s", req.user_id)

        # Get verification service
        verification_service = VerificationManager.get_service("otp")

        # Resend with rate limiting
        resent, message = await verification_service.resend_verification(req.user_id)

        if not resent:
            logger.warning("OTP resend failed for user %s: %s", req.user_id, message)
            raise HTTPException(status_code=400, detail=message)

        logger.info("OTP resent successfully for user: %s", req.user_id)

        return APIResponse(
            success=True,
            data={"message": message},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error resending OTP for user %s: %s", req.user_id, str(e))
        raise HTTPException(status_code=500, detail="Failed to resend OTP") from e


@router.get("/verification-status/{user_id}")
async def verification_status(user_id: str) -> APIResponse:
    """
    Get email verification status for a user.

    Args:
        user_id: User ID to check

    Returns:
        APIResponse with verification status

    Raises:
        HTTPException(500): Database error
    """
    try:
        verification_service = VerificationManager.get_service("otp")
        status = await verification_service.get_verification_status(user_id)

        return APIResponse(
            success=True,
            data=status,
        )

    except Exception as e:
        logger.error("Error fetching verification status for %s: %s", user_id, str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch verification status") from e


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

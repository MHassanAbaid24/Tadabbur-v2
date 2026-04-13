"""JWT token creation and verification for session management."""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict

from fastapi import Header, HTTPException
from jose import JWTError, jwt

from app.config import settings

logger = logging.getLogger(__name__)


def create_access_token(user_id: str, email: str) -> str:
    """
    Create a signed JWT access token.

    Args:
        user_id: Supabase user ID (UUID)
        email: User email address

    Returns:
        Encoded JWT string

    Raises:
        None — all errors are application errors caught by FastAPI
    """
    payload: Dict[str, Any] = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=settings.jwt_expiry_hours),
    }
    encoded_jwt = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    logger.debug("Created JWT for user %s", user_id)
    return encoded_jwt


def verify_token(token: str) -> Dict[str, Any]:
    """
    Verify and decode a JWT token.

    Args:
        token: Encoded JWT string

    Returns:
        Decoded payload dict containing sub, email, exp

    Raises:
        HTTPException(401): If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        return payload
    except JWTError as e:
        logger.warning("JWT verification failed: %s", str(e))
        raise HTTPException(status_code=401, detail="Invalid or expired token") from e


async def get_current_user(authorization: str = Header(...)) -> Dict[str, Any]:
    """
    FastAPI dependency to extract and verify current user from Authorization header.

    Args:
        authorization: Authorization header value (format: "Bearer <token>")

    Returns:
        Decoded token payload dict (contains sub, email, exp)

    Raises:
        HTTPException(401): If header missing, malformed, or token invalid
    """
    if not authorization:
        logger.warning("Missing Authorization header")
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            logger.warning("Invalid Authorization scheme: %s", scheme)
            raise HTTPException(status_code=401, detail="Invalid Authorization scheme")
    except ValueError:
        logger.warning("Malformed Authorization header")
        raise HTTPException(status_code=401, detail="Malformed Authorization header")

    return verify_token(token)

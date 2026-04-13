"""Tests for JWT token creation and verification."""

import time
from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException
from jose import jwt

from app.auth.jwt import create_access_token, verify_token
from app.config import settings


def test_create_access_token() -> None:
    """Token creation generates valid JWT with correct payload."""
    user_id = "test-user-123"
    email = "test@example.com"

    token = create_access_token(user_id, email)

    # Token should be a string
    assert isinstance(token, str)
    assert len(token) > 0

    # Decode and verify payload
    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    assert payload["sub"] == user_id
    assert payload["email"] == email
    assert "exp" in payload


def test_verify_token_valid() -> None:
    """Token verification succeeds with valid token."""
    user_id = "test-user-123"
    email = "test@example.com"

    token = create_access_token(user_id, email)
    payload = verify_token(token)

    assert payload["sub"] == user_id
    assert payload["email"] == email
    assert "exp" in payload


def test_verify_token_invalid() -> None:
    """Token verification fails with invalid token."""
    with pytest.raises(HTTPException) as exc_info:
        verify_token("invalid.token.format")

    assert exc_info.value.status_code == 401
    assert "Invalid or expired token" in exc_info.value.detail


def test_verify_token_expired() -> None:
    """Token verification fails with expired token."""
    user_id = "test-user-123"
    email = "test@example.com"

    # Create token with very short expiry (already expired)
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() - timedelta(hours=1),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")

    with pytest.raises(HTTPException) as exc_info:
        verify_token(token)

    assert exc_info.value.status_code == 401
    assert "Invalid or expired token" in exc_info.value.detail


def test_verify_token_wrong_secret() -> None:
    """Token verification fails with wrong secret."""
    user_id = "test-user-123"
    email = "test@example.com"

    # Create token with correct secret
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=1),
    }
    token = jwt.encode(payload, "wrong-secret", algorithm="HS256")

    with pytest.raises(HTTPException) as exc_info:
        verify_token(token)

    assert exc_info.value.status_code == 401
    assert "Invalid or expired token" in exc_info.value.detail

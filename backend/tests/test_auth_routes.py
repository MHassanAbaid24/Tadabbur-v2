"""Integration tests for authentication routes."""

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


# Sample valid registration data
VALID_REGISTER = {
    "email": "test@example.com",
    "password": "securepassword123",
    "username": "testuser",
    "display_name": "Test User",
}

# Sample valid login data
VALID_LOGIN = {
    "email": "test@example.com",
    "password": "securepassword123",
}


class TestAuthRoutes:
    """Test authentication endpoints."""

    def test_register_validation_short_password(self) -> None:
        """Registration fails with password < 8 characters."""
        data = {**VALID_REGISTER, "password": "short"}
        response = client.post("/api/auth/register", json=data)
        assert response.status_code == 422  # Validation error

    def test_register_validation_invalid_email(self) -> None:
        """Registration fails with invalid email."""
        data = {**VALID_REGISTER, "email": "not-an-email"}
        response = client.post("/api/auth/register", json=data)
        assert response.status_code == 422

    def test_register_validation_username_special_chars(self) -> None:
        """Registration fails with special characters in username."""
        data = {**VALID_REGISTER, "username": "test@user!"}
        response = client.post("/api/auth/register", json=data)
        assert response.status_code == 422

    def test_register_validation_username_too_long(self) -> None:
        """Registration fails with username > 30 characters."""
        data = {**VALID_REGISTER, "username": "a" * 31}
        response = client.post("/api/auth/register", json=data)
        assert response.status_code == 422

    def test_register_validation_display_name_too_long(self) -> None:
        """Registration fails with display_name > 50 characters."""
        data = {**VALID_REGISTER, "display_name": "a" * 51}
        response = client.post("/api/auth/register", json=data)
        assert response.status_code == 422

    def test_login_validation_missing_email(self) -> None:
        """Login fails with missing email."""
        data = {"password": "password123"}
        response = client.post("/api/auth/login", json=data)
        assert response.status_code == 422

    def test_login_validation_missing_password(self) -> None:
        """Login fails with missing password."""
        data = {"email": "test@example.com"}
        response = client.post("/api/auth/login", json=data)
        assert response.status_code == 422

    def test_me_requires_auth(self) -> None:
        """GET /me requires Authorization header."""
        response = client.get("/api/auth/me")
        assert response.status_code == 422  # Missing header

    def test_me_invalid_token(self) -> None:
        """GET /me fails with invalid token."""
        headers = {"Authorization": "Bearer invalid.token.format"}
        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid or expired token"

    def test_me_wrong_scheme(self) -> None:
        """GET /me fails with wrong auth scheme."""
        headers = {"Authorization": "Basic dGVzdDp0ZXN0"}
        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid Authorization scheme"

    def test_me_malformed_header(self) -> None:
        """GET /me fails with malformed Authorization header."""
        headers = {"Authorization": "NoSpaceHere"}
        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code == 401
        assert response.json()["detail"] == "Malformed Authorization header"

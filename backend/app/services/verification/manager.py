"""Factory for selecting verification service implementations."""

import logging
from typing import Literal

from app.services.verification.base import VerificationService
from app.services.verification.otp_service import OTPService

logger = logging.getLogger(__name__)

VerificationMethod = Literal["otp", "magic_link", "password_reset", "invite"]


class VerificationManager:
    """Factory for verification service implementations."""

    _services: dict[VerificationMethod, type[VerificationService]] = {
        "otp": OTPService,
    }

    @classmethod
    def get_service(cls, method: VerificationMethod) -> VerificationService:
        """
        Get verification service for the specified method.

        Args:
            method: Verification method ('otp', 'magic_link', 'password_reset', 'invite')

        Returns:
            Verification service instance

        Raises:
            ValueError: If method not implemented yet
        """
        if method not in cls._services:
            raise ValueError(
                f"Verification method '{method}' not implemented. "
                f"Available methods: {list(cls._services.keys())}"
            )

        service_class = cls._services[method]
        return service_class()

    @classmethod
    def register_service(
        cls,
        method: VerificationMethod,
        service_class: type[VerificationService],
    ) -> None:
        """
        Register a new verification service implementation.

        Args:
            method: Verification method identifier
            service_class: Class implementing VerificationService
        """
        cls._services[method] = service_class
        logger.info(f"Registered verification service: {method} -> {service_class.__name__}")

    @classmethod
    def available_methods(cls) -> list[VerificationMethod]:
        """Get list of available verification methods."""
        return list(cls._services.keys())

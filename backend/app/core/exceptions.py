"""
NAWI TestFlow — Custom Exceptions

Application-specific exceptions for error handling.
"""

from fastapi import HTTPException, status


class NawiException(HTTPException):
    """Base exception for NAWI application."""
    pass


class NotFoundError(NawiException):
    """Resource not found."""
    def __init__(self, resource: str, resource_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} with id '{resource_id}' not found"
        )


class ValidationError(NawiException):
    """Validation error."""
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=message
        )


class UnauthorizedError(NawiException):
    """Unauthorized access."""
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=message
        )


class ForbiddenError(NawiException):
    """Forbidden access."""
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=message
        )


class ConflictError(NawiException):
    """Resource conflict."""
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=message
        )


class CalculationError(NawiException):
    """Calculation engine error."""
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Calculation error: {message}"
        )


class ReportGenerationError(NawiException):
    """Report generation error."""
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report generation failed: {message}"
        )

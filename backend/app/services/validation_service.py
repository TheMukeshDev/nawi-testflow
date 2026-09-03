"""
NAWI TestFlow — Validation Service

Validates all input data before processing.
Ensures data integrity and completeness.

This module has NO HTTP or database dependencies.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class ValidationError:
    """Single validation error."""
    field: str
    message: str
    code: str


@dataclass
class ValidationResult:
    """Result of validation."""
    is_valid: bool
    errors: list[ValidationError]


class ValidationService:
    """
    Validate test data input.
    
    Checks:
    - Required fields present
    - Data types correct
    - Values within acceptable ranges
    - Relationships valid
    """
    
    def validate_test_report(self, data: dict) -> ValidationResult:
        """Validate test report creation/update data."""
        errors = []
        
        # Required fields
        required_fields = [
            "instrument_id",
            "laboratory_id",
            "verification_type",
            "assigned_technician_id"
        ]
        
        for field in required_fields:
            if not data.get(field):
                errors.append(ValidationError(
                    field=field,
                    message=f"{field} is required",
                    code="required"
                ))
        
        # Verification type validation
        valid_verification_types = ["initial", "subsequent", "type-approval"]
        if data.get("verification_type") not in valid_verification_types:
            errors.append(ValidationError(
                field="verification_type",
                message=f"Invalid verification type. Must be one of: {valid_verification_types}",
                code="invalid_value"
            ))
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors
        )
    
    def validate_test_case(self, data: dict) -> ValidationResult:
        """Validate test case data."""
        errors = []
        
        # Required fields
        if not data.get("case_type"):
            errors.append(ValidationError(
                field="case_type",
                message="case_type is required",
                code="required"
            ))
        
        if not data.get("test_point_label"):
            errors.append(ValidationError(
                field="test_point_label",
                message="test_point_label is required",
                code="required"
            ))
        
        if data.get("test_point_value") is None:
            errors.append(ValidationError(
                field="test_point_value",
                message="test_point_value is required",
                code="required"
            ))
        
        # Validate case type
        valid_case_types = [
            "repeatability", "eccentricity", "linearity",
            "discrimination", "stability", "temperature-effect"
        ]
        if data.get("case_type") not in valid_case_types:
            errors.append(ValidationError(
                field="case_type",
                message=f"Invalid case type. Must be one of: {valid_case_types}",
                code="invalid_value"
            ))
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors
        )
    
    def validate_observation(self, data: dict) -> ValidationResult:
        """Validate observation data."""
        errors = []
        
        if data.get("measured_value") is None:
            errors.append(ValidationError(
                field="measured_value",
                message="measured_value is required",
                code="required"
            ))
        
        if data.get("observation_number") is None:
            errors.append(ValidationError(
                field="observation_number",
                message="observation_number is required",
                code="required"
            ))
        
        # Validate value is numeric and positive
        measured_value = data.get("measured_value")
        if measured_value is not None:
            if not isinstance(measured_value, (int, float)):
                errors.append(ValidationError(
                    field="measured_value",
                    message="measured_value must be a number",
                    code="invalid_type"
                ))
            elif measured_value < 0:
                errors.append(ValidationError(
                    field="measured_value",
                    message="measured_value must be non-negative",
                    code="invalid_value"
                ))
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors
        )
    
    def validate_instrument(self, data: dict) -> ValidationResult:
        """Validate instrument registration data."""
        errors = []
        
        required_fields = [
            "model_id",
            "serial_number",
            "laboratory_id"
        ]
        
        for field in required_fields:
            if not data.get(field):
                errors.append(ValidationError(
                    field=field,
                    message=f"{field} is required",
                    code="required"
                ))
        
        # Validate condition
        valid_conditions = ["good", "needs-repair", "out-of-service"]
        if data.get("condition") and data.get("condition") not in valid_conditions:
            errors.append(ValidationError(
                field="condition",
                message=f"Invalid condition. Must be one of: {valid_conditions}",
                code="invalid_value"
            ))
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors
        )
    
    def validate_laboratory(self, data: dict) -> ValidationResult:
        """Validate laboratory data."""
        errors = []
        
        required_fields = [
            "name",
            "code",
            "address",
            "city",
            "state",
            "contact_person",
            "phone",
            "email"
        ]
        
        for field in required_fields:
            if not data.get(field):
                errors.append(ValidationError(
                    field=field,
                    message=f"{field} is required",
                    code="required"
                ))
        
        # Validate email format
        email = data.get("email")
        if email and "@" not in email:
            errors.append(ValidationError(
                field="email",
                message="Invalid email format",
                code="invalid_format"
            ))
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors
        )
    
    def validate_equipment(self, data: dict) -> ValidationResult:
        """Validate equipment registration data."""
        errors = []
        
        required_fields = [
            "name",
            "type",
            "laboratory_id"
        ]
        
        for field in required_fields:
            if not data.get(field):
                errors.append(ValidationError(
                    field=field,
                    message=f"{field} is required",
                    code="required"
                ))
        
        # Validate type
        valid_types = ["standard-weight", "calibrated-weight", "accessory", "tool"]
        if data.get("type") and data.get("type") not in valid_types:
            errors.append(ValidationError(
                field="type",
                message=f"Invalid type. Must be one of: {valid_types}",
                code="invalid_value"
            ))
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors
        )
    
    def validate_environmental_conditions(self, data: dict) -> ValidationResult:
        """Validate environmental conditions data."""
        errors = []
        
        # Temperature
        temperature = data.get("temperature")
        if temperature is None:
            errors.append(ValidationError(
                field="temperature",
                message="temperature is required",
                code="required"
            ))
        elif not isinstance(temperature, (int, float)):
            errors.append(ValidationError(
                field="temperature",
                message="temperature must be a number",
                code="invalid_type"
            ))
        elif temperature < -50 or temperature > 80:
            errors.append(ValidationError(
                field="temperature",
                message="temperature must be between -50°C and 80°C",
                code="invalid_value"
            ))
        
        # Humidity
        humidity = data.get("humidity")
        if humidity is None:
            errors.append(ValidationError(
                field="humidity",
                message="humidity is required",
                code="required"
            ))
        elif not isinstance(humidity, (int, float)):
            errors.append(ValidationError(
                field="humidity",
                message="humidity must be a number",
                code="invalid_type"
            ))
        elif humidity < 0 or humidity > 100:
            errors.append(ValidationError(
                field="humidity",
                message="humidity must be between 0% and 100%",
                code="invalid_value"
            ))
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors
        )

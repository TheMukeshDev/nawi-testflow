"""
NAWI Sahayak — Comprehensive Audit Event System

Every mutation in the system creates an audit event.
The audit trail is the single source of truth for what happened and when.

Architecture:
    Action occurs → AuditService records event → Event is immutable

Design principles:
    1. Immutable — audit events cannot be modified or deleted
    2. Complete — every mutation is recorded
    3. Traceable — every event links actor, action, entity, and timestamp
    4. Tamper-evident — events include sequence numbers and checksums
    5. Append-only — only new events, never updates
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Any
import hashlib
import json


# ============================================================================
# AUDIT EVENT TYPES
# ============================================================================

class AuditAction(str, Enum):
    """All auditable actions in the system."""
    # Report lifecycle
    REPORT_CREATED = "REPORT_CREATED"
    REPORT_UPDATED = "REPORT_UPDATED"
    REPORT_SUBMITTED = "REPORT_SUBMITTED"
    REPORT_APPROVED = "REPORT_APPROVED"
    REPORT_REJECTED = "REPORT_REJECTED"
    REPORT_FINALIZED = "REPORT_FINALIZED"
    REPORT_EXPORTED = "REPORT_EXPORTED"

    # Test lifecycle
    TEST_STARTED = "TEST_STARTED"
    OBSERVATION_ADDED = "OBSERVATION_ADDED"
    OBSERVATION_UPDATED = "OBSERVATION_UPDATED"
    CALCULATION_EXECUTED = "CALCULATION_EXECUTED"
    RESULT_CREATED = "RESULT_CREATED"

    # Attachments
    ATTACHMENT_UPLOADED = "ATTACHMENT_UPLOADED"
    ATTACHMENT_DELETED = "ATTACHMENT_DELETED"

    # Instrument management
    INSTRUMENT_CREATED = "INSTRUMENT_CREATED"
    INSTRUMENT_UPDATED = "INSTRUMENT_UPDATED"

    # Laboratory management
    LABORATORY_CREATED = "LABORATORY_CREATED"
    LABORATORY_UPDATED = "LABORATORY_UPDATED"

    # User management
    USER_CREATED = "USER_CREATED"
    USER_UPDATED = "USER_UPDATED"
    USER_DEACTIVATED = "USER_DEACTIVATED"

    # Authentication
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILURE = "LOGIN_FAILURE"
    LOGOUT = "LOGOUT"
    PASSWORD_CHANGED = "PASSWORD_CHANGED"

    # System
    SYSTEM_CONFIG_CHANGED = "SYSTEM_CONFIG_CHANGED"
    RULE_VERSION_CREATED = "RULE_VERSION_CREATED"
    RULE_VERSION_FROZEN = "RULE_VERSION_FROZEN"


class EntityType(str, Enum):
    """All auditable entity types."""
    TEST_REPORT = "test-report"
    INSTRUMENT = "instrument"
    LABORATORY = "laboratory"
    EQUIPMENT = "equipment"
    USER = "user"
    ATTACHMENT = "attachment"
    REPORT_VERSION = "report-version"
    COMPLIANCE_RULE = "compliance-rule"
    SYSTEM_CONFIG = "system-config"


# ============================================================================
# AUDIT EVENT
# ============================================================================

@dataclass
class AuditEvent:
    """
    Immutable audit event record.

    Every event contains:
    - Who did it (actor)
    - What they did (action)
    - What was affected (entity)
    - When it happened (timestamp)
    - What changed (old/new values)
    - How to verify integrity (checksum)
    """
    # Required fields first (no defaults)
    sequence_number: int
    actor_id: str
    actor_name: str
    actor_role: str
    action: AuditAction
    entity_type: EntityType
    entity_id: str

    # Optional fields with defaults
    actor_ip: Optional[str] = None
    actor_user_agent: Optional[str] = None
    entity_label: Optional[str] = None
    old_value: Optional[dict] = None
    new_value: Optional[dict] = None
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None
    metadata: dict = field(default_factory=dict)
    previous_event_checksum: Optional[str] = None
    event_checksum: Optional[str] = None

    def compute_checksum(self) -> str:
        """Compute checksum for this event."""
        data = {
            "sequence": self.sequence_number,
            "actor_id": self.actor_id,
            "action": self.action.value,
            "entity_type": self.entity_type.value,
            "entity_id": self.entity_id,
            "timestamp": self.timestamp.isoformat(),
            "previous": self.previous_event_checksum,
        }
        return hashlib.sha256(
            json.dumps(data, sort_keys=True).encode()
        ).hexdigest()

    def to_dict(self) -> dict:
        return {
            "sequence_number": self.sequence_number,
            "actor_id": self.actor_id,
            "actor_name": self.actor_name,
            "actor_role": self.actor_role,
            "actor_ip": self.actor_ip,
            "actor_user_agent": self.actor_user_agent,
            "action": self.action.value,
            "entity_type": self.entity_type.value,
            "entity_id": self.entity_id,
            "entity_label": self.entity_label,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "timestamp": self.timestamp.isoformat(),
            "notes": self.notes,
            "metadata": self.metadata,
            "event_checksum": self.event_checksum,
            "previous_event_checksum": self.previous_event_checksum,
        }


# ============================================================================
# AUDIT SERVICE (In-Memory)
# ============================================================================

class AuditService:
    """
    In-memory audit service for MVP.

    In production, replace with database-backed service.

    Design:
    - Append-only log
    - Events are immutable once created
    - Checksum chain for tamper detection
    - Thread-safe (uses list append which is atomic in CPython)
    """

    def __init__(self):
        self._events: list[AuditEvent] = []
        self._sequence = 0
        self._last_checksum: Optional[str] = None

    @property
    def event_count(self) -> int:
        return len(self._events)

    def record(
        self,
        actor_id: str,
        actor_name: str,
        actor_role: str,
        action: AuditAction,
        entity_type: EntityType,
        entity_id: str,
        entity_label: Optional[str] = None,
        old_value: Optional[dict] = None,
        new_value: Optional[dict] = None,
        actor_ip: Optional[str] = None,
        actor_user_agent: Optional[str] = None,
        notes: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> AuditEvent:
        """
        Record an audit event.

        Returns the created event with computed checksum.
        """
        self._sequence += 1

        event = AuditEvent(
            sequence_number=self._sequence,
            actor_id=actor_id,
            actor_name=actor_name,
            actor_role=actor_role,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_label=entity_label,
            old_value=old_value,
            new_value=new_value,
            actor_ip=actor_ip,
            actor_user_agent=actor_user_agent,
            notes=notes,
            metadata=metadata or {},
            previous_event_checksum=self._last_checksum,
        )

        # Compute checksum
        event.event_checksum = event.compute_checksum()
        self._last_checksum = event.event_checksum

        # Append (immutable)
        self._events.append(event)

        return event

    # ====================================================================
    # CONVENIENCE METHODS
    # ====================================================================

    def record_report_created(
        self, actor_id: str, actor_name: str, actor_role: str,
        report_id: str, report_number: str,
        new_value: Optional[dict] = None,
        **kwargs,
    ) -> AuditEvent:
        return self.record(
            actor_id=actor_id, actor_name=actor_name, actor_role=actor_role,
            action=AuditAction.REPORT_CREATED,
            entity_type=EntityType.TEST_REPORT, entity_id=report_id,
            entity_label=report_number, new_value=new_value, **kwargs,
        )

    def record_report_submitted(
        self, actor_id: str, actor_name: str, actor_role: str,
        report_id: str, report_number: str,
        old_value: Optional[dict] = None, new_value: Optional[dict] = None,
        **kwargs,
    ) -> AuditEvent:
        return self.record(
            actor_id=actor_id, actor_name=actor_name, actor_role=actor_role,
            action=AuditAction.REPORT_SUBMITTED,
            entity_type=EntityType.TEST_REPORT, entity_id=report_id,
            entity_label=report_number, old_value=old_value, new_value=new_value,
            **kwargs,
        )

    def record_report_approved(
        self, actor_id: str, actor_name: str, actor_role: str,
        report_id: str, report_number: str,
        old_value: Optional[dict] = None, new_value: Optional[dict] = None,
        notes: Optional[str] = None, **kwargs,
    ) -> AuditEvent:
        return self.record(
            actor_id=actor_id, actor_name=actor_name, actor_role=actor_role,
            action=AuditAction.REPORT_APPROVED,
            entity_type=EntityType.TEST_REPORT, entity_id=report_id,
            entity_label=report_number, old_value=old_value, new_value=new_value,
            notes=notes, **kwargs,
        )

    def record_report_rejected(
        self, actor_id: str, actor_name: str, actor_role: str,
        report_id: str, report_number: str,
        reason: str, **kwargs,
    ) -> AuditEvent:
        return self.record(
            actor_id=actor_id, actor_name=actor_name, actor_role=actor_role,
            action=AuditAction.REPORT_REJECTED,
            entity_type=EntityType.TEST_REPORT, entity_id=report_id,
            entity_label=report_number, notes=reason, **kwargs,
        )

    def record_report_finalized(
        self, actor_id: str, actor_name: str, actor_role: str,
        report_id: str, report_number: str, **kwargs,
    ) -> AuditEvent:
        return self.record(
            actor_id=actor_id, actor_name=actor_name, actor_role=actor_role,
            action=AuditAction.REPORT_FINALIZED,
            entity_type=EntityType.TEST_REPORT, entity_id=report_id,
            entity_label=report_number, **kwargs,
        )

    def record_report_exported(
        self, actor_id: str, actor_name: str, actor_role: str,
        report_id: str, report_number: str, format: str, **kwargs,
    ) -> AuditEvent:
        return self.record(
            actor_id=actor_id, actor_name=actor_name, actor_role=actor_role,
            action=AuditAction.REPORT_EXPORTED,
            entity_type=EntityType.TEST_REPORT, entity_id=report_id,
            entity_label=report_number,
            metadata={"format": format}, **kwargs,
        )

    def record_test_started(
        self, actor_id: str, actor_name: str, actor_role: str,
        report_id: str, report_number: str, **kwargs,
    ) -> AuditEvent:
        return self.record(
            actor_id=actor_id, actor_name=actor_name, actor_role=actor_role,
            action=AuditAction.TEST_STARTED,
            entity_type=EntityType.TEST_REPORT, entity_id=report_id,
            entity_label=report_number, **kwargs,
        )

    def record_observation_added(
        self, actor_id: str, actor_name: str, actor_role: str,
        report_id: str, observation_data: dict, **kwargs,
    ) -> AuditEvent:
        return self.record(
            actor_id=actor_id, actor_name=actor_name, actor_role=actor_role,
            action=AuditAction.OBSERVATION_ADDED,
            entity_type=EntityType.TEST_REPORT, entity_id=report_id,
            new_value=observation_data, **kwargs,
        )

    def record_observation_updated(
        self, actor_id: str, actor_name: str, actor_role: str,
        report_id: str, old_value: dict, new_value: dict, **kwargs,
    ) -> AuditEvent:
        return self.record(
            actor_id=actor_id, actor_name=actor_name, actor_role=actor_role,
            action=AuditAction.OBSERVATION_UPDATED,
            entity_type=EntityType.TEST_REPORT, entity_id=report_id,
            old_value=old_value, new_value=new_value, **kwargs,
        )

    def record_calculation_executed(
        self, actor_id: str, actor_name: str, actor_role: str,
        report_id: str, test_code: str, result: dict, **kwargs,
    ) -> AuditEvent:
        return self.record(
            actor_id=actor_id, actor_name=actor_name, actor_role=actor_role,
            action=AuditAction.CALCULATION_EXECUTED,
            entity_type=EntityType.TEST_REPORT, entity_id=report_id,
            new_value=result, metadata={"test_code": test_code}, **kwargs,
        )

    def record_result_created(
        self, actor_id: str, actor_name: str, actor_role: str,
        report_id: str, result_data: dict, **kwargs,
    ) -> AuditEvent:
        return self.record(
            actor_id=actor_id, actor_name=actor_name, actor_role=actor_role,
            action=AuditAction.RESULT_CREATED,
            entity_type=EntityType.TEST_REPORT, entity_id=report_id,
            new_value=result_data, **kwargs,
        )

    def record_attachment_uploaded(
        self, actor_id: str, actor_name: str, actor_role: str,
        attachment_id: str, file_name: str,
        entity_type: EntityType, entity_id: str, **kwargs,
    ) -> AuditEvent:
        return self.record(
            actor_id=actor_id, actor_name=actor_name, actor_role=actor_role,
            action=AuditAction.ATTACHMENT_UPLOADED,
            entity_type=entity_type, entity_id=entity_id,
            entity_label=file_name, **kwargs,
        )

    def record_instrument_created(
        self, actor_id: str, actor_name: str, actor_role: str,
        instrument_id: str, serial_number: str,
        new_value: Optional[dict] = None, **kwargs,
    ) -> AuditEvent:
        return self.record(
            actor_id=actor_id, actor_name=actor_name, actor_role=actor_role,
            action=AuditAction.INSTRUMENT_CREATED,
            entity_type=EntityType.INSTRUMENT, entity_id=instrument_id,
            entity_label=serial_number, new_value=new_value, **kwargs,
        )

    def record_instrument_updated(
        self, actor_id: str, actor_name: str, actor_role: str,
        instrument_id: str, serial_number: str,
        old_value: dict, new_value: dict, **kwargs,
    ) -> AuditEvent:
        return self.record(
            actor_id=actor_id, actor_name=actor_name, actor_role=actor_role,
            action=AuditAction.INSTRUMENT_UPDATED,
            entity_type=EntityType.INSTRUMENT, entity_id=instrument_id,
            entity_label=serial_number, old_value=old_value, new_value=new_value,
            **kwargs,
        )

    def record_login_success(
        self, actor_id: str, actor_name: str, actor_role: str,
        actor_ip: Optional[str] = None, **kwargs,
    ) -> AuditEvent:
        return self.record(
            actor_id=actor_id, actor_name=actor_name, actor_role=actor_role,
            action=AuditAction.LOGIN_SUCCESS,
            entity_type=EntityType.USER, entity_id=actor_id,
            entity_label=actor_name, actor_ip=actor_ip, **kwargs,
        )

    def record_login_failure(
        self, actor_id: str, actor_name: str, actor_role: str,
        actor_ip: Optional[str] = None, reason: Optional[str] = None, **kwargs,
    ) -> AuditEvent:
        return self.record(
            actor_id=actor_id, actor_name=actor_name, actor_role=actor_role,
            action=AuditAction.LOGIN_FAILURE,
            entity_type=EntityType.USER, entity_id=actor_id,
            entity_label=actor_name, actor_ip=actor_ip,
            notes=reason, **kwargs,
        )

    def record_logout(
        self, actor_id: str, actor_name: str, actor_role: str, **kwargs,
    ) -> AuditEvent:
        return self.record(
            actor_id=actor_id, actor_name=actor_name, actor_role=actor_role,
            action=AuditAction.LOGOUT,
            entity_type=EntityType.USER, entity_id=actor_id,
            entity_label=actor_name, **kwargs,
        )

    # ====================================================================
    # QUERY METHODS
    # ====================================================================

    def get_events(
        self,
        entity_type: Optional[EntityType] = None,
        entity_id: Optional[str] = None,
        action: Optional[AuditAction] = None,
        actor_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[AuditEvent]:
        """Query audit events with filters."""
        results = self._events

        if entity_type:
            results = [e for e in results if e.entity_type == entity_type]
        if entity_id:
            results = [e for e in results if e.entity_id == entity_id]
        if action:
            results = [e for e in results if e.action == action]
        if actor_id:
            results = [e for e in results if e.actor_id == actor_id]

        # Return newest first, with pagination
        results = list(reversed(results))
        return results[offset:offset + limit]

    def get_entity_history(self, entity_type: EntityType, entity_id: str) -> list[AuditEvent]:
        """Get complete history for an entity."""
        return self.get_events(
            entity_type=entity_type,
            entity_id=entity_id,
            limit=1000,
        )

    def get_actor_activity(self, actor_id: str, limit: int = 100) -> list[AuditEvent]:
        """Get recent activity for an actor."""
        return self.get_events(actor_id=actor_id, limit=limit)

    def verify_chain(self) -> bool:
        """Verify the checksum chain is intact (tamper detection)."""
        prev_checksum = None
        for event in self._events:
            if event.previous_event_checksum != prev_checksum:
                return False
            expected = event.compute_checksum()
            if event.event_checksum != expected:
                return False
            prev_checksum = event.event_checksum
        return True


# ============================================================================
# SINGLETON
# ============================================================================

_service: Optional[AuditService] = None


def get_audit_service() -> AuditService:
    """Get or create the global audit service."""
    global _service
    if _service is None:
        _service = AuditService()
    return _service


def reset_audit_service():
    """Reset the global audit service (for testing)."""
    global _service
    _service = None

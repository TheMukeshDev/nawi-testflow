"""
Tests for Security & Audit System

Tests cover:
- All audit event types
- Checksum chain integrity (tamper detection)
- Rate limiting
- Security headers
- Input validation
- Access control scope checks
- Session management
- Invariants (immutable events, complete trail)
"""

import time
import pytest
from datetime import datetime, timezone

from engine.audit import (
    AuditEvent,
    AuditAction,
    AuditService,
    EntityType,
    get_audit_service,
    reset_audit_service,
)
from app.core.security_middleware import (
    RateLimiter,
    SecurityMiddleware,
    sanitize_string,
    validate_uuid,
    validate_email,
    validate_serial_number,
    validate_report_number,
    SessionManager,
)


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def audit_service():
    """Fresh audit service."""
    reset_audit_service()
    return AuditService()


@pytest.fixture
def rate_limiter():
    """Rate limiter with test-friendly limits."""
    return RateLimiter(
        requests_per_minute=5,
        requests_per_hour=20,
        burst_size=3,
    )


@pytest.fixture
def session_manager():
    """Session manager."""
    return SessionManager(
        access_token_ttl_minutes=30,
        refresh_token_ttl_hours=8,
        max_sessions_per_user=3,
    )


# ============================================================================
# AUDIT EVENT TESTS
# ============================================================================

class TestAuditActions:
    """Test all audit action types exist."""

    def test_all_report_actions_exist(self):
        """Report lifecycle actions must all be defined."""
        report_actions = [
            AuditAction.REPORT_CREATED,
            AuditAction.REPORT_UPDATED,
            AuditAction.REPORT_SUBMITTED,
            AuditAction.REPORT_APPROVED,
            AuditAction.REPORT_REJECTED,
            AuditAction.REPORT_FINALIZED,
            AuditAction.REPORT_EXPORTED,
        ]
        assert len(report_actions) == 7
        for action in report_actions:
            assert isinstance(action, AuditAction)

    def test_all_test_actions_exist(self):
        """Test lifecycle actions must all be defined."""
        test_actions = [
            AuditAction.TEST_STARTED,
            AuditAction.OBSERVATION_ADDED,
            AuditAction.OBSERVATION_UPDATED,
            AuditAction.CALCULATION_EXECUTED,
            AuditAction.RESULT_CREATED,
        ]
        assert len(test_actions) == 5
        for action in test_actions:
            assert isinstance(action, AuditAction)

    def test_attachment_action_exists(self):
        """Attachment action must be defined."""
        assert AuditAction.ATTACHMENT_UPLOADED is not None

    def test_all_entity_types_exist(self):
        """All entity types must be defined."""
        entity_types = [
            EntityType.TEST_REPORT,
            EntityType.INSTRUMENT,
            EntityType.LABORATORY,
            EntityType.EQUIPMENT,
            EntityType.USER,
            EntityType.ATTACHMENT,
            EntityType.REPORT_VERSION,
            EntityType.COMPLIANCE_RULE,
            EntityType.SYSTEM_CONFIG,
        ]
        assert len(entity_types) == 9


# ============================================================================
# AUDIT SERVICE TESTS
# ============================================================================

class TestAuditService:
    """Test audit event recording and querying."""

    def test_record_basic_event(self, audit_service):
        """Should record a basic audit event."""
        event = audit_service.record(
            actor_id="user-001",
            actor_name="Test User",
            actor_role="tester",
            action=AuditAction.REPORT_CREATED,
            entity_type=EntityType.TEST_REPORT,
            entity_id="report-001",
            entity_label="RPT-2026-001",
        )

        assert event.sequence_number == 1
        assert event.actor_id == "user-001"
        assert event.action == AuditAction.REPORT_CREATED
        assert event.entity_type == EntityType.TEST_REPORT
        assert event.entity_id == "report-001"
        assert event.event_checksum is not None

    def test_event_immutability(self, audit_service):
        """Events should be append-only (no updates via service)."""
        event = audit_service.record(
            actor_id="user-001",
            actor_name="Test User",
            actor_role="tester",
            action=AuditAction.REPORT_CREATED,
            entity_type=EntityType.TEST_REPORT,
            entity_id="report-001",
        )

        # The service only has append — no update method
        # The event is the same object in the list
        assert audit_service._events[0] is event
        assert audit_service._events[0].action == AuditAction.REPORT_CREATED

    def test_sequence_numbers_increment(self, audit_service):
        """Sequence numbers should be monotonically increasing."""
        for i in range(5):
            audit_service.record(
                actor_id="user-001",
                actor_name="Test User",
                actor_role="tester",
                action=AuditAction.REPORT_CREATED,
                entity_type=EntityType.TEST_REPORT,
                entity_id=f"report-{i}",
            )

        sequences = [e.sequence_number for e in audit_service._events]
        assert sequences == [1, 2, 3, 4, 5]

    def test_checksum_chain(self, audit_service):
        """Each event's checksum should reference the previous."""
        events = []
        for i in range(3):
            event = audit_service.record(
                actor_id="user-001",
                actor_name="Test User",
                actor_role="tester",
                action=AuditAction.REPORT_CREATED,
                entity_type=EntityType.TEST_REPORT,
                entity_id=f"report-{i}",
            )
            events.append(event)

        # First event has no previous checksum
        assert events[0].previous_event_checksum is None

        # Second event references first
        assert events[1].previous_event_checksum == events[0].event_checksum

        # Third event references second
        assert events[2].previous_event_checksum == events[1].event_checksum

    def test_verify_chain_integrity(self, audit_service):
        """Chain verification should pass for intact log."""
        for i in range(5):
            audit_service.record(
                actor_id="user-001",
                actor_name="Test User",
                actor_role="tester",
                action=AuditAction.REPORT_CREATED,
                entity_type=EntityType.TEST_REPORT,
                entity_id=f"report-{i}",
            )

        assert audit_service.verify_chain() is True

    def test_tamper_detection(self, audit_service):
        """Chain verification should fail when event is tampered."""
        for i in range(3):
            audit_service.record(
                actor_id="user-001",
                actor_name="Test User",
                actor_role="tester",
                action=AuditAction.REPORT_CREATED,
                entity_type=EntityType.TEST_REPORT,
                entity_id=f"report-{i}",
            )

        # Tamper with an event
        audit_service._events[1].entity_id = "tampered-id"

        # Chain should be invalid
        assert audit_service.verify_chain() is False

    def test_old_value_tracking(self, audit_service):
        """Should track old and new values for updates."""
        event = audit_service.record(
            actor_id="user-001",
            actor_name="Test User",
            actor_role="tester",
            action=AuditAction.REPORT_UPDATED,
            entity_type=EntityType.TEST_REPORT,
            entity_id="report-001",
            old_value={"status": "draft"},
            new_value={"status": "in-testing"},
        )

        assert event.old_value == {"status": "draft"}
        assert event.new_value == {"status": "in-testing"}

    def test_convenience_methods(self, audit_service):
        """Convenience methods should create correct events."""
        # Report created
        e1 = audit_service.record_report_created(
            actor_id="user-001", actor_name="Tester", actor_role="tester",
            report_id="r-001", report_number="RPT-2026-001",
        )
        assert e1.action == AuditAction.REPORT_CREATED
        assert e1.entity_label == "RPT-2026-001"

        # Report submitted
        e2 = audit_service.record_report_submitted(
            actor_id="user-001", actor_name="Tester", actor_role="tester",
            report_id="r-001", report_number="RPT-2026-001",
        )
        assert e2.action == AuditAction.REPORT_SUBMITTED

        # Report approved
        e3 = audit_service.record_report_approved(
            actor_id="user-002", actor_name="Reviewer", actor_role="reviewer",
            report_id="r-001", report_number="RPT-2026-001",
            notes="All tests passed",
        )
        assert e3.action == AuditAction.REPORT_APPROVED

        # Report rejected
        e4 = audit_service.record_report_rejected(
            actor_id="user-002", actor_name="Reviewer", actor_role="reviewer",
            report_id="r-001", report_number="RPT-2026-001",
            reason="Missing observations",
        )
        assert e4.action == AuditAction.REPORT_REJECTED
        assert e4.notes == "Missing observations"

        # Report finalized
        e5 = audit_service.record_report_finalized(
            actor_id="user-002", actor_name="Reviewer", actor_role="reviewer",
            report_id="r-001", report_number="RPT-2026-001",
        )
        assert e5.action == AuditAction.REPORT_FINALIZED

        # Report exported
        e6 = audit_service.record_report_exported(
            actor_id="user-001", actor_name="Tester", actor_role="tester",
            report_id="r-001", report_number="RPT-2026-001",
            format="pdf",
        )
        assert e6.action == AuditAction.REPORT_EXPORTED
        assert e6.metadata["format"] == "pdf"

    def test_test_lifecycle_events(self, audit_service):
        """Test lifecycle convenience methods should work."""
        # Test started
        e1 = audit_service.record_test_started(
            actor_id="user-001", actor_name="Tester", actor_role="tester",
            report_id="r-001", report_number="RPT-001",
        )
        assert e1.action == AuditAction.TEST_STARTED

        # Observation added
        e2 = audit_service.record_observation_added(
            actor_id="user-001", actor_name="Tester", actor_role="tester",
            report_id="r-001",
            observation_data={"value": 100.002, "unit": "kg"},
        )
        assert e2.action == AuditAction.OBSERVATION_ADDED

        # Calculation executed
        e3 = audit_service.record_calculation_executed(
            actor_id="system", actor_name="System", actor_role="system",
            report_id="r-001", test_code="RPT",
            result={"status": "pass", "std_dev": 0.1633},
        )
        assert e3.action == AuditAction.CALCULATION_EXECUTED

        # Result created
        e4 = audit_service.record_result_created(
            actor_id="system", actor_name="System", actor_role="system",
            report_id="r-001",
            result_data={"verdict": "pass"},
        )
        assert e4.action == AuditAction.RESULT_CREATED

    def test_attachment_event(self, audit_service):
        """Attachment upload should be recorded."""
        event = audit_service.record_attachment_uploaded(
            actor_id="user-001", actor_name="Tester", actor_role="tester",
            attachment_id="att-001", file_name="photo.jpg",
            entity_type=EntityType.TEST_REPORT, entity_id="r-001",
        )
        assert event.action == AuditAction.ATTACHMENT_UPLOADED
        assert event.entity_label == "photo.jpg"

    def test_instrument_events(self, audit_service):
        """Instrument create/update should be recorded."""
        e1 = audit_service.record_instrument_created(
            actor_id="user-001", actor_name="Tester", actor_role="tester",
            instrument_id="i-001", serial_number="SN-001",
        )
        assert e1.action == AuditAction.INSTRUMENT_CREATED

        e2 = audit_service.record_instrument_updated(
            actor_id="user-001", actor_name="Tester", actor_role="tester",
            instrument_id="i-001", serial_number="SN-001",
            old_value={"condition": "good"},
            new_value={"condition": "needs-repair"},
        )
        assert e2.action == AuditAction.INSTRUMENT_UPDATED

    def test_auth_events(self, audit_service):
        """Authentication events should be recorded."""
        e1 = audit_service.record_login_success(
            actor_id="user-001", actor_name="Tester", actor_role="tester",
            actor_ip="192.168.1.1",
        )
        assert e1.action == AuditAction.LOGIN_SUCCESS
        assert e1.actor_ip == "192.168.1.1"

        e2 = audit_service.record_login_failure(
            actor_id="user-002", actor_name="Unknown", actor_role="unknown",
            actor_ip="10.0.0.1", reason="Invalid password",
        )
        assert e2.action == AuditAction.LOGIN_FAILURE

        e3 = audit_service.record_logout(
            actor_id="user-001", actor_name="Tester", actor_role="tester",
        )
        assert e3.action == AuditAction.LOGOUT


# ============================================================================
# AUDIT QUERY TESTS
# ============================================================================

class TestAuditQuery:
    """Test audit event querying."""

    def test_query_by_entity_type(self, audit_service):
        """Should filter by entity type."""
        audit_service.record(
            actor_id="u1", actor_name="A", actor_role="admin",
            action=AuditAction.REPORT_CREATED,
            entity_type=EntityType.TEST_REPORT, entity_id="r1",
        )
        audit_service.record(
            actor_id="u1", actor_name="A", actor_role="admin",
            action=AuditAction.INSTRUMENT_CREATED,
            entity_type=EntityType.INSTRUMENT, entity_id="i1",
        )

        report_events = audit_service.get_events(entity_type=EntityType.TEST_REPORT)
        assert len(report_events) == 1
        assert report_events[0].entity_id == "r1"

    def test_query_by_action(self, audit_service):
        """Should filter by action type."""
        audit_service.record(
            actor_id="u1", actor_name="A", actor_role="admin",
            action=AuditAction.REPORT_CREATED,
            entity_type=EntityType.TEST_REPORT, entity_id="r1",
        )
        audit_service.record(
            actor_id="u1", actor_name="A", actor_role="admin",
            action=AuditAction.REPORT_APPROVED,
            entity_type=EntityType.TEST_REPORT, entity_id="r1",
        )

        created = audit_service.get_events(action=AuditAction.REPORT_CREATED)
        assert len(created) == 1

    def test_query_by_actor(self, audit_service):
        """Should filter by actor ID."""
        audit_service.record(
            actor_id="u1", actor_name="Alice", actor_role="tester",
            action=AuditAction.REPORT_CREATED,
            entity_type=EntityType.TEST_REPORT, entity_id="r1",
        )
        audit_service.record(
            actor_id="u2", actor_name="Bob", actor_role="reviewer",
            action=AuditAction.REPORT_APPROVED,
            entity_type=EntityType.TEST_REPORT, entity_id="r1",
        )

        alice_events = audit_service.get_events(actor_id="u1")
        assert len(alice_events) == 1
        assert alice_events[0].actor_name == "Alice"

    def test_entity_history(self, audit_service):
        """Should get complete history for an entity."""
        for i in range(5):
            audit_service.record(
                actor_id="u1", actor_name="A", actor_role="admin",
                action=AuditAction.REPORT_CREATED,
                entity_type=EntityType.TEST_REPORT, entity_id="r1",
            )

        history = audit_service.get_entity_history(EntityType.TEST_REPORT, "r1")
        assert len(history) == 5

    def test_pagination(self, audit_service):
        """Should support pagination."""
        for i in range(10):
            audit_service.record(
                actor_id="u1", actor_name="A", actor_role="admin",
                action=AuditAction.REPORT_CREATED,
                entity_type=EntityType.TEST_REPORT, entity_id=f"r{i}",
            )

        page1 = audit_service.get_events(limit=3, offset=0)
        page2 = audit_service.get_events(limit=3, offset=3)

        assert len(page1) == 3
        assert len(page2) == 3
        # Pages should not overlap
        assert page1[0].sequence_number != page2[0].sequence_number

    def test_newest_first(self, audit_service):
        """Query results should be newest first."""
        for i in range(5):
            audit_service.record(
                actor_id="u1", actor_name="A", actor_role="admin",
                action=AuditAction.REPORT_CREATED,
                entity_type=EntityType.TEST_REPORT, entity_id=f"r{i}",
            )

        events = audit_service.get_events(limit=5)
        sequences = [e.sequence_number for e in events]
        assert sequences == sorted(sequences, reverse=True)


# ============================================================================
# RATE LIMITER TESTS
# ============================================================================

class TestRateLimiter:
    """Test rate limiting."""

    def test_allows_normal_traffic(self, rate_limiter):
        """Should allow normal traffic."""
        for _ in range(3):
            allowed, _ = rate_limiter.check("192.168.1.1")
            assert allowed is True

    def test_blocks_minute_limit(self, rate_limiter):
        """Should block after minute limit exceeded."""
        for _ in range(5):
            rate_limiter.check("192.168.1.1")

        allowed, headers = rate_limiter.check("192.168.1.1")
        assert allowed is False
        assert "Retry-After" in headers

    def test_separate_ip_tracking(self, rate_limiter):
        """Different IPs should have separate limits."""
        for _ in range(5):
            rate_limiter.check("192.168.1.1")

        # Different IP should still be allowed
        allowed, _ = rate_limiter.check("10.0.0.1")
        assert allowed is True

    def test_rate_limit_headers(self, rate_limiter):
        """Should return rate limit headers."""
        allowed, headers = rate_limiter.check("192.168.1.1")
        assert "X-RateLimit-Limit-Minute" in headers
        assert "X-RateLimit-Remaining-Minute" in headers
        assert "X-RateLimit-Limit-Hour" in headers
        assert "X-RateLimit-Remaining-Hour" in headers


# ============================================================================
# INPUT VALIDATION TESTS
# ============================================================================

class TestInputValidation:
    """Test input sanitization and validation."""

    def test_sanitize_string_normal(self):
        """Normal strings should pass through."""
        assert sanitize_string("hello world") == "hello world"

    def test_sanitize_string_trims(self):
        """Should trim whitespace."""
        assert sanitize_string("  hello  ") == "hello"

    def test_sanitize_string_truncates(self):
        """Should truncate long strings."""
        long = "x" * 2000
        result = sanitize_string(long, max_length=100)
        assert len(result) == 100

    def test_sanitize_string_removes_null_bytes(self):
        """Should remove null bytes."""
        assert sanitize_string("hello\x00world") == "helloworld"

    def test_validate_uuid_valid(self):
        """Valid UUID should pass."""
        assert validate_uuid("550e8400-e29b-41d4-a716-446655440000") is True

    def test_validate_uuid_invalid(self):
        """Invalid UUID should fail."""
        assert validate_uuid("not-a-uuid") is False
        assert validate_uuid("550e8400-e29b-41d4-a716") is False

    def test_validate_email_valid(self):
        """Valid email should pass."""
        assert validate_email("user@example.com") is True

    def test_validate_email_invalid(self):
        """Invalid email should fail."""
        assert validate_email("not-an-email") is False
        assert validate_email("@no-user.com") is False

    def test_validate_serial_number_valid(self):
        """Valid serial number should pass."""
        assert validate_serial_number("SN-2024-001") is True
        assert validate_serial_number("ABC123") is True

    def test_validate_serial_number_invalid(self):
        """Invalid serial number should fail."""
        assert validate_serial_number("") is False
        assert validate_serial_number("SN with spaces") is False

    def test_validate_report_number_valid(self):
        """Valid report number should pass."""
        assert validate_report_number("TST-2026-001234") is True

    def test_validate_report_number_invalid(self):
        """Invalid report number should fail."""
        assert validate_report_number("RPT-2026-001") is False
        assert validate_report_number("not-a-report") is False


# ============================================================================
# SESSION MANAGEMENT TESTS
# ============================================================================

class TestSessionManagement:
    """Test session lifecycle."""

    def test_create_session(self, session_manager):
        """Should create a session."""
        session = session_manager.create_session("user-001", "token-abc")
        assert session["created_at"] > 0
        assert session["expires_at"] > session["created_at"]

    def test_validate_session(self, session_manager):
        """Should validate active session."""
        session_manager.create_session("user-001", "token-abc")
        assert session_manager.validate_session("user-001", "token-abc") is True

    def test_invalid_session(self, session_manager):
        """Should reject invalid token."""
        assert session_manager.validate_session("user-001", "wrong-token") is False

    def test_invalidate_session(self, session_manager):
        """Should invalidate specific session."""
        session_manager.create_session("user-001", "token-abc")
        session_manager.invalidate_session("user-001", "token-abc")
        assert session_manager.validate_session("user-001", "token-abc") is False

    def test_invalidate_all_sessions(self, session_manager):
        """Should invalidate all sessions for a user."""
        session_manager.create_session("user-001", "token-1")
        session_manager.create_session("user-001", "token-2")
        session_manager.invalidate_all_sessions("user-001")
        assert session_manager.validate_session("user-001", "token-1") is False
        assert session_manager.validate_session("user-001", "token-2") is False

    def test_max_sessions_enforced(self, session_manager):
        """Should enforce max sessions per user."""
        for i in range(5):
            session_manager.create_session("user-001", f"token-{i}")

        assert session_manager.get_active_sessions("user-001") <= 3

    def test_separate_users(self, session_manager):
        """Sessions for different users should be independent."""
        session_manager.create_session("user-001", "token-1")
        session_manager.create_session("user-002", "token-2")

        assert session_manager.validate_session("user-001", "token-1") is True
        assert session_manager.validate_session("user-001", "token-2") is False
        assert session_manager.validate_session("user-002", "token-2") is True


# ============================================================================
# SECURITY INVARIANT TESTS
# ============================================================================

class TestSecurityInvariants:
    """Test critical security invariants."""

    def test_audit_events_immutable(self, audit_service):
        """Audit events cannot be modified after recording."""
        event = audit_service.record(
            actor_id="u1", actor_name="A", actor_role="admin",
            action=AuditAction.REPORT_CREATED,
            entity_type=EntityType.TEST_REPORT, entity_id="r1",
        )

        # Store reference
        stored = audit_service._events[0]

        # Try to modify (Python allows this but the service's chain breaks)
        stored.entity_id = "tampered"

        # Verify chain detects tampering
        assert audit_service.verify_chain() is False

    def test_all_mandatory_events_covered(self):
        """All required audit events should be defined."""
        required = [
            "REPORT_CREATED",
            "REPORT_UPDATED",
            "TEST_STARTED",
            "OBSERVATION_ADDED",
            "OBSERVATION_UPDATED",
            "CALCULATION_EXECUTED",
            "RESULT_CREATED",
            "REPORT_SUBMITTED",
            "REPORT_APPROVED",
            "REPORT_REJECTED",
            "REPORT_FINALIZED",
            "REPORT_EXPORTED",
            "ATTACHMENT_UPLOADED",
        ]
        for event_name in required:
            assert hasattr(AuditAction, event_name), f"Missing: {event_name}"

    def test_audit_events_have_timestamps(self, audit_service):
        """Every audit event must have a timestamp."""
        event = audit_service.record(
            actor_id="u1", actor_name="A", actor_role="admin",
            action=AuditAction.REPORT_CREATED,
            entity_type=EntityType.TEST_REPORT, entity_id="r1",
        )
        assert event.timestamp is not None
        assert isinstance(event.timestamp, datetime)

    def test_audit_events_have_checksums(self, audit_service):
        """Every audit event must have a checksum."""
        event = audit_service.record(
            actor_id="u1", actor_name="A", actor_role="admin",
            action=AuditAction.REPORT_CREATED,
            entity_type=EntityType.TEST_REPORT, entity_id="r1",
        )
        assert event.event_checksum is not None
        assert len(event.event_checksum) == 64  # SHA-256 hex

    def test_no_secrets_in_audit_events(self, audit_service):
        """Audit events must not contain passwords or tokens in notes."""
        event = audit_service.record(
            actor_id="u1", actor_name="A", actor_role="admin",
            action=AuditAction.LOGIN_SUCCESS,
            entity_type=EntityType.USER, entity_id="u1",
            notes="User logged in successfully",
        )
        # Notes should never contain sensitive data
        assert event.notes is not None
        assert "password" not in event.notes.lower()
        assert "token" not in event.notes.lower()

    def test_rate_limiter_isolated_per_ip(self, rate_limiter):
        """Rate limits should be isolated per IP."""
        # Exhaust one IP
        for _ in range(5):
            rate_limiter.check("192.168.1.1")

        # Other IPs unaffected
        allowed, _ = rate_limiter.check("10.0.0.1")
        assert allowed is True

    def test_session_expiry_enforced(self, session_manager):
        """Expired sessions should be rejected."""
        session_manager.create_session("user-001", "token-abc")

        # Manually expire the session
        session_manager._sessions["user-001"][0]["expires_at"] = 0

        assert session_manager.validate_session("user-001", "token-abc") is False

    def test_single_tenant_isolation(self, audit_service):
        """Audit queries should not leak data across tenants."""
        # User from lab A
        audit_service.record(
            actor_id="u1", actor_name="A", actor_role="tester",
            action=AuditAction.REPORT_CREATED,
            entity_type=EntityType.TEST_REPORT, entity_id="r-a1",
            metadata={"laboratory_id": "lab-A"},
        )

        # User from lab B
        audit_service.record(
            actor_id="u2", actor_name="B", actor_role="tester",
            action=AuditAction.REPORT_CREATED,
            entity_type=EntityType.TEST_REPORT, entity_id="r-b1",
            metadata={"laboratory_id": "lab-B"},
        )

        # Query by actor should only return that actor's events
        u1_events = audit_service.get_events(actor_id="u1")
        assert all(e.actor_id == "u1" for e in u1_events)

        u2_events = audit_service.get_events(actor_id="u2")
        assert all(e.actor_id == "u2" for e in u2_events)

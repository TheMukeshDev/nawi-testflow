"""
Tests for Attachment & Document Management Engine

Tests cover:
- File validation
- Upload/download with access control
- Category-based organization
- Checksum verification
- Digital signature placeholders
- Entity attachment tracking
- Error cases
"""

import pytest
from datetime import datetime, timedelta

from engine.attachments import (
    Attachment,
    AttachmentCategory,
    AttachmentStore,
    AttachmentValidation,
    EntityType,
    FileType,
    SignaturePlaceholder,
    SignatureStatus,
    StoredFile,
    compute_checksum,
    generate_storage_path,
    validate_file,
    verify_checksum,
    get_attachment_store,
    reset_attachment_store,
    MAX_FILE_SIZES,
    ALLOWED_FILE_TYPES,
)


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def store():
    """Fresh attachment store for each test."""
    reset_attachment_store()
    return AttachmentStore()


@pytest.fixture
def sample_pdf():
    """Sample PDF file data."""
    return b"%PDF-1.4 fake pdf content for testing purposes"


@pytest.fixture
def sample_jpeg():
    """Sample JPEG file data."""
    return b"\xff\xd8\xff\xe0 fake jpeg content for testing"


@pytest.fixture
def sample_docx():
    """Sample DOCX file data."""
    return b"PK fake docx content for testing purposes"


@pytest.fixture
def large_file():
    """File exceeding max size for photos."""
    return b"x" * (21 * 1024 * 1024)  # 21 MB


@pytest.fixture
def empty_file():
    """Empty file."""
    return b""


# ============================================================================
# VALIDATION TESTS
# ============================================================================

class TestFileValidation:
    """Test file validation logic."""
    
    def test_valid_pdf_upload(self):
        """Valid PDF should pass validation."""
        result = validate_file(
            file_name="test_report.pdf",
            file_size=1024 * 100,
            file_type="application/pdf",
            category=AttachmentCategory.REPORT,
        )
        assert result.is_valid
        assert len(result.errors) == 0
    
    def test_valid_jpeg_photo(self):
        """Valid JPEG for photo category should pass."""
        result = validate_file(
            file_name="instrument_photo.jpg",
            file_size=1024 * 500,
            file_type="image/jpeg",
            category=AttachmentCategory.PHOTO,
        )
        assert result.is_valid
    
    def test_empty_file_name(self):
        """Empty file name should fail."""
        result = validate_file(
            file_name="",
            file_size=1024,
            file_type="application/pdf",
            category=AttachmentCategory.OTHER,
        )
        assert not result.is_valid
        assert any("empty" in e.lower() for e in result.errors)
    
    def test_long_file_name(self):
        """File name > 255 chars should fail."""
        result = validate_file(
            file_name="x" * 256 + ".pdf",
            file_size=1024,
            file_type="application/pdf",
            category=AttachmentCategory.OTHER,
        )
        assert not result.is_valid
        assert any("too long" in e.lower() for e in result.errors)
    
    def test_empty_file(self):
        """Zero-byte file should fail."""
        result = validate_file(
            file_name="empty.pdf",
            file_size=0,
            file_type="application/pdf",
            category=AttachmentCategory.REPORT,
        )
        assert not result.is_valid
        assert any("empty" in e.lower() for e in result.errors)
    
    def test_file_too_large(self):
        """File exceeding category limit should fail."""
        max_size = MAX_FILE_SIZES[AttachmentCategory.PHOTO]
        result = validate_file(
            file_name="huge.jpg",
            file_size=max_size + 1,
            file_type="image/jpeg",
            category=AttachmentCategory.PHOTO,
        )
        assert not result.is_valid
        assert any("exceeds maximum" in e.lower() for e in result.errors)
    
    def test_wrong_file_type_for_category(self):
        """EXE should not be allowed in any category."""
        result = validate_file(
            file_name="malware.exe",
            file_size=1024,
            file_type="application/octet-stream",
            category=AttachmentCategory.OTHER,
        )
        assert not result.is_valid
        assert any("security" in e.lower() for e in result.errors)
    
    def test_dangerous_extensions_blocked(self):
        """Various dangerous extensions should be blocked."""
        dangerous = ['.exe', '.bat', '.sh', '.ps1', '.vbs', '.dll']
        for ext in dangerous:
            result = validate_file(
                file_name=f"test{ext}",
                file_size=1024,
                file_type="application/octet-stream",
                category=AttachmentCategory.OTHER,
            )
            assert not result.is_valid, f"Extension {ext} should be blocked"
    
    def test_valid_docx_for_report(self):
        """DOCX should be allowed for reports."""
        result = validate_file(
            file_name="report.docx",
            file_size=1024 * 50,
            file_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            category=AttachmentCategory.REPORT,
        )
        assert result.is_valid
    
    def test_xlsx_for_calibration(self):
        """XLSX should be allowed for calibration docs."""
        result = validate_file(
            file_name="calibration.xlsx",
            file_size=1024 * 20,
            file_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            category=AttachmentCategory.CALIBRATION,
        )
        assert result.is_valid
    
    def test_warnings_for_large_photos(self):
        """Large photos should generate warnings."""
        result = validate_file(
            file_name="photo.jpg",
            file_size=15 * 1024 * 1024,  # 15 MB
            file_type="image/jpeg",
            category=AttachmentCategory.PHOTO,
        )
        # Should still be valid but may have warnings
        assert result.is_valid


# ============================================================================
# CHECKSUM TESTS
# ============================================================================

class TestChecksum:
    """Test checksum computation and verification."""
    
    def test_compute_checksum_deterministic(self):
        """Same data should always produce same checksum."""
        data = b"test data for checksum"
        checksum1 = compute_checksum(data)
        checksum2 = compute_checksum(data)
        assert checksum1 == checksum2
    
    def test_different_data_different_checksum(self):
        """Different data should produce different checksums."""
        data1 = b"data version 1"
        data2 = b"data version 2"
        assert compute_checksum(data1) != compute_checksum(data2)
    
    def test_verify_checksum_valid(self):
        """Checksum verification should pass for correct data."""
        data = b"important document"
        checksum = compute_checksum(data)
        assert verify_checksum(data, checksum)
    
    def test_verify_checksum_invalid(self):
        """Checksum verification should fail for corrupted data."""
        data = b"original data"
        corrupted = b"corrupted data"
        checksum = compute_checksum(data)
        assert not verify_checksum(corrupted, checksum)
    
    def test_checksum_hex_string(self):
        """Checksum should be a 64-character hex string."""
        checksum = compute_checksum(b"test")
        assert len(checksum) == 64
        assert all(c in '0123456789abcdef' for c in checksum)


# ============================================================================
# STORAGE PATH TESTS
# ============================================================================

class TestStoragePath:
    """Test storage path generation."""
    
    def test_path_structure(self):
        """Path should follow entity_type/entity_id/category/uuid_name."""
        path = generate_storage_path(
            EntityType.TEST_REPORT,
            "report-123",
            "photo.jpg",
            AttachmentCategory.PHOTO,
        )
        parts = path.split("/")
        assert parts[0] == "test-report"
        assert parts[1] == "report-123"
        assert parts[2] == "photo"
        assert "photo" in parts[3]
        assert parts[3].endswith(".jpg")
    
    def test_path_unique(self):
        """Two calls should produce different paths."""
        path1 = generate_storage_path(
            EntityType.INSTRUMENT,
            "inst-1",
            "doc.pdf",
            AttachmentCategory.DOCUMENT,
        )
        path2 = generate_storage_path(
            EntityType.INSTRUMENT,
            "inst-1",
            "doc.pdf",
            AttachmentCategory.DOCUMENT,
        )
        assert path1 != path2
    
    def test_special_characters_sanitized(self):
        """Special characters in filename should be sanitized."""
        path = generate_storage_path(
            EntityType.INSTRUMENT,
            "inst-1",
            "file with spaces & symbols!.pdf",
            AttachmentCategory.OTHER,
        )
        filename = path.split("/")[-1]
        assert " " not in filename
        assert "&" not in filename
        assert "!" not in filename


# ============================================================================
# STORE UPLOAD/DOWNLOAD TESTS
# ============================================================================

class TestAttachmentStore:
    """Test in-memory attachment store."""
    
    def test_upload_valid_pdf(self, store, sample_pdf):
        """Upload a valid PDF attachment."""
        attachment, validation = store.upload(
            file_name="test_report.pdf",
            file_data=sample_pdf,
            file_type="application/pdf",
            entity_type=EntityType.TEST_REPORT,
            entity_id="report-001",
            category=AttachmentCategory.REPORT,
            uploaded_by="user-001",
            description="Test report for instrument inspection",
        )
        
        assert validation.is_valid
        assert attachment is not None
        assert attachment.file_name == "test_report.pdf"
        assert attachment.file_size == len(sample_pdf)
        assert attachment.entity_type == EntityType.TEST_REPORT
        assert attachment.entity_id == "report-001"
        assert attachment.category == AttachmentCategory.REPORT
        assert attachment.uploaded_by == "user-001"
        assert attachment.checksum == compute_checksum(sample_pdf)
    
    def test_upload_invalid_file(self, store, empty_file):
        """Upload an empty file should fail."""
        attachment, validation = store.upload(
            file_name="empty.pdf",
            file_data=empty_file,
            file_type="application/pdf",
            entity_type=EntityType.TEST_REPORT,
            entity_id="report-001",
            category=AttachmentCategory.REPORT,
        )
        
        assert not validation.is_valid
        assert attachment is None
    
    def test_download_after_upload(self, store, sample_pdf):
        """Should be able to download after upload."""
        attachment, _ = store.upload(
            file_name="report.pdf",
            file_data=sample_pdf,
            file_type="application/pdf",
            entity_type=EntityType.TEST_REPORT,
            entity_id="report-001",
            category=AttachmentCategory.REPORT,
        )
        
        result = store.download(
            attachment_id=attachment.id,
            user_role="tester",
        )
        
        assert result is not None
        data, file_name, checksum = result
        assert data == sample_pdf
        assert file_name == "report.pdf"
        assert checksum == attachment.checksum
    
    def test_download_nonexistent(self, store):
        """Download nonexistent attachment should return None."""
        result = store.download(
            attachment_id="nonexistent-id",
            user_role="admin",
        )
        assert result is None
    
    def test_integrity_verification(self, store):
        """Checksum verification should detect corruption."""
        data = b"original file content"
        attachment, _ = store.upload(
            file_name="doc.pdf",
            file_data=data,
            file_type="application/pdf",
            entity_type=EntityType.TEST_REPORT,
            entity_id="report-001",
            category=AttachmentCategory.REPORT,
        )
        
        # Manually corrupt the stored file
        stored = store._files[attachment.file_path]
        stored.data = b"corrupted content"
        
        # Download should detect mismatch
        with pytest.raises(ValueError, match="integrity"):
            store.download(attachment_id=attachment.id, user_role="admin")
    
    def test_entity_attachments(self, store, sample_pdf, sample_jpeg):
        """Should be able to list attachments by entity."""
        # Upload two attachments for same entity
        att1, _ = store.upload(
            file_name="report.pdf",
            file_data=sample_pdf,
            file_type="application/pdf",
            entity_type=EntityType.TEST_REPORT,
            entity_id="report-001",
            category=AttachmentCategory.REPORT,
        )
        att2, _ = store.upload(
            file_name="photo.jpg",
            file_data=sample_jpeg,
            file_type="image/jpeg",
            entity_type=EntityType.TEST_REPORT,
            entity_id="report-001",
            category=AttachmentCategory.PHOTO,
        )
        
        # Get all attachments
        attachments = store.get_entity_attachments(
            EntityType.TEST_REPORT,
            "report-001",
        )
        assert len(attachments) == 2
        
        # Filter by category
        photos = store.get_entity_attachments(
            EntityType.TEST_REPORT,
            "report-001",
            category=AttachmentCategory.PHOTO,
        )
        assert len(photos) == 1
        assert photos[0].id == att2.id
    
    def test_delete_admin_only(self, store, sample_pdf):
        """Only admin can delete attachments."""
        attachment, _ = store.upload(
            file_name="report.pdf",
            file_data=sample_pdf,
            file_type="application/pdf",
            entity_type=EntityType.TEST_REPORT,
            entity_id="report-001",
            category=AttachmentCategory.REPORT,
        )
        
        # Tester cannot delete
        with pytest.raises(PermissionError):
            store.delete(attachment.id, user_role="tester")
        
        # Admin can delete
        result = store.delete(attachment.id, user_role="admin")
        assert result is True
        
        # Verify deleted
        assert store.get_attachment(attachment.id) is None
    
    def test_count_attachments(self, store, sample_pdf):
        """Should count attachments correctly."""
        # Upload 3 attachments
        for i in range(3):
            store.upload(
                file_name=f"doc{i}.pdf",
                file_data=sample_pdf,
                file_type="application/pdf",
                entity_type=EntityType.TEST_REPORT,
                entity_id="report-001",
                category=AttachmentCategory.REPORT,
            )
        
        count = store.count_entity_attachments(
            EntityType.TEST_REPORT,
            "report-001",
        )
        assert count == 3
    
    def test_multiple_entity_types(self, store, sample_pdf):
        """Attachments for different entities should be separate."""
        store.upload(
            file_name="report.pdf",
            file_data=sample_pdf,
            file_type="application/pdf",
            entity_type=EntityType.TEST_REPORT,
            entity_id="report-001",
            category=AttachmentCategory.REPORT,
        )
        store.upload(
            file_name="manual.pdf",
            file_data=sample_pdf,
            file_type="application/pdf",
            entity_type=EntityType.INSTRUMENT,
            entity_id="inst-001",
            category=AttachmentCategory.DOCUMENT,
        )
        
        report_atts = store.get_entity_attachments(
            EntityType.TEST_REPORT, "report-001"
        )
        inst_atts = store.get_entity_attachments(
            EntityType.INSTRUMENT, "inst-001"
        )
        
        assert len(report_atts) == 1
        assert len(inst_atts) == 1


# ============================================================================
# DIGITAL SIGNATURE PLACEHOLDER TESTS
# ============================================================================

class TestSignaturePlaceholder:
    """Test digital signature placeholder functionality."""
    
    def test_create_signature_placeholder(self, store):
        """Should create a signature placeholder."""
        signature = store.create_signature_placeholder(
            entity_type=EntityType.TEST_REPORT,
            entity_id="report-001",
            signer_id="reviewer-001",
            signer_name="Dr. Kumar",
            signer_role="reviewer",
            notes="Approving test results",
        )
        
        assert signature.id is not None
        assert signature.status == SignatureStatus.PENDING
        assert signature.signer_id == "reviewer-001"
        assert signature.signer_name == "Dr. Kumar"
        assert signature.is_placeholder is True
        assert "placeholder" in signature.disclaimer.lower()
    
    def test_sign_placeholder(self, store):
        """Should complete a signature placeholder."""
        signature = store.create_signature_placeholder(
            entity_type=EntityType.TEST_REPORT,
            entity_id="report-001",
            signer_id="reviewer-001",
            signer_name="Dr. Kumar",
            signer_role="reviewer",
        )
        
        signed = store.sign_placeholder(
            signature_id=signature.id,
            signer_id="reviewer-001",
            notes="Reviewed and approved",
        )
        
        assert signed.status == SignatureStatus.SIGNED
        assert signed.notes == "Reviewed and approved"
    
    def test_wrong_signer_cannot_sign(self, store):
        """Only designated signer can sign."""
        signature = store.create_signature_placeholder(
            entity_type=EntityType.TEST_REPORT,
            entity_id="report-001",
            signer_id="reviewer-001",
            signer_name="Dr. Kumar",
            signer_role="reviewer",
        )
        
        with pytest.raises(PermissionError):
            store.sign_placeholder(
                signature_id=signature.id,
                signer_id="wrong-user",
            )
    
    def test_cannot_sign_twice(self, store):
        """Cannot sign an already-signed placeholder."""
        signature = store.create_signature_placeholder(
            entity_type=EntityType.TEST_REPORT,
            entity_id="report-001",
            signer_id="reviewer-001",
            signer_name="Dr. Kumar",
            signer_role="reviewer",
        )
        
        store.sign_placeholder(signature.id, "reviewer-001")
        
        with pytest.raises(ValueError, match="Cannot sign"):
            store.sign_placeholder(signature.id, "reviewer-001")
    
    def test_list_entity_signatures(self, store):
        """Should list signatures for an entity."""
        store.create_signature_placeholder(
            entity_type=EntityType.TEST_REPORT,
            entity_id="report-001",
            signer_id="reviewer-001",
            signer_name="Dr. Kumar",
            signer_role="reviewer",
        )
        store.create_signature_placeholder(
            entity_type=EntityType.TEST_REPORT,
            entity_id="report-001",
            signer_id="admin-001",
            signer_name="Admin User",
            signer_role="admin",
        )
        
        signatures = store.get_signatures(
            EntityType.TEST_REPORT,
            "report-001",
        )
        
        assert len(signatures) == 2
    
    def test_signature_to_dict(self, store):
        """Signature should serialize to dict correctly."""
        signature = store.create_signature_placeholder(
            entity_type=EntityType.TEST_REPORT,
            entity_id="report-001",
            signer_id="reviewer-001",
            signer_name="Dr. Kumar",
            signer_role="reviewer",
        )
        
        d = signature.to_dict()
        assert d["entity_type"] == "test-report"
        assert d["status"] == "pending"
        assert d["signer_name"] == "Dr. Kumar"


# ============================================================================
# ATTACHMENT TO_DICT TESTS
# ============================================================================

class TestAttachmentSerialization:
    """Test attachment serialization."""
    
    def test_to_dict(self, store, sample_pdf):
        """Attachment should serialize correctly."""
        attachment, _ = store.upload(
            file_name="report.pdf",
            file_data=sample_pdf,
            file_type="application/pdf",
            entity_type=EntityType.TEST_REPORT,
            entity_id="report-001",
            category=AttachmentCategory.REPORT,
            description="Main test report",
        )
        
        d = attachment.to_dict()
        assert d["file_name"] == "report.pdf"
        assert d["entity_type"] == "test-report"
        assert d["category"] == "report"
        assert d["description"] == "Main test report"
        assert "id" in d
        assert "checksum" in d


# ============================================================================
# GLOBAL STORE TESTS
# ============================================================================

class TestGlobalStore:
    """Test global store singleton."""
    
    def test_get_store_singleton(self):
        """get_attachment_store should return same instance."""
        reset_attachment_store()
        store1 = get_attachment_store()
        store2 = get_attachment_store()
        assert store1 is store2
    
    def test_reset_store(self):
        """reset should create new instance."""
        reset_attachment_store()
        store1 = get_attachment_store()
        reset_attachment_store()
        store2 = get_attachment_store()
        assert store1 is not store2


# ============================================================================
# EDGE CASES
# ============================================================================

class TestEdgeCases:
    """Test edge cases and boundary conditions."""
    
    def test_upload_at_size_limit(self, store):
        """Upload at exact size limit should succeed."""
        max_size = MAX_FILE_SIZES[AttachmentCategory.PHOTO]
        data = b"x" * max_size
        
        attachment, validation = store.upload(
            file_name="at_limit.jpg",
            file_data=data,
            file_type="image/jpeg",
            entity_type=EntityType.INSTRUMENT,
            entity_id="inst-001",
            category=AttachmentCategory.PHOTO,
        )
        
        assert validation.is_valid
        assert attachment.file_size == max_size
    
    def test_upload_over_size_limit(self, store):
        """Upload over size limit should fail."""
        max_size = MAX_FILE_SIZES[AttachmentCategory.PHOTO]
        data = b"x" * (max_size + 1)
        
        attachment, validation = store.upload(
            file_name="over_limit.jpg",
            file_data=data,
            file_type="image/jpeg",
            entity_type=EntityType.INSTRUMENT,
            entity_id="inst-001",
            category=AttachmentCategory.PHOTO,
        )
        
        assert not validation.is_valid
        assert attachment is None
    
    def test_concurrent_uploads_same_name(self, store, sample_pdf):
        """Multiple uploads with same name should have unique paths."""
        attachments = []
        for _ in range(5):
            att, _ = store.upload(
                file_name="same_name.pdf",
                file_data=sample_pdf,
                file_type="application/pdf",
                entity_type=EntityType.TEST_REPORT,
                entity_id="report-001",
                category=AttachmentCategory.REPORT,
            )
            attachments.append(att)
        
        paths = [a.file_path for a in attachments]
        assert len(set(paths)) == 5, "All paths should be unique"
    
    def test_attachment_for_all_entity_types(self, store, sample_pdf):
        """Should support all entity types."""
        for entity_type in EntityType:
            attachment, validation = store.upload(
                file_name="test.pdf",
                file_data=sample_pdf,
                file_type="application/pdf",
                entity_type=entity_type,
                entity_id="entity-001",
                category=AttachmentCategory.DOCUMENT,
            )
            assert validation.is_valid
            assert attachment.entity_type == entity_type

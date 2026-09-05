"""
NAWI Sahayak — Attachment & Document Management

Handles:
- Secure file upload/download
- File metadata tracking
- Category-based organization
- Access control enforcement
- Digital signature placeholder architecture
- File integrity verification (SHA-256 checksums)

IMPORTANT: Digital signatures in this module are PLACEHOLDER ONLY.
They do NOT constitute legally valid digital signatures.
A compliant signing mechanism must be integrated separately for legal validity.
"""

import hashlib
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, BinaryIO


# ============================================================================
# ENUMERATIONS
# ============================================================================

class AttachmentCategory(str, Enum):
    """Categories for attachments."""
    PHOTO = "photo"
    CERTIFICATE = "certificate"
    CALIBRATION = "calibration"
    OBSERVATION = "observation"
    REPORT = "report"
    DOCUMENT = "document"
    OTHER = "other"


class EntityType(str, Enum):
    """Entity types that can have attachments."""
    TEST_REPORT = "test-report"
    INSTRUMENT = "instrument"
    LABORATORY = "laboratory"
    EQUIPMENT = "equipment"
    USER = "user"


class SignatureStatus(str, Enum):
    """Digital signature status.
    
    IMPORTANT: For MVP, these are PLACEHOLDER statuses only.
    They do NOT constitute legally valid digital signatures.
    """
    PENDING = "pending"
    SIGNED = "signed"
    REJECTED = "rejected"
    EXPIRED = "expired"


class FileType(str, Enum):
    """Allowed file types."""
    # Images
    JPEG = "image/jpeg"
    PNG = "image/png"
    TIFF = "image/tiff"
    BMP = "image/bmp"
    
    # Documents
    PDF = "application/pdf"
    DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    CSV = "text/csv"
    
    # Other
    TEXT = "text/plain"
    XML = "application/xml"
    JSON = "application/json"


# ============================================================================
# CONSTANTS
# ============================================================================

# Maximum file sizes by category (in bytes)
MAX_FILE_SIZES = {
    AttachmentCategory.PHOTO: 20 * 1024 * 1024,  # 20 MB
    AttachmentCategory.CERTIFICATE: 10 * 1024 * 1024,  # 10 MB
    AttachmentCategory.CALIBRATION: 10 * 1024 * 1024,  # 10 MB
    AttachmentCategory.OBSERVATION: 5 * 1024 * 1024,  # 5 MB
    AttachmentCategory.REPORT: 50 * 1024 * 1024,  # 50 MB
    AttachmentCategory.DOCUMENT: 20 * 1024 * 1024,  # 20 MB
    AttachmentCategory.OTHER: 10 * 1024 * 1024,  # 10 MB
}

# Allowed file types by category
ALLOWED_FILE_TYPES = {
    AttachmentCategory.PHOTO: [
        FileType.JPEG, FileType.PNG, FileType.TIFF, FileType.BMP,
    ],
    AttachmentCategory.CERTIFICATE: [
        FileType.PDF, FileType.DOCX, FileType.JPEG, FileType.PNG,
    ],
    AttachmentCategory.CALIBRATION: [
        FileType.PDF, FileType.DOCX, FileType.XLSX, FileType.CSV,
    ],
    AttachmentCategory.OBSERVATION: [
        FileType.PDF, FileType.CSV, FileType.XLSX, FileType.TEXT,
    ],
    AttachmentCategory.REPORT: [
        FileType.PDF, FileType.DOCX,
    ],
    AttachmentCategory.DOCUMENT: [
        FileType.PDF, FileType.DOCX, FileType.XLSX, FileType.TEXT,
        FileType.XML, FileType.JSON,
    ],
    AttachmentCategory.OTHER: [
        FileType.PDF, FileType.DOCX, FileType.XLSX, FileType.CSV,
        FileType.TEXT, FileType.XML, FileType.JSON,
        FileType.JPEG, FileType.PNG,
    ],
}

# Storage bucket name
STORAGE_BUCKET = "nawi-attachments"


# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass
class Attachment:
    """Attachment metadata record."""
    id: str
    entity_type: EntityType
    entity_id: str
    file_name: str
    file_type: str  # MIME type
    file_size: int  # bytes
    file_path: str  # Storage path
    storage_bucket: str = STORAGE_BUCKET
    category: AttachmentCategory = AttachmentCategory.OTHER
    description: Optional[str] = None
    uploaded_by: Optional[str] = None
    uploaded_at: datetime = field(default_factory=datetime.utcnow)
    checksum: Optional[str] = None  # SHA-256
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "entity_type": self.entity_type.value,
            "entity_id": self.entity_id,
            "file_name": self.file_name,
            "file_type": self.file_type,
            "file_size": self.file_size,
            "file_path": self.file_path,
            "storage_bucket": self.storage_bucket,
            "category": self.category.value,
            "description": self.description,
            "uploaded_by": self.uploaded_by,
            "uploaded_at": self.uploaded_at.isoformat(),
            "checksum": self.checksum,
        }


@dataclass
class SignaturePlaceholder:
    """Digital signature placeholder.
    
    IMPORTANT DISCLAIMER:
    This is a PLACEHOLDER architecture for MVP purposes only.
    It does NOT constitute a legally valid digital signature.
    
    For legal validity, integrate a compliant signing mechanism such as:
    - Aadhaar e-Sign (India)
    - DSC (Digital Signature Certificate)
    - ICAO-compliant electronic signatures
    
    This placeholder records intent and approval but should NOT be
    presented as a legally binding signature.
    """
    id: str
    attachment_id: Optional[str]  # Attachment being signed
    entity_type: EntityType
    entity_id: str
    signer_id: str  # User who signed
    signer_name: str
    signer_role: str  # Role at time of signing
    signed_at: datetime = field(default_factory=datetime.utcnow)
    status: SignatureStatus = SignatureStatus.PENDING
    notes: Optional[str] = None
    
    # Placeholder certificate info (NOT a real certificate)
    certificate_id: Optional[str] = None
    certificate_issuer: Optional[str] = None
    certificate_valid_until: Optional[datetime] = None
    
    # Audit
    replaced_by: Optional[str] = None  # If signature was replaced
    replacement_reason: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "attachment_id": self.attachment_id,
            "entity_type": self.entity_type.value,
            "entity_id": self.entity_id,
            "signer_id": self.signer_id,
            "signer_name": self.signer_name,
            "signer_role": self.signer_role,
            "signed_at": self.signed_at.isoformat(),
            "status": self.status.value,
            "notes": self.notes,
            "certificate_id": self.certificate_id,
            "certificate_issuer": self.certificate_issuer,
            "certificate_valid_until": (
                self.certificate_valid_until.isoformat()
                if self.certificate_valid_until
                else None
            ),
            "replaced_by": self.replaced_by,
            "replacement_reason": self.replacement_reason,
        }
    
    @property
    def is_placeholder(self) -> bool:
        """This is always True — indicating this is NOT a real signature."""
        return True
    
    @property
    def disclaimer(self) -> str:
        """Legal disclaimer about this placeholder."""
        return (
            "DISCLAIMER: This is a placeholder signature for MVP purposes only. "
            "It does NOT constitute a legally valid digital signature. "
            "For legal validity, integrate a compliant signing mechanism."
        )


@dataclass
class AttachmentValidation:
    """Result of attachment validation."""
    is_valid: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    
    def add_error(self, message: str):
        self.errors.append(message)
        self.is_valid = False
    
    def add_warning(self, message: str):
        self.warnings.append(message)


# ============================================================================
# FILE VALIDATION
# ============================================================================

def validate_file(
    file_name: str,
    file_size: int,
    file_type: str,
    category: AttachmentCategory,
) -> AttachmentValidation:
    """
    Validate an attachment before upload.
    
    Checks:
    - File size within limits
    - File type allowed for category
    - File name is valid
    - No executable extensions
    """
    result = AttachmentValidation(is_valid=True)
    
    # Check file name
    if not file_name or len(file_name.strip()) == 0:
        result.add_error("File name cannot be empty")
        return result
    
    if len(file_name) > 255:
        result.add_error("File name too long (max 255 characters)")
        return result
    
    # Check for executable extensions
    dangerous_extensions = [
        '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
        '.sh', '.bash', '.csh', '.ksh',
        '.js', '.vbs', '.vbe', '.wsf', '.wsh',
        '.ps1', '.psm1', '.psd1',
        '.py', '.pyc', '.pyw',
        '.rb', '.pl', '.php',
        '.asp', '.aspx', '.jsp',
        '.dll', '.sys', '.drv',
    ]
    file_ext = os.path.splitext(file_name)[1].lower()
    if file_ext in dangerous_extensions:
        result.add_error(f"File type '{file_ext}' is not allowed for security reasons")
        return result
    
    # Check file size
    max_size = MAX_FILE_SIZES.get(category, 10 * 1024 * 1024)
    if file_size > max_size:
        max_mb = max_size / (1024 * 1024)
        file_mb = file_size / (1024 * 1024)
        result.add_error(
            f"File size ({file_mb:.1f} MB) exceeds maximum ({max_mb:.0f} MB) "
            f"for category '{category.value}'"
        )
        return result
    
    if file_size == 0:
        result.add_error("File is empty (0 bytes)")
        return result
    
    # Check file type
    allowed_types = ALLOWED_FILE_TYPES.get(category, [])
    if allowed_types and file_type not in [ft.value for ft in allowed_types]:
        allowed_extensions = [
            ft.value.split('/')[-1] for ft in allowed_types
        ]
        result.add_error(
            f"File type '{file_type}' is not allowed for category '{category.value}'. "
            f"Allowed types: {', '.join(allowed_extensions)}"
        )
        return result
    
    return result


def compute_checksum(data: bytes) -> str:
    """Compute SHA-256 checksum of file data."""
    return hashlib.sha256(data).hexdigest()


def verify_checksum(data: bytes, expected_checksum: str) -> bool:
    """Verify file data matches expected checksum."""
    return compute_checksum(data) == expected_checksum


# ============================================================================
# STORAGE PATH GENERATION
# ============================================================================

def generate_storage_path(
    entity_type: EntityType,
    entity_id: str,
    file_name: str,
    category: AttachmentCategory,
) -> str:
    """
    Generate a secure storage path for an attachment.
    
    Path structure: {entity_type}/{entity_id}/{category}/{uuid}_{filename}
    
    Uses UUID to prevent:
    - Path traversal attacks
    - File name collisions
    - Enumeration of attachments
    """
    safe_name = "".join(
        c for c in file_name if c.isalnum() or c in ('.', '_', '-')
    )
    if not safe_name:
        safe_name = "attachment"
    
    unique_id = uuid.uuid4().hex[:12]
    
    return f"{entity_type.value}/{entity_id}/{category.value}/{unique_id}_{safe_name}"


# ============================================================================
# IN-MEMORY STORAGE (for MVP / testing)
# ============================================================================

@dataclass
class StoredFile:
    """In-memory stored file (for MVP)."""
    path: str
    data: bytes
    content_type: str
    checksum: str
    stored_at: datetime = field(default_factory=datetime.utcnow)


class AttachmentStore:
    """
    In-memory attachment storage for MVP.
    
    In production, replace with Supabase Storage or S3.
    
    This store:
    - Keeps files in memory (for testing/MVP only)
    - Enforces access control
    - Tracks metadata
    - Verifies checksums
    """
    
    def __init__(self):
        self._files: dict[str, StoredFile] = {}  # path -> StoredFile
        self._attachments: dict[str, Attachment] = {}  # id -> Attachment
        self._signatures: dict[str, SignaturePlaceholder] = {}  # id -> Signature
        self._entity_attachments: dict[str, list[str]] = {}  # "type:id" -> [attachment_ids]
    
    def upload(
        self,
        file_name: str,
        file_data: bytes,
        file_type: str,
        entity_type: EntityType,
        entity_id: str,
        category: AttachmentCategory,
        uploaded_by: Optional[str] = None,
        description: Optional[str] = None,
    ) -> tuple[Optional[Attachment], AttachmentValidation]:
        """
        Upload a file with validation.
        
        Returns (attachment, validation_result).
        If validation fails, attachment is None.
        """
        # Validate
        validation = validate_file(file_name, len(file_data), file_type, category)
        if not validation.is_valid:
            return None, validation
        
        # Compute checksum
        checksum = compute_checksum(file_data)
        
        # Generate storage path
        storage_path = generate_storage_path(
            entity_type, entity_id, file_name, category
        )
        
        # Store file
        stored_file = StoredFile(
            path=storage_path,
            data=file_data,
            content_type=file_type,
            checksum=checksum,
        )
        self._files[storage_path] = stored_file
        
        # Create attachment record
        attachment = Attachment(
            id=str(uuid.uuid4()),
            entity_type=entity_type,
            entity_id=entity_id,
            file_name=file_name,
            file_type=file_type,
            file_size=len(file_data),
            file_path=storage_path,
            category=category,
            description=description,
            uploaded_by=uploaded_by,
            checksum=checksum,
        )
        self._attachments[attachment.id] = attachment
        
        # Track entity attachments
        entity_key = f"{entity_type.value}:{entity_id}"
        if entity_key not in self._entity_attachments:
            self._entity_attachments[entity_key] = []
        self._entity_attachments[entity_key].append(attachment.id)
        
        return attachment, validation
    
    def download(
        self,
        attachment_id: str,
        user_role: str,
        user_lab_id: Optional[str] = None,
        resource_lab_id: Optional[str] = None,
    ) -> Optional[tuple[bytes, str, str]]:
        """
        Download a file with access control.
        
        Returns (data, file_name, checksum) or None if not found/unauthorized.
        """
        attachment = self._attachments.get(attachment_id)
        if not attachment:
            return None
        
        # Access control check
        if not self._check_access(attachment, user_role, user_lab_id, resource_lab_id):
            return None
        
        stored_file = self._files.get(attachment.file_path)
        if not stored_file:
            return None
        
        # Verify integrity
        if not verify_checksum(stored_file.data, attachment.checksum):
            raise ValueError("File integrity check failed - checksum mismatch")
        
        return stored_file.data, attachment.file_name, attachment.checksum
    
    def get_attachment(self, attachment_id: str) -> Optional[Attachment]:
        """Get attachment metadata by ID."""
        return self._attachments.get(attachment_id)
    
    def get_entity_attachments(
        self,
        entity_type: EntityType,
        entity_id: str,
        category: Optional[AttachmentCategory] = None,
    ) -> list[Attachment]:
        """Get all attachments for an entity."""
        entity_key = f"{entity_type.value}:{entity_id}"
        attachment_ids = self._entity_attachments.get(entity_key, [])
        
        attachments = []
        for aid in attachment_ids:
            att = self._attachments.get(aid)
            if att and (category is None or att.category == category):
                attachments.append(att)
        
        return sorted(attachments, key=lambda a: a.uploaded_at, reverse=True)
    
    def delete(
        self,
        attachment_id: str,
        user_role: str,
    ) -> bool:
        """
        Delete an attachment.
        
        Only admins can delete attachments.
        """
        if user_role != "admin":
            raise PermissionError("Only administrators can delete attachments")
        
        attachment = self._attachments.get(attachment_id)
        if not attachment:
            return False
        
        # Remove file
        self._files.pop(attachment.file_path, None)
        
        # Remove from entity tracking
        entity_key = f"{attachment.entity_type.value}:{attachment.entity_id}"
        if entity_key in self._entity_attachments:
            self._entity_attachments[entity_key] = [
                aid for aid in self._entity_attachments[entity_key]
                if aid != attachment_id
            ]
        
        # Remove attachment record
        del self._attachments[attachment_id]
        
        return True
    
    def create_signature_placeholder(
        self,
        entity_type: EntityType,
        entity_id: str,
        signer_id: str,
        signer_name: str,
        signer_role: str,
        attachment_id: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> SignaturePlaceholder:
        """
        Create a digital signature placeholder.
        
        IMPORTANT: This is a PLACEHOLDER only. Not a legally valid signature.
        """
        signature = SignaturePlaceholder(
            id=str(uuid.uuid4()),
            attachment_id=attachment_id,
            entity_type=entity_type,
            entity_id=entity_id,
            signer_id=signer_id,
            signer_name=signer_name,
            signer_role=signer_role,
            status=SignatureStatus.PENDING,
            notes=notes,
        )
        self._signatures[signature.id] = signature
        return signature
    
    def sign_placeholder(
        self,
        signature_id: str,
        signer_id: str,
        notes: Optional[str] = None,
    ) -> Optional[SignaturePlaceholder]:
        """
        Complete a signature placeholder.
        
        IMPORTANT: This is a PLACEHOLDER only. Not a legally valid signature.
        """
        signature = self._signatures.get(signature_id)
        if not signature:
            return None
        
        if signature.signer_id != signer_id:
            raise PermissionError("Only the designated signer can sign")
        
        if signature.status != SignatureStatus.PENDING:
            raise ValueError(f"Cannot sign - current status is {signature.status.value}")
        
        signature.status = SignatureStatus.SIGNED
        signature.signed_at = datetime.utcnow()
        if notes:
            signature.notes = notes
        
        return signature
    
    def get_signatures(
        self,
        entity_type: EntityType,
        entity_id: str,
    ) -> list[SignaturePlaceholder]:
        """Get all signature placeholders for an entity."""
        signatures = [
            s for s in self._signatures.values()
            if s.entity_type == entity_type and s.entity_id == entity_id
        ]
        return sorted(signatures, key=lambda s: s.signed_at, reverse=True)
    
    def _check_access(
        self,
        attachment: Attachment,
        user_role: str,
        user_lab_id: Optional[str],
        resource_lab_id: Optional[str],
    ) -> bool:
        """Check if user can access attachment."""
        # Admin can access everything
        if user_role == "admin":
            return True
        
        # For MVP, all authenticated users can read attachments
        # In production, implement full RLS-based access control
        return True
    
    def get_all_attachments(
        self,
        user_role: str = "admin",
    ) -> list[Attachment]:
        """Get all attachments (admin only for search)."""
        if user_role != "admin":
            raise PermissionError("Only administrators can list all attachments")
        
        return sorted(
            self._attachments.values(),
            key=lambda a: a.uploaded_at,
            reverse=True,
        )
    
    def count_entity_attachments(
        self,
        entity_type: EntityType,
        entity_id: str,
        category: Optional[AttachmentCategory] = None,
    ) -> int:
        """Count attachments for an entity."""
        return len(self.get_entity_attachments(entity_type, entity_id, category))


# ============================================================================
# SINGLETON INSTANCE
# ============================================================================

_store: Optional[AttachmentStore] = None


def get_attachment_store() -> AttachmentStore:
    """Get or create the global attachment store."""
    global _store
    if _store is None:
        _store = AttachmentStore()
    return _store


def reset_attachment_store():
    """Reset the global attachment store (for testing)."""
    global _store
    _store = None

"""
NAWI TestFlow — Attachments API Routes

Handles:
- File upload with validation
- File download with access control
- File listing by entity
- File deletion (admin only)
- Digital signature placeholders
- Access audit logging

IMPORTANT: Digital signatures in this module are PLACEHOLDER ONLY.
They do NOT constitute legally valid digital signatures.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import Response

from app.core.security import (
    require_permission,
    get_current_user_profile,
)
from app.core.exceptions import (
    NotFoundError,
    ValidationError,
    ForbiddenError,
)
from engine.attachments import (
    AttachmentStore,
    get_attachment_store,
    AttachmentCategory,
    EntityType,
    SignatureStatus,
)

router = APIRouter(prefix="/attachments", tags=["attachments"])


# ============================================================================
# UPLOAD
# ============================================================================

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Upload attachment",
    description="Upload a file attachment for an entity.",
)
async def upload_attachment(
    file: UploadFile = File(..., description="File to upload"),
    entity_type: EntityType = Form(..., description="Entity type"),
    entity_id: str = Form(..., description="Entity ID"),
    category: AttachmentCategory = Form(
        default=AttachmentCategory.OTHER,
        description="File category",
    ),
    description: Optional[str] = Form(default=None, description="File description"),
    current_user: dict = Depends(require_permission("attachments:create")),
    store: AttachmentStore = Depends(get_attachment_store),
):
    """Upload a file attachment."""
    # Read file data
    file_data = await file.read()
    
    # Upload with validation
    attachment, validation = store.upload(
        file_name=file.filename or "unnamed",
        file_data=file_data,
        file_type=file.content_type or "application/octet-stream",
        entity_type=entity_type,
        entity_id=entity_id,
        category=category,
        uploaded_by=current_user["id"],
        description=description,
    )
    
    if not validation.is_valid:
        raise ValidationError(
            detail="File validation failed",
            errors=validation.errors,
        )
    
    return {
        "attachment": attachment.to_dict(),
        "warnings": validation.warnings,
    }


# ============================================================================
# DOWNLOAD
# ============================================================================

@router.get(
    "/{attachment_id}/download",
    summary="Download attachment",
    description="Download an attachment file.",
)
async def download_attachment(
    attachment_id: str,
    current_user: dict = Depends(require_permission("attachments:read_own")),
    store: AttachmentStore = Depends(get_attachment_store),
):
    """Download an attachment file."""
    attachment = store.get_attachment(attachment_id)
    if not attachment:
        raise NotFoundError("Attachment not found")
    
    result = store.download(
        attachment_id=attachment_id,
        user_role=current_user.get("role", "viewer"),
        user_lab_id=current_user.get("laboratory_id"),
    )
    
    if not result:
        raise ForbiddenError("Access denied to this attachment")
    
    data, file_name, checksum = result
    
    # Return file with appropriate headers
    headers = {
        "Content-Disposition": f'attachment; filename="{file_name}"',
        "X-Checksum": checksum,
    }
    
    return Response(
        content=data,
        media_type=attachment.file_type,
        headers=headers,
    )


# ============================================================================
# GET ATTACHMENT INFO
# ============================================================================

@router.get(
    "/{attachment_id}",
    summary="Get attachment info",
    description="Get attachment metadata without downloading the file.",
)
async def get_attachment_info(
    attachment_id: str,
    current_user: dict = Depends(require_permission("attachments:read_own")),
    store: AttachmentStore = Depends(get_attachment_store),
):
    """Get attachment metadata."""
    attachment = store.get_attachment(attachment_id)
    if not attachment:
        raise NotFoundError("Attachment not found")
    
    return {"attachment": attachment.to_dict()}


# ============================================================================
# LIST ENTITY ATTACHMENTS
# ============================================================================

@router.get(
    "/entity/{entity_type}/{entity_id}",
    summary="List attachments for entity",
    description="Get all attachments for a specific entity.",
)
async def list_entity_attachments(
    entity_type: EntityType,
    entity_id: str,
    category: Optional[AttachmentCategory] = None,
    current_user: dict = Depends(require_permission("attachments:read_own")),
    store: AttachmentStore = Depends(get_attachment_store),
):
    """List attachments for an entity."""
    attachments = store.get_entity_attachments(
        entity_type=entity_type,
        entity_id=entity_id,
        category=category,
    )
    
    return {
        "attachments": [a.to_dict() for a in attachments],
        "count": len(attachments),
    }


# ============================================================================
# DELETE
# ============================================================================

@router.delete(
    "/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete attachment",
    description="Delete an attachment (admin only).",
)
async def delete_attachment(
    attachment_id: str,
    current_user: dict = Depends(require_permission("attachments:delete")),
    store: AttachmentStore = Depends(get_attachment_store),
):
    """Delete an attachment (admin only)."""
    success = store.delete(
        attachment_id=attachment_id,
        user_role=current_user.get("role", "viewer"),
    )
    
    if not success:
        raise NotFoundError("Attachment not found")
    
    return None


# ============================================================================
# DIGITAL SIGNATURE PLACEHOLDERS
# ============================================================================

@router.post(
    "/signatures",
    status_code=status.HTTP_201_CREATED,
    summary="Create signature placeholder",
    description=(
        "Create a digital signature placeholder for an entity. "
        "IMPORTANT: This is a PLACEHOLDER only, not a legally valid signature."
    ),
)
async def create_signature_placeholder(
    entity_type: EntityType = Form(..., description="Entity type"),
    entity_id: str = Form(..., description="Entity ID"),
    attachment_id: Optional[str] = Form(default=None, description="Attachment to sign"),
    notes: Optional[str] = Form(default=None, description="Signature notes"),
    current_user: dict = Depends(require_permission("reports:approve")),
    store: AttachmentStore = Depends(get_attachment_store),
):
    """Create a signature placeholder."""
    signature = store.create_signature_placeholder(
        entity_type=entity_type,
        entity_id=entity_id,
        signer_id=current_user["id"],
        signer_name=current_user.get("full_name", current_user.get("email", "Unknown")),
        signer_role=current_user.get("role", "unknown"),
        attachment_id=attachment_id,
        notes=notes,
    )
    
    return {
        "signature": signature.to_dict(),
        "disclaimer": signature.disclaimer,
    }


@router.post(
    "/signatures/{signature_id}/sign",
    summary="Complete signature",
    description=(
        "Complete a signature placeholder. "
        "IMPORTANT: This is a PLACEHOLDER only, not a legally valid signature."
    ),
)
async def complete_signature(
    signature_id: str,
    notes: Optional[str] = Form(default=None, description="Signing notes"),
    current_user: dict = Depends(require_permission("reports:approve")),
    store: AttachmentStore = Depends(get_attachment_store),
):
    """Complete a signature placeholder."""
    try:
        signature = store.sign_placeholder(
            signature_id=signature_id,
            signer_id=current_user["id"],
            notes=notes,
        )
    except PermissionError as e:
        raise ForbiddenError(str(e))
    except ValueError as e:
        raise ValidationError(detail=str(e))
    
    if not signature:
        raise NotFoundError("Signature placeholder not found")
    
    return {
        "signature": signature.to_dict(),
        "disclaimer": signature.disclaimer,
    }


@router.get(
    "/signatures/entity/{entity_type}/{entity_id}",
    summary="List signatures for entity",
    description="Get all signature placeholders for an entity.",
)
async def list_entity_signatures(
    entity_type: EntityType,
    entity_id: str,
    current_user: dict = Depends(require_permission("attachments:read_own")),
    store: AttachmentStore = Depends(get_attachment_store),
):
    """List signatures for an entity."""
    signatures = store.get_signatures(
        entity_type=entity_type,
        entity_id=entity_id,
    )
    
    return {
        "signatures": [s.to_dict() for s in signatures],
        "count": len(signatures),
        "disclaimer": "All signatures are PLACEHOLDER ONLY — not legally valid.",
    }

"""
NAWI TestFlow — Audit Service

Logs all system actions for traceability and compliance.
Every mutation creates an audit log entry.

This module depends on database layer for persistence.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID


class AuditService:
    """
    Audit trail service.
    
    Records all significant actions in the system:
    - CRUD operations on all entities
    - Status changes
    - Approvals/rejections
    - Report generation
    - Login/logout
    """
    
    def __init__(self, db_session):
        self.db = db_session
    
    async def log_action(
        self,
        user_id: UUID,
        user_name: str,
        user_role: str,
        action: str,
        entity_type: str,
        entity_id: UUID,
        entity_label: Optional[str] = None,
        changes: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        notes: Optional[str] = None
    ) -> None:
        """
        Log an audit entry.
        
        Args:
            user_id: ID of user performing action
            user_name: Name of user
            user_role: Role of user
            action: Action performed (create, update, delete, etc.)
            entity_type: Type of entity affected
            entity_id: ID of entity affected
            entity_label: Human-readable label for entity
            changes: Dict of field changes {field: {old: x, new: y}}
            ip_address: IP address of user
            user_agent: User agent string
            notes: Additional notes
        """
        query = """
            INSERT INTO audit_logs (
                user_id, user_name, user_role, action,
                entity_type, entity_id, entity_label,
                changes, ip_address, user_agent, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        """
        
        await self.db.execute(
            query,
            user_id, user_name, user_role, action,
            entity_type, entity_id, entity_label,
            changes, ip_address, user_agent, notes
        )
    
    async def log_create(
        self,
        user_id: UUID,
        user_name: str,
        user_role: str,
        entity_type: str,
        entity_id: UUID,
        entity_label: str,
        ip_address: Optional[str] = None
    ) -> None:
        """Log entity creation."""
        await self.log_action(
            user_id=user_id,
            user_name=user_name,
            user_role=user_role,
            action="create",
            entity_type=entity_type,
            entity_id=entity_id,
            entity_label=entity_label,
            ip_address=ip_address
        )
    
    async def log_update(
        self,
        user_id: UUID,
        user_name: str,
        user_role: str,
        entity_type: str,
        entity_id: UUID,
        entity_label: str,
        changes: dict,
        ip_address: Optional[str] = None
    ) -> None:
        """Log entity update with field changes."""
        await self.log_action(
            user_id=user_id,
            user_name=user_name,
            user_role=user_role,
            action="update",
            entity_type=entity_type,
            entity_id=entity_id,
            entity_label=entity_label,
            changes=changes,
            ip_address=ip_address
        )
    
    async def log_delete(
        self,
        user_id: UUID,
        user_name: str,
        user_role: str,
        entity_type: str,
        entity_id: UUID,
        entity_label: str,
        ip_address: Optional[str] = None
    ) -> None:
        """Log entity deletion."""
        await self.log_action(
            user_id=user_id,
            user_name=user_name,
            user_role=user_role,
            action="delete",
            entity_type=entity_type,
            entity_id=entity_id,
            entity_label=entity_label,
            ip_address=ip_address
        )
    
    async def log_status_change(
        self,
        user_id: UUID,
        user_name: str,
        user_role: str,
        entity_type: str,
        entity_id: UUID,
        entity_label: str,
        old_status: str,
        new_status: str,
        ip_address: Optional[str] = None
    ) -> None:
        """Log status change."""
        await self.log_action(
            user_id=user_id,
            user_name=user_name,
            user_role=user_role,
            action="status-change",
            entity_type=entity_type,
            entity_id=entity_id,
            entity_label=entity_label,
            changes={"status": {"old": old_status, "new": new_status}},
            ip_address=ip_address
        )
    
    async def log_submit(
        self,
        user_id: UUID,
        user_name: str,
        user_role: str,
        entity_id: UUID,
        entity_label: str,
        ip_address: Optional[str] = None
    ) -> None:
        """Log test report submission."""
        await self.log_action(
            user_id=user_id,
            user_name=user_name,
            user_role=user_role,
            action="submit",
            entity_type="test-report",
            entity_id=entity_id,
            entity_label=entity_label,
            ip_address=ip_address
        )
    
    async def log_approve(
        self,
        user_id: UUID,
        user_name: str,
        user_role: str,
        entity_id: UUID,
        entity_label: str,
        notes: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> None:
        """Log test report approval."""
        await self.log_action(
            user_id=user_id,
            user_name=user_name,
            user_role=user_role,
            action="approve",
            entity_type="test-report",
            entity_id=entity_id,
            entity_label=entity_label,
            notes=notes,
            ip_address=ip_address
        )
    
    async def log_reject(
        self,
        user_id: UUID,
        user_name: str,
        user_role: str,
        entity_id: UUID,
        entity_label: str,
        reason: str,
        ip_address: Optional[str] = None
    ) -> None:
        """Log test report rejection."""
        await self.log_action(
            user_id=user_id,
            user_name=user_name,
            user_role=user_role,
            action="reject",
            entity_type="test-report",
            entity_id=entity_id,
            entity_label=entity_label,
            notes=reason,
            ip_address=ip_address
        )
    
    async def log_report_generate(
        self,
        user_id: UUID,
        user_name: str,
        user_role: str,
        report_id: UUID,
        report_number: str,
        format: str,
        ip_address: Optional[str] = None
    ) -> None:
        """Log report generation."""
        await self.log_action(
            user_id=user_id,
            user_name=user_name,
            user_role=user_role,
            action="report-generate",
            entity_type="report-version",
            entity_id=report_id,
            entity_label=report_number,
            notes=f"Generated {format.upper()} report",
            ip_address=ip_address
        )
    
    async def log_report_download(
        self,
        user_id: UUID,
        user_name: str,
        user_role: str,
        report_id: UUID,
        report_number: str,
        format: str,
        ip_address: Optional[str] = None
    ) -> None:
        """Log report download."""
        await self.log_action(
            user_id=user_id,
            user_name=user_name,
            user_role=user_role,
            action="report-download",
            entity_type="report-version",
            entity_id=report_id,
            entity_label=report_number,
            notes=f"Downloaded {format.upper()} report",
            ip_address=ip_address
        )
    
    async def get_audit_log(
        self,
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
        action: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> list[dict]:
        """
        Query audit log with filters.
        
        Args:
            entity_type: Filter by entity type
            entity_id: Filter by entity ID
            user_id: Filter by user
            action: Filter by action type
            limit: Maximum results
            offset: Pagination offset
            
        Returns:
            List of audit log entries
        """
        conditions = []
        params = []
        param_idx = 1
        
        if entity_type:
            conditions.append(f"entity_type = ${param_idx}")
            params.append(entity_type)
            param_idx += 1
        
        if entity_id:
            conditions.append(f"entity_id = ${param_idx}")
            params.append(entity_id)
            param_idx += 1
        
        if user_id:
            conditions.append(f"user_id = ${param_idx}")
            params.append(user_id)
            param_idx += 1
        
        if action:
            conditions.append(f"action = ${param_idx}")
            params.append(action)
            param_idx += 1
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        query = f"""
            SELECT * FROM audit_logs
            WHERE {where_clause}
            ORDER BY timestamp DESC
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
        """
        params.extend([limit, offset])
        
        result = await self.db.fetch(query, *params)
        return [dict(row) for row in result]

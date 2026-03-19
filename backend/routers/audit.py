"""
Audit Logging Module
Tracks all administrative actions for security and compliance
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from routers.shared import db


class AuditAction:
    """Audit action types"""
    # User Management
    USER_CREATE = "user.create"
    USER_UPDATE = "user.update"
    USER_DELETE = "user.delete"
    USER_ROLE_CHANGE = "user.role_change"
    USER_STATUS_CHANGE = "user.status_change"
    USER_IMPERSONATE = "user.impersonate"
    
    # Authentication
    AUTH_LOGIN = "auth.login"
    AUTH_LOGOUT = "auth.logout"
    AUTH_LOGIN_FAILED = "auth.login_failed"
    AUTH_PASSWORD_RESET_REQUEST = "auth.password_reset_request"
    AUTH_PASSWORD_RESET = "auth.password_reset"
    AUTH_PASSWORD_CHANGE = "auth.password_change"
    
    # 2FA
    TWO_FA_SETUP = "2fa.setup"
    TWO_FA_ENABLE = "2fa.enable"
    TWO_FA_DISABLE = "2fa.disable"
    TWO_FA_VERIFY = "2fa.verify"
    TWO_FA_FAILED = "2fa.failed"
    
    # Role/Permission Management
    ROLE_CONFIG_UPDATE = "role.config_update"
    PERMISSION_UPDATE = "permission.update"
    SIDEBAR_ACCESS_UPDATE = "sidebar.access_update"
    
    # Campaign Management
    CAMPAIGN_CREATE = "campaign.create"
    CAMPAIGN_UPDATE = "campaign.update"
    CAMPAIGN_DELETE = "campaign.delete"
    CAMPAIGN_STATUS_CHANGE = "campaign.status_change"
    
    # Creative Management
    CREATIVE_CREATE = "creative.create"
    CREATIVE_UPDATE = "creative.update"
    CREATIVE_DELETE = "creative.delete"


async def log_audit(
    action: str,
    user_id: str,
    user_email: str,
    user_role: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    target_name: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    success: bool = True,
    error_message: Optional[str] = None
):
    """
    Log an audit event to the database.
    
    Args:
        action: The type of action (from AuditAction class)
        user_id: ID of the user performing the action
        user_email: Email of the user performing the action
        user_role: Role of the user performing the action
        target_type: Type of resource being acted upon (user, campaign, creative, etc.)
        target_id: ID of the target resource
        target_name: Name/email of the target for easier reading
        details: Additional details about the action
        ip_address: Client IP address
        user_agent: Client user agent string
        success: Whether the action succeeded
        error_message: Error message if action failed
    """
    audit_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "actor": {
            "user_id": user_id,
            "email": user_email,
            "role": user_role
        },
        "target": {
            "type": target_type,
            "id": target_id,
            "name": target_name
        } if target_type else None,
        "details": details,
        "context": {
            "ip_address": ip_address,
            "user_agent": user_agent
        },
        "success": success,
        "error_message": error_message
    }
    
    await db.audit_logs.insert_one(audit_entry)
    return audit_entry


async def get_audit_logs(
    limit: int = 100,
    offset: int = 0,
    action_filter: Optional[str] = None,
    user_id_filter: Optional[str] = None,
    target_id_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Retrieve audit logs with optional filtering.
    """
    query = {}
    
    if action_filter:
        query["action"] = {"$regex": action_filter, "$options": "i"}
    
    if user_id_filter:
        query["actor.user_id"] = user_id_filter
    
    if target_id_filter:
        query["target.id"] = target_id_filter
    
    if start_date or end_date:
        query["timestamp"] = {}
        if start_date:
            query["timestamp"]["$gte"] = start_date
        if end_date:
            query["timestamp"]["$lte"] = end_date
    
    logs = await db.audit_logs.find(
        query, 
        {"_id": 0}
    ).sort("timestamp", -1).skip(offset).limit(limit).to_list(limit)
    
    total = await db.audit_logs.count_documents(query)
    
    return {
        "logs": logs,
        "total": total,
        "limit": limit,
        "offset": offset
    }

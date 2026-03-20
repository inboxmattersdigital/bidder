"""
Authentication and Role-Based Access Control (RBAC) endpoints
Roles: Advertiser, Admin, Super Admin (3-tier hierarchy)
Hierarchy: Super Admin → Admin → Advertiser
Features: Password Reset, 2FA (TOTP), Audit Logging, Data Ownership
"""
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from enum import Enum
import hashlib
import secrets
import uuid
import pyotp
import base64
import io

from routers.shared import db, logger
from routers.audit import log_audit, AuditAction, get_audit_logs

router = APIRouter(tags=["Authentication"])


# ============== ENUMS ==============
class UserRole(str, Enum):
    ADVERTISER = "advertiser"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


# ============== MODELS ==============
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: UserRole = UserRole.ADVERTISER


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    permissions: List[str]
    sidebar_access: List[str]
    created_at: str
    is_active: bool
    created_by: Optional[str] = None
    parent_id: Optional[str] = None
    two_fa_enabled: bool = False


class TokenResponse(BaseModel):
    token: str
    user: UserResponse
    requires_2fa: bool = False


class SidebarConfig(BaseModel):
    role: UserRole
    allowed_items: List[str]


class PermissionConfig(BaseModel):
    role: UserRole
    permissions: List[str]


class BulkAccessUpdate(BaseModel):
    """Model for bulk updating sidebar or permissions"""
    role: str
    sidebar_access: Optional[List[str]] = None
    permissions: Optional[List[str]] = None


# Password Reset Models
class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=6)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


# 2FA Models
class TwoFASetupResponse(BaseModel):
    secret: str
    qr_code_url: str
    backup_codes: List[str]


class TwoFAVerify(BaseModel):
    code: str


class TwoFALoginVerify(BaseModel):
    temp_token: str
    code: str


# ============== EMAIL PREFERENCES ==============
class EmailPreferences(BaseModel):
    # Notification toggles
    new_user_notifications: bool = True  # Admin: when new user created under them
    security_alerts: bool = True  # Suspicious login alerts
    budget_alerts: bool = True  # Campaign budget warnings
    password_reset_notifications: bool = True  # Password reset confirmations
    system_announcements: bool = True  # Platform announcements
    weekly_digest: bool = False  # Weekly summary instead of individual emails
    
    # Budget alert settings
    budget_warning_threshold: int = 75  # Percentage at which to send warning
    budget_critical_threshold: int = 90  # Percentage at which to send critical alert
    
    # Delivery preferences
    digest_day: str = "monday"  # Day to send weekly digest
    quiet_hours_enabled: bool = False  # Pause non-critical notifications during quiet hours
    quiet_hours_start: int = 22  # 10 PM
    quiet_hours_end: int = 8  # 8 AM


class EmailPreferencesUpdate(BaseModel):
    new_user_notifications: Optional[bool] = None
    security_alerts: Optional[bool] = None
    budget_alerts: Optional[bool] = None
    password_reset_notifications: Optional[bool] = None
    system_announcements: Optional[bool] = None
    weekly_digest: Optional[bool] = None
    budget_warning_threshold: Optional[int] = None
    budget_critical_threshold: Optional[int] = None
    digest_day: Optional[str] = None
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[int] = None
    quiet_hours_end: Optional[int] = None


DEFAULT_EMAIL_PREFERENCES = EmailPreferences().model_dump()


# ============== DEFAULT PERMISSIONS ==============
DEFAULT_PERMISSIONS = {
    UserRole.ADVERTISER: [
        "view_dashboard",
        "view_reports",
        "manage_campaigns",
        "manage_creatives",
        "view_analytics",
        "view_budget",
    ],
    UserRole.ADMIN: [
        "view_dashboard",
        "view_reports",
        "manage_campaigns",
        "manage_creatives",
        "view_analytics",
        "view_budget",
        "manage_users",
        "view_bid_logs",
        "manage_ssp",
        "view_fraud",
        "manage_audiences",
    ],
    UserRole.SUPER_ADMIN: [
        "view_dashboard",
        "view_reports",
        "manage_campaigns",
        "manage_creatives",
        "view_analytics",
        "view_budget",
        "manage_users",
        "view_bid_logs",
        "manage_ssp",
        "view_fraud",
        "manage_audiences",
        "manage_roles",
        "manage_permissions",
        "manage_sidebar",
        "system_settings",
    ],
}

# ============== DEFAULT SIDEBAR ACCESS ==============
DEFAULT_SIDEBAR_ACCESS = {
    UserRole.ADVERTISER: [
        "dashboard",
        "campaigns",
        "creatives",
        "reports",
        "ad_performance",
        "budget_pacing",
        "insights",
    ],
    UserRole.ADMIN: [
        "dashboard",
        "campaigns",
        "compare",
        "media_planner",
        "creatives",
        "ssp_endpoints",
        "ssp_analytics",
        "bid_logs",
        "bid_stream",
        "reports",
        "ad_performance",
        "budget_pacing",
        "insights",
        "ml_models",
        "bid_optimizer",
        "ab_testing",
        "fraud",
        "audiences",
        "attribution",
        "admin_panel",
    ],
    UserRole.SUPER_ADMIN: [
        "dashboard",
        "campaigns",
        "compare",
        "media_planner",
        "creatives",
        "ssp_endpoints",
        "ssp_analytics",
        "bid_logs",
        "bid_stream",
        "reports",
        "ad_performance",
        "budget_pacing",
        "insights",
        "ml_models",
        "bid_optimizer",
        "ab_testing",
        "fraud",
        "audiences",
        "attribution",
        "migration",
        "admin_panel",
    ],
}


# ============== HELPER FUNCTIONS ==============
def hash_password(password: str) -> str:
    """Hash password using SHA-256 with salt"""
    salt = "openrtb_bidder_salt_2024"
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()


def generate_token() -> str:
    """Generate a secure random token"""
    return secrets.token_urlsafe(32)


async def get_current_user(authorization: Optional[str] = Header(None)):
    """Get current user from token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Extract token from "Bearer <token>"
    if authorization.startswith("Bearer "):
        token = authorization[7:]
    else:
        token = authorization
    
    # Find session with token
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    # Check if session is expired (24 hours)
    created_at = datetime.fromisoformat(session["created_at"])
    if datetime.now(timezone.utc) - created_at > timedelta(hours=24):
        await db.sessions.delete_one({"token": token})
        raise HTTPException(status_code=401, detail="Token expired")
    
    # Get user
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User account is deactivated")
    
    return user


def require_role(allowed_roles: List[UserRole]):
    """Dependency to check if user has required role"""
    async def role_checker(user: dict = Depends(get_current_user)):
        if user["role"] not in [r.value for r in allowed_roles]:
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}"
            )
        return user
    return role_checker


async def get_current_user_ws(token: str) -> dict:
    """Get current user from token for WebSocket connections (no header)"""
    if not token:
        return None
    
    # Find session with token
    session = await db.sessions.find_one({"token": token})
    if not session:
        return None
    
    # Check if session is expired (24 hours)
    created_at = datetime.fromisoformat(session["created_at"])
    if datetime.now(timezone.utc) - created_at > timedelta(hours=24):
        await db.sessions.delete_one({"token": token})
        return None
    
    # Get user
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        return None
    
    if not user.get("is_active", True):
        return None
    
    return user


def require_permission(permission: str):
    """Dependency to check if user has required permission"""
    async def permission_checker(user: dict = Depends(get_current_user)):
        if permission not in user.get("permissions", []):
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required permission: {permission}"
            )
        return user
    return permission_checker


# ============== AUTH ENDPOINTS ==============
@router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    """Register a new user"""
    # Check if email already exists
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Only super_admin can create admin/super_admin accounts
    if user_data.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=403, 
            detail="Cannot self-register as Admin or Super Admin"
        )
    
    # Get role config from database or use defaults
    role_config = await db.role_configs.find_one({"role": user_data.role.value})
    
    permissions = role_config.get("permissions") if role_config else DEFAULT_PERMISSIONS[user_data.role]
    sidebar_access = role_config.get("sidebar_access") if role_config else DEFAULT_SIDEBAR_ACCESS[user_data.role]
    
    # Create user
    user = {
        "id": str(uuid.uuid4()),
        "email": user_data.email.lower(),
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role.value,
        "permissions": permissions,
        "sidebar_access": sidebar_access,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.users.insert_one(user)
    
    # Create session
    token = generate_token()
    session = {
        "token": token,
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.sessions.insert_one(session)
    
    # Return response without password_hash
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        permissions=user["permissions"],
        sidebar_access=user["sidebar_access"],
        created_at=user["created_at"],
        is_active=user["is_active"],
    )
    
    return TokenResponse(token=token, user=user_response)


@router.post("/auth/login")
async def login(credentials: UserLogin, request: Request):
    """Login with email and password. Returns requires_2fa if 2FA is enabled."""
    # Find user
    user = await db.users.find_one({"email": credentials.email.lower()}, {"_id": 0})
    if not user:
        # Log failed login attempt
        await log_audit(
            action=AuditAction.AUTH_LOGIN_FAILED,
            user_id="unknown",
            user_email=credentials.email.lower(),
            user_role="unknown",
            details={"reason": "User not found"},
            ip_address=request.client.host if request.client else None,
            success=False,
            error_message="Invalid email or password"
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if user["password_hash"] != hash_password(credentials.password):
        await log_audit(
            action=AuditAction.AUTH_LOGIN_FAILED,
            user_id=user["id"],
            user_email=user["email"],
            user_role=user["role"],
            details={"reason": "Invalid password"},
            ip_address=request.client.host if request.client else None,
            success=False,
            error_message="Invalid email or password"
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User account is deactivated")
    
    # Check if 2FA is enabled
    if user.get("two_fa_enabled") and user.get("two_fa_secret"):
        # Create temporary token for 2FA verification
        temp_token = generate_token()
        await db.temp_sessions.insert_one({
            "temp_token": temp_token,
            "user_id": user["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
            "type": "2fa_pending"
        })
        
        return {
            "requires_2fa": True,
            "temp_token": temp_token,
            "message": "Please enter your 2FA code"
        }
    
    # Create session (no 2FA required)
    token = generate_token()
    session = {
        "token": token,
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.sessions.insert_one(session)
    
    # Log successful login
    await log_audit(
        action=AuditAction.AUTH_LOGIN,
        user_id=user["id"],
        user_email=user["email"],
        user_role=user["role"],
        ip_address=request.client.host if request.client else None,
        success=True
    )
    
    # Check for suspicious login (new IP address)
    ip_address = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    # Get user's recent login IPs
    recent_logins = await db.audit_logs.find({
        "actor.user_id": user["id"],
        "action": AuditAction.AUTH_LOGIN,
        "success": True
    }).sort("timestamp", -1).limit(10).to_list(10)
    
    known_ips = set(log.get("ip_address") for log in recent_logins if log.get("ip_address"))
    
    # If this is a new IP and user has logged in before, send alert
    if len(recent_logins) > 1 and ip_address not in known_ips:
        try:
            from routers.email_service import send_suspicious_login_alert
            await send_suspicious_login_alert(
                user_email=user["email"],
                user_name=user.get("name", "User"),
                ip_address=ip_address,
                user_agent=user_agent,
                user_id=user["id"]  # Pass user_id for preference check
            )
        except Exception as e:
            logger.warning(f"Failed to send suspicious login alert: {e}")
    
    # Return response
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        permissions=user.get("permissions", DEFAULT_PERMISSIONS.get(UserRole(user["role"]), [])),
        sidebar_access=user.get("sidebar_access", DEFAULT_SIDEBAR_ACCESS.get(UserRole(user["role"]), [])),
        created_at=user["created_at"],
        is_active=user.get("is_active", True),
        two_fa_enabled=user.get("two_fa_enabled", False),
    )
    
    return TokenResponse(token=token, user=user_response, requires_2fa=False)


@router.post("/auth/verify-2fa")
async def verify_2fa_login(data: TwoFALoginVerify, request: Request):
    """Verify 2FA code during login"""
    # Find temp session
    temp_session = await db.temp_sessions.find_one({
        "temp_token": data.temp_token,
        "type": "2fa_pending"
    })
    
    if not temp_session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    # Check expiration
    expires_at = datetime.fromisoformat(temp_session["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        await db.temp_sessions.delete_one({"temp_token": data.temp_token})
        raise HTTPException(status_code=401, detail="Session expired. Please login again.")
    
    # Get user
    user = await db.users.find_one({"id": temp_session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Verify TOTP code
    totp = pyotp.TOTP(user["two_fa_secret"])
    if not totp.verify(data.code, valid_window=1):
        # Check backup codes
        backup_codes = user.get("two_fa_backup_codes", [])
        code_hash = hash_password(data.code)
        if code_hash not in backup_codes:
            await log_audit(
                action=AuditAction.TWO_FA_FAILED,
                user_id=user["id"],
                user_email=user["email"],
                user_role=user["role"],
                details={"reason": "Invalid 2FA code"},
                ip_address=request.client.host if request.client else None,
                success=False
            )
            raise HTTPException(status_code=401, detail="Invalid 2FA code")
        
        # Remove used backup code
        backup_codes.remove(code_hash)
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"two_fa_backup_codes": backup_codes}}
        )
    
    # Delete temp session
    await db.temp_sessions.delete_one({"temp_token": data.temp_token})
    
    # Create actual session
    token = generate_token()
    session = {
        "token": token,
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.sessions.insert_one(session)
    
    # Log successful 2FA login
    await log_audit(
        action=AuditAction.AUTH_LOGIN,
        user_id=user["id"],
        user_email=user["email"],
        user_role=user["role"],
        details={"2fa_verified": True},
        ip_address=request.client.host if request.client else None,
        success=True
    )
    
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        permissions=user.get("permissions", []),
        sidebar_access=user.get("sidebar_access", []),
        created_at=user["created_at"],
        is_active=user.get("is_active", True),
        two_fa_enabled=True,
    )
    
    return TokenResponse(token=token, user=user_response, requires_2fa=False)


@router.post("/auth/logout")
async def logout(user: dict = Depends(get_current_user), authorization: str = Header()):
    """Logout and invalidate token"""
    token = authorization[7:] if authorization.startswith("Bearer ") else authorization
    await db.sessions.delete_one({"token": token})
    return {"status": "logged_out"}


@router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        permissions=user.get("permissions", []),
        sidebar_access=user.get("sidebar_access", []),
        created_at=user["created_at"],
        is_active=user.get("is_active", True),
        created_by=user.get("created_by"),
        parent_id=user.get("parent_id"),
    )


# ============== HIERARCHICAL USER MANAGEMENT ==============
# Hierarchy: Super Admin -> Admin -> Advertiser (3-tier)

def get_allowed_child_roles(parent_role: str) -> List[str]:
    """Get roles that a parent can create"""
    if parent_role == UserRole.SUPER_ADMIN.value:
        return [UserRole.ADMIN.value]  # Super Admin can ONLY create Admins
    elif parent_role == UserRole.ADMIN.value:
        return [UserRole.ADVERTISER.value]  # Admin can ONLY create Advertisers
    return []  # Advertisers cannot create accounts


@router.get("/admin/users")
async def get_all_users(user: dict = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN]))):
    """Get users based on hierarchy - Super Admin sees all, Admin sees their children"""
    if user["role"] == UserRole.SUPER_ADMIN.value:
        # Super Admin sees all users
        users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    else:
        # Admin sees only users they created
        users = await db.users.find(
            {"parent_id": user["id"]}, 
            {"_id": 0, "password_hash": 0}
        ).to_list(1000)
    return users


@router.get("/admin/users/hierarchy")
async def get_users_hierarchy(user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))):
    """Get users organized by hierarchy (Super Admin only)"""
    # Get all admins
    admins = await db.users.find(
        {"role": UserRole.ADMIN.value}, 
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    
    hierarchy = []
    for admin in admins:
        # Get advertisers created by this admin
        advertisers = await db.users.find(
            {"parent_id": admin["id"]},
            {"_id": 0, "password_hash": 0}
        ).to_list(100)
        
        admin_data = {
            **admin,
            "children": advertisers,
            "children_count": len(advertisers)
        }
        hierarchy.append(admin_data)
    
    # Get advertisers without parent (legacy or created by super admin)
    orphan_advertisers = await db.users.find(
        {"role": UserRole.ADVERTISER.value, "parent_id": {"$exists": False}},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    
    return {
        "admins": hierarchy,
        "orphan_advertisers": orphan_advertisers,
        "total_admins": len(admins),
        "total_advertisers": await db.users.count_documents({"role": UserRole.ADVERTISER.value})
    }


@router.post("/admin/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """Create a new user with hierarchy tracking"""
    current_role = current_user["role"]
    requested_role = user_data.role.value
    
    # Validate hierarchy: Super Admin -> Admin -> Advertiser -> User
    allowed_roles = get_allowed_child_roles(current_role)
    
    if requested_role not in allowed_roles:
        if current_role == UserRole.SUPER_ADMIN.value:
            raise HTTPException(
                status_code=403,
                detail="Super Admin can only create Admin accounts"
            )
        elif current_role == UserRole.ADMIN.value:
            raise HTTPException(
                status_code=403,
                detail="Admin can only create Advertiser accounts"
            )
        raise HTTPException(
            status_code=403,
            detail=f"You cannot create users with role: {requested_role}"
        )
    
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Get role config
    role_config = await db.role_configs.find_one({"role": user_data.role.value})
    permissions = (role_config.get("permissions") if role_config and role_config.get("permissions") else DEFAULT_PERMISSIONS[user_data.role])
    sidebar_access = (role_config.get("sidebar_access") if role_config and role_config.get("sidebar_access") else DEFAULT_SIDEBAR_ACCESS[user_data.role])
    
    user = {
        "id": str(uuid.uuid4()),
        "email": user_data.email.lower(),
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role.value,
        "permissions": permissions,
        "sidebar_access": sidebar_access,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"],
        "parent_id": current_user["id"],  # Track parent for hierarchy
    }
    
    await db.users.insert_one(user)
    
    # Send email notification to the admin who created the user
    try:
        from routers.email_service import send_new_user_notification
        await send_new_user_notification(
            admin_email=current_user["email"],
            admin_name=current_user["name"],
            new_user_name=user_data.name,
            new_user_email=user_data.email,
            new_user_role=user_data.role.value,
            admin_id=current_user["id"]  # Pass admin_id for preference check
        )
    except Exception as e:
        logger.warning(f"Failed to send new user email notification: {e}")
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        permissions=user["permissions"],
        sidebar_access=user["sidebar_access"],
        created_at=user["created_at"],
        is_active=user["is_active"],
        created_by=user["created_by"],
        parent_id=user["parent_id"],
    )


@router.put("/admin/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    new_role: UserRole,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Update user role (Super Admin only)"""
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get role config
    role_config = await db.role_configs.find_one({"role": new_role.value})
    permissions = role_config.get("permissions") if role_config else DEFAULT_PERMISSIONS[new_role]
    sidebar_access = role_config.get("sidebar_access") if role_config else DEFAULT_SIDEBAR_ACCESS[new_role]
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "role": new_role.value,
            "permissions": permissions,
            "sidebar_access": sidebar_access,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"status": "updated", "new_role": new_role.value}


@router.put("/admin/users/{user_id}/status")
async def toggle_user_status(
    user_id: str,
    is_active: bool,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """Activate/deactivate user (Admin/Super Admin)"""
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deactivating yourself
    if target_user["id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    # Admin cannot deactivate Super Admin
    if target_user["role"] == UserRole.SUPER_ADMIN.value and current_user["role"] != UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Cannot modify Super Admin account")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": is_active, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # If deactivating, remove all sessions
    if not is_active:
        await db.sessions.delete_many({"user_id": user_id})
    
    return {"status": "updated", "is_active": is_active}


@router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Delete user (Super Admin only)"""
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user["id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    await db.users.delete_one({"id": user_id})
    await db.sessions.delete_many({"user_id": user_id})
    
    return {"status": "deleted"}


class BulkDeleteRequest(BaseModel):
    user_ids: List[str]


@router.post("/admin/users/bulk-delete")
async def bulk_delete_users(
    request: BulkDeleteRequest,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Bulk delete users (Super Admin only)"""
    if not request.user_ids:
        raise HTTPException(status_code=400, detail="No user IDs provided")
    
    # Filter out current user's ID if present
    user_ids = [uid for uid in request.user_ids if uid != current_user["id"]]
    
    if not user_ids:
        raise HTTPException(status_code=400, detail="No valid users to delete (cannot delete yourself)")
    
    # Get users to delete for audit
    users_to_delete = await db.users.find(
        {"id": {"$in": user_ids}},
        {"_id": 0, "id": 1, "email": 1, "name": 1, "role": 1}
    ).to_list(1000)
    
    if not users_to_delete:
        raise HTTPException(status_code=404, detail="No matching users found")
    
    # Delete users
    result = await db.users.delete_many({"id": {"$in": user_ids}})
    
    # Delete their sessions
    await db.sessions.delete_many({"user_id": {"$in": user_ids}})
    
    # Log the bulk delete action
    from routers.audit import log_audit, AuditAction
    await log_audit(
        action=AuditAction.USER_DELETE,
        user_id=current_user["id"],
        user_email=current_user["email"],
        user_role=current_user["role"],
        target_type="users",
        target_name=f"Bulk delete: {len(users_to_delete)} users",
        details={
            "deleted_users": [{"id": u["id"], "email": u["email"], "role": u["role"]} for u in users_to_delete]
        }
    )
    
    return {
        "status": "deleted",
        "deleted_count": result.deleted_count,
        "deleted_users": [{"id": u["id"], "email": u["email"]} for u in users_to_delete]
    }


# ============== ROLE CONFIGURATION (Super Admin) ==============
@router.get("/admin/roles/config")
async def get_role_configs(user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))):
    """Get all role configurations"""
    configs = await db.role_configs.find({}, {"_id": 0}).to_list(100)
    
    # Merge with defaults
    result = {}
    for role in UserRole:
        config = next((c for c in configs if c["role"] == role.value), None)
        result[role.value] = {
            "role": role.value,
            "permissions": config.get("permissions") if config else DEFAULT_PERMISSIONS[role],
            "sidebar_access": config.get("sidebar_access") if config else DEFAULT_SIDEBAR_ACCESS[role],
        }
    
    return result


@router.put("/admin/roles/{role}/sidebar")
async def update_role_sidebar(
    role: UserRole,
    config: SidebarConfig,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Update sidebar access for a role (Super Admin only)"""
    await db.role_configs.update_one(
        {"role": role.value},
        {"$set": {
            "role": role.value,
            "sidebar_access": config.allowed_items,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Update all users with this role
    await db.users.update_many(
        {"role": role.value},
        {"$set": {"sidebar_access": config.allowed_items}}
    )
    
    return {"status": "updated", "role": role.value, "sidebar_access": config.allowed_items}


@router.put("/admin/roles/{role}/permissions")
async def update_role_permissions(
    role: UserRole,
    config: PermissionConfig,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Update permissions for a role (Super Admin only)"""
    await db.role_configs.update_one(
        {"role": role.value},
        {"$set": {
            "role": role.value,
            "permissions": config.permissions,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Update all users with this role
    await db.users.update_many(
        {"role": role.value},
        {"$set": {"permissions": config.permissions}}
    )
    
    return {"status": "updated", "role": role.value, "permissions": config.permissions}


# ============== AVAILABLE SIDEBAR ITEMS & PERMISSIONS ==============
@router.get("/admin/sidebar-items")
async def get_all_sidebar_items(user: dict = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN]))):
    """Get all available sidebar items"""
    return {
        "items": [
            {"id": "dashboard", "label": "Dashboard", "icon": "LayoutDashboard"},
            {"id": "campaigns", "label": "Campaigns", "icon": "Target"},
            {"id": "compare", "label": "Compare", "icon": "GitCompare"},
            {"id": "media_planner", "label": "Media Planner", "icon": "Calendar"},
            {"id": "creatives", "label": "Creatives", "icon": "Image"},
            {"id": "ssp_endpoints", "label": "SSP Endpoints", "icon": "Server"},
            {"id": "ssp_analytics", "label": "SSP Analytics", "icon": "BarChart3"},
            {"id": "bid_logs", "label": "Bid Logs", "icon": "FileText"},
            {"id": "bid_stream", "label": "Bid Stream", "icon": "Activity"},
            {"id": "reports", "label": "Reports", "icon": "PieChart"},
            {"id": "ad_performance", "label": "Ad Performance", "icon": "TrendingUp"},
            {"id": "budget_pacing", "label": "Budget Pacing", "icon": "DollarSign"},
            {"id": "insights", "label": "Insights", "icon": "Lightbulb"},
            {"id": "ml_models", "label": "ML Models", "icon": "Brain"},
            {"id": "bid_optimizer", "label": "Bid Optimizer", "icon": "Zap"},
            {"id": "ab_testing", "label": "A/B Testing", "icon": "FlaskConical"},
            {"id": "fraud", "label": "Fraud", "icon": "Shield"},
            {"id": "audiences", "label": "Audiences", "icon": "Users"},
            {"id": "attribution", "label": "Attribution", "icon": "GitBranch"},
            {"id": "migration", "label": "Migration", "icon": "ArrowRightLeft"},
            {"id": "admin_panel", "label": "Admin Panel", "icon": "Settings"},
        ]
    }


@router.get("/admin/permissions")
async def get_all_permissions(user: dict = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN]))):
    """Get all available permissions"""
    return {
        "permissions": [
            {"id": "view_dashboard", "label": "View Dashboard", "category": "Dashboard"},
            {"id": "view_reports", "label": "View Reports", "category": "Reports"},
            {"id": "manage_campaigns", "label": "Manage Campaigns", "category": "Campaigns"},
            {"id": "manage_creatives", "label": "Manage Creatives", "category": "Creatives"},
            {"id": "view_analytics", "label": "View Analytics", "category": "Analytics"},
            {"id": "view_budget", "label": "View Budget", "category": "Budget"},
            {"id": "manage_users", "label": "Manage Users", "category": "Admin"},
            {"id": "view_bid_logs", "label": "View Bid Logs", "category": "Bidding"},
            {"id": "manage_ssp", "label": "Manage SSP", "category": "SSP"},
            {"id": "view_fraud", "label": "View Fraud Reports", "category": "Security"},
            {"id": "manage_audiences", "label": "Manage Audiences", "category": "Audiences"},
            {"id": "manage_roles", "label": "Manage Roles", "category": "Admin"},
            {"id": "manage_permissions", "label": "Manage Permissions", "category": "Admin"},
            {"id": "manage_sidebar", "label": "Manage Sidebar", "category": "Admin"},
            {"id": "system_settings", "label": "System Settings", "category": "Admin"},
        ]
    }


# ============== SEED DEMO ACCOUNTS ==============
@router.post("/admin/seed-demo-accounts")
async def seed_demo_accounts():
    """Create demo accounts for testing (one-time setup) - 3 tier hierarchy"""
    demo_accounts = [
        {
            "email": "advertiser@demo.com",
            "password": "demo123",
            "name": "Demo Advertiser",
            "role": UserRole.ADVERTISER,
        },
        {
            "email": "admin@demo.com",
            "password": "demo123",
            "name": "Demo Admin",
            "role": UserRole.ADMIN,
        },
        {
            "email": "superadmin@demo.com",
            "password": "demo123",
            "name": "Super Admin",
            "role": UserRole.SUPER_ADMIN,
        },
    ]
    
    created = []
    admin_id = None
    
    # First pass - create accounts
    for account in demo_accounts:
        existing = await db.users.find_one({"email": account["email"]})
        if existing:
            created.append({"email": account["email"], "status": "already_exists"})
            if account["role"] == UserRole.ADMIN:
                admin_id = existing["id"]
            continue
        
        role = account["role"]
        user = {
            "id": str(uuid.uuid4()),
            "email": account["email"],
            "password_hash": hash_password(account["password"]),
            "name": account["name"],
            "role": role.value,
            "permissions": DEFAULT_PERMISSIONS[role],
            "sidebar_access": DEFAULT_SIDEBAR_ACCESS[role],
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        # Link advertiser to admin
        if role == UserRole.ADVERTISER and admin_id:
            user["parent_id"] = admin_id
            user["created_by"] = admin_id
        
        await db.users.insert_one(user)
        created.append({"email": account["email"], "status": "created", "role": role.value})
        
        if role == UserRole.ADMIN:
            admin_id = user["id"]
    
    return {
        "status": "success",
        "accounts": created,
        "credentials": {
            "advertiser": {"email": "advertiser@demo.com", "password": "demo123"},
            "admin": {"email": "admin@demo.com", "password": "demo123"},
            "super_admin": {"email": "superadmin@demo.com", "password": "demo123"},
        },
        "hierarchy_note": "Super Admin → Admin → Advertiser (3-tier system)"
    }


# ============== IMPERSONATION (Super Admin) ==============
@router.post("/admin/impersonate/{user_id}")
async def impersonate_user(
    user_id: str,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """
    Allow Super Admin to impersonate another user.
    Creates a new session token for the target user.
    """
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not target_user.get("is_active", True):
        raise HTTPException(status_code=400, detail="Cannot impersonate inactive user")
    
    # Create impersonation session with marker
    token = generate_token()
    session = {
        "token": token,
        "user_id": target_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "impersonated_by": current_user["id"],
        "original_user_id": current_user["id"],
    }
    await db.sessions.insert_one(session)
    
    user_response = UserResponse(
        id=target_user["id"],
        email=target_user["email"],
        name=target_user["name"],
        role=target_user["role"],
        permissions=target_user.get("permissions", []),
        sidebar_access=target_user.get("sidebar_access", []),
        created_at=target_user["created_at"],
        is_active=target_user.get("is_active", True),
        created_by=target_user.get("created_by"),
        parent_id=target_user.get("parent_id"),
    )
    
    return {
        "token": token,
        "user": user_response,
        "impersonation": True,
        "original_user": current_user["name"]
    }


@router.get("/admin/users/{user_id}/children")
async def get_user_children(
    user_id: str,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Get all child users of a specific user (Super Admin only)"""
    children = await db.users.find(
        {"parent_id": user_id},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    return children


# ============== BULK ACCESS UPDATE ==============
@router.put("/admin/roles/bulk-update")
async def bulk_update_role_access(
    config: BulkAccessUpdate,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """
    Bulk update sidebar access and/or permissions for a role.
    Super Admin only.
    """
    role = config.role
    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if config.sidebar_access is not None:
        update_fields["sidebar_access"] = config.sidebar_access
    
    if config.permissions is not None:
        update_fields["permissions"] = config.permissions
    
    # Update role config
    await db.role_configs.update_one(
        {"role": role},
        {"$set": {**update_fields, "role": role}},
        upsert=True
    )
    
    # Update all users with this role
    user_update_fields = {}
    if config.sidebar_access is not None:
        user_update_fields["sidebar_access"] = config.sidebar_access
    if config.permissions is not None:
        user_update_fields["permissions"] = config.permissions
    
    if user_update_fields:
        result = await db.users.update_many(
            {"role": role},
            {"$set": user_update_fields}
        )
        users_updated = result.modified_count
    else:
        users_updated = 0
    
    return {
        "status": "success",
        "role": role,
        "sidebar_access": config.sidebar_access,
        "permissions": config.permissions,
        "users_updated": users_updated
    }


# ============== DATA OWNERSHIP ==============
@router.get("/admin/my-data-scope")
async def get_my_data_scope(current_user: dict = Depends(get_current_user)):
    """
    Get the data scope for current user.
    Returns user IDs whose data the current user can access.
    """
    user_id = current_user["id"]
    role = current_user["role"]
    
    if role == UserRole.SUPER_ADMIN.value:
        # Super Admin can see all data
        return {"scope": "all", "user_ids": None}
    
    elif role == UserRole.ADMIN.value:
        # Admin can see their own data + all their children's data
        children = await db.users.find(
            {"parent_id": user_id},
            {"id": 1, "_id": 0}
        ).to_list(1000)
        child_ids = [c["id"] for c in children]
        return {"scope": "hierarchical", "user_ids": [user_id] + child_ids}
    
    else:
        # Advertiser/User can only see their own data
        return {"scope": "self", "user_ids": [user_id]}



# ============== PASSWORD RESET ==============
@router.post("/auth/password-reset/request")
async def request_password_reset(data: PasswordResetRequest, request: Request):
    """
    Request a password reset. 
    Sends an email with the reset link.
    """
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"status": "success", "message": "If the email exists, a reset link will be sent"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    reset_token_hash = hash_password(reset_token)
    
    # Store reset token with expiration (1 hour)
    await db.password_resets.delete_many({"user_id": user["id"]})  # Remove old tokens
    await db.password_resets.insert_one({
        "user_id": user["id"],
        "token_hash": reset_token_hash,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
    })
    
    # Log the request
    await log_audit(
        action=AuditAction.AUTH_PASSWORD_RESET_REQUEST,
        user_id=user["id"],
        user_email=user["email"],
        user_role=user["role"],
        ip_address=request.client.host if request.client else None,
        success=True
    )
    
    # Send password reset email
    try:
        from routers.email_service import send_password_reset_email
        await send_password_reset_email(
            user_email=user["email"],
            user_name=user.get("name", "User"),
            reset_token=reset_token,
            user_id=user["id"]  # Pass user_id for preference check
        )
    except Exception as e:
        logger.warning(f"Failed to send password reset email: {e}")
    
    return {
        "status": "success",
        "message": "Password reset link sent to your email",
        "reset_token": reset_token,  # Keep for demo purposes
        "reset_url": f"/reset-password?token={reset_token}"
    }


@router.post("/auth/password-reset/confirm")
async def confirm_password_reset(data: PasswordResetConfirm, request: Request):
    """Confirm password reset with token"""
    token_hash = hash_password(data.token)
    
    # Find valid reset token
    reset_record = await db.password_resets.find_one({"token_hash": token_hash})
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check expiration
    expires_at = datetime.fromisoformat(reset_record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        await db.password_resets.delete_one({"token_hash": token_hash})
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Get user
    user = await db.users.find_one({"id": reset_record["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    
    # Update password
    new_password_hash = hash_password(data.new_password)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "password_hash": new_password_hash,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Delete reset token
    await db.password_resets.delete_one({"token_hash": token_hash})
    
    # Invalidate all existing sessions (force re-login)
    await db.sessions.delete_many({"user_id": user["id"]})
    
    # Log the reset
    await log_audit(
        action=AuditAction.AUTH_PASSWORD_RESET,
        user_id=user["id"],
        user_email=user["email"],
        user_role=user["role"],
        ip_address=request.client.host if request.client else None,
        success=True
    )
    
    return {"status": "success", "message": "Password has been reset. Please login with your new password."}


@router.post("/auth/change-password")
async def change_password(
    data: PasswordChange, 
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Change password for logged-in user"""
    # Verify current password
    if current_user["password_hash"] != hash_password(data.current_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update password
    new_password_hash = hash_password(data.new_password)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "password_hash": new_password_hash,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log the change
    await log_audit(
        action=AuditAction.AUTH_PASSWORD_CHANGE,
        user_id=current_user["id"],
        user_email=current_user["email"],
        user_role=current_user["role"],
        ip_address=request.client.host if request.client else None,
        success=True
    )
    
    return {"status": "success", "message": "Password changed successfully"}


# ============== TWO-FACTOR AUTHENTICATION (2FA) ==============
@router.post("/auth/2fa/setup", response_model=TwoFASetupResponse)
async def setup_2fa(
    request: Request,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """
    Setup 2FA for admin accounts.
    Returns secret and QR code URL for authenticator app.
    """
    # Check if already enabled
    if current_user.get("two_fa_enabled"):
        raise HTTPException(status_code=400, detail="2FA is already enabled")
    
    # Generate TOTP secret
    secret = pyotp.random_base32()
    
    # Generate provisioning URI for QR code
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=current_user["email"],
        issuer_name="OpenRTB Bidder"
    )
    
    # Generate backup codes
    backup_codes = [secrets.token_hex(4).upper() for _ in range(8)]
    backup_codes_hashed = [hash_password(code) for code in backup_codes]
    
    # Store secret temporarily (not enabled yet)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "two_fa_secret": secret,
            "two_fa_backup_codes": backup_codes_hashed,
            "two_fa_enabled": False,  # Will be enabled after verification
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log setup initiation
    await log_audit(
        action=AuditAction.TWO_FA_SETUP,
        user_id=current_user["id"],
        user_email=current_user["email"],
        user_role=current_user["role"],
        ip_address=request.client.host if request.client else None,
        success=True
    )
    
    return TwoFASetupResponse(
        secret=secret,
        qr_code_url=provisioning_uri,
        backup_codes=backup_codes
    )


@router.post("/auth/2fa/enable")
async def enable_2fa(
    data: TwoFAVerify,
    request: Request,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """
    Enable 2FA after verifying the code from authenticator app.
    """
    secret = current_user.get("two_fa_secret")
    if not secret:
        raise HTTPException(status_code=400, detail="Please run 2FA setup first")
    
    # Verify the code
    totp = pyotp.TOTP(secret)
    if not totp.verify(data.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Enable 2FA
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "two_fa_enabled": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log enablement
    await log_audit(
        action=AuditAction.TWO_FA_ENABLE,
        user_id=current_user["id"],
        user_email=current_user["email"],
        user_role=current_user["role"],
        ip_address=request.client.host if request.client else None,
        success=True
    )
    
    return {"status": "success", "message": "2FA has been enabled"}


@router.post("/auth/2fa/disable")
async def disable_2fa(
    data: TwoFAVerify,
    request: Request,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """
    Disable 2FA. Requires current 2FA code to confirm.
    """
    if not current_user.get("two_fa_enabled"):
        raise HTTPException(status_code=400, detail="2FA is not enabled")
    
    secret = current_user.get("two_fa_secret")
    totp = pyotp.TOTP(secret)
    
    if not totp.verify(data.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Disable 2FA
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "two_fa_enabled": False,
            "two_fa_secret": None,
            "two_fa_backup_codes": [],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log disablement
    await log_audit(
        action=AuditAction.TWO_FA_DISABLE,
        user_id=current_user["id"],
        user_email=current_user["email"],
        user_role=current_user["role"],
        ip_address=request.client.host if request.client else None,
        success=True
    )
    
    return {"status": "success", "message": "2FA has been disabled"}


@router.get("/auth/2fa/status")
async def get_2fa_status(current_user: dict = Depends(get_current_user)):
    """Get 2FA status for current user"""
    return {
        "enabled": current_user.get("two_fa_enabled", False),
        "can_enable": current_user["role"] in [UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]
    }


# ============== AUDIT LOGS ==============
@router.get("/admin/audit-logs")
async def get_audit_logs_endpoint(
    limit: int = 50,
    offset: int = 0,
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Get audit logs (Super Admin only)"""
    return await get_audit_logs(
        limit=limit,
        offset=offset,
        action_filter=action,
        user_id_filter=user_id
    )


# ============== ADMIN DASHBOARD STATS ==============
@router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN]))):
    """
    Get quick stats for admin dashboard.
    Super Admin: sees all stats
    Admin: sees only their advertisers' stats
    """
    if current_user["role"] == UserRole.SUPER_ADMIN.value:
        total_admins = await db.users.count_documents({"role": UserRole.ADMIN.value})
        total_advertisers = await db.users.count_documents({"role": UserRole.ADVERTISER.value})
        total_campaigns = await db.campaigns.count_documents({})
        total_creatives = await db.creatives.count_documents({})
        active_campaigns = await db.campaigns.count_documents({"status": "active"})
    else:
        # Admin sees only their data
        total_admins = 0  # Admin doesn't see other admins
        advertiser_ids = await db.users.find(
            {"parent_id": current_user["id"], "role": UserRole.ADVERTISER.value},
            {"id": 1, "_id": 0}
        ).to_list(1000)
        advertiser_id_list = [a["id"] for a in advertiser_ids]
        total_advertisers = len(advertiser_id_list)
        
        # Count campaigns owned by admin or their advertisers
        owner_ids = [current_user["id"]] + advertiser_id_list
        total_campaigns = await db.campaigns.count_documents({"owner_id": {"$in": owner_ids}})
        total_creatives = await db.creatives.count_documents({"owner_id": {"$in": owner_ids}})
        active_campaigns = await db.campaigns.count_documents({"owner_id": {"$in": owner_ids}, "status": "active"})
    
    return {
        "total_admins": total_admins,
        "total_advertisers": total_advertisers,
        "total_campaigns": total_campaigns,
        "total_creatives": total_creatives,
        "active_campaigns": active_campaigns
    }


@router.get("/admin/activity-timeline")
async def get_activity_timeline(
    limit: int = 20,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """
    Get recent activity timeline across admins/advertisers.
    Shows user creation, campaign creation, login events etc.
    """
    if current_user["role"] == UserRole.SUPER_ADMIN.value:
        # Super Admin sees all activity
        query = {}
    else:
        # Admin sees only activity from themselves and their advertisers
        advertiser_ids = await db.users.find(
            {"parent_id": current_user["id"]},
            {"id": 1, "_id": 0}
        ).to_list(1000)
        user_ids = [current_user["id"]] + [a["id"] for a in advertiser_ids]
        query = {"actor.user_id": {"$in": user_ids}}
    
    # Get recent audit logs as activity
    activities = await db.audit_logs.find(
        query,
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    # Format activities for display
    formatted = []
    for act in activities:
        formatted.append({
            "timestamp": act.get("timestamp"),
            "action": act.get("action"),
            "actor_name": act.get("actor", {}).get("email", "Unknown"),
            "actor_role": act.get("actor", {}).get("role", "unknown"),
            "target_type": act.get("target", {}).get("type") if act.get("target") else None,
            "target_name": act.get("target", {}).get("name") if act.get("target") else None,
            "success": act.get("success", True),
            "details": act.get("details")
        })
    
    return {"activities": formatted, "total": len(formatted)}


@router.get("/admin/users/export")
async def export_users_csv(current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN]))):
    """
    Export users list to CSV format.
    Super Admin: all users
    Admin: only their advertisers
    """
    from fastapi.responses import StreamingResponse
    import csv
    from io import StringIO
    
    if current_user["role"] == UserRole.SUPER_ADMIN.value:
        users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    else:
        users = await db.users.find(
            {"parent_id": current_user["id"]},
            {"_id": 0, "password_hash": 0}
        ).to_list(1000)
    
    # Create CSV
    output = StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["Name", "Email", "Role", "Status", "Created At", "Created By"])
    
    # Get all users for lookup
    all_users = await db.users.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    user_name_map = {u["id"]: u["name"] for u in all_users}
    
    for user in users:
        created_by_name = user_name_map.get(user.get("created_by"), "System")
        writer.writerow([
            user.get("name", ""),
            user.get("email", ""),
            user.get("role", ""),
            "Active" if user.get("is_active", True) else "Inactive",
            user.get("created_at", "")[:10] if user.get("created_at") else "",
            created_by_name
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=users_export.csv"}
    )


@router.get("/admin/users/search")
async def search_users(
    q: str = "",
    role: Optional[str] = None,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """
    Search users by name or email with optional role filter.
    """
    query = {}
    
    # Apply search query
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}}
        ]
    
    # Apply role filter
    if role:
        query["role"] = role
    
    # Apply hierarchy restrictions for Admin
    if current_user["role"] != UserRole.SUPER_ADMIN.value:
        query["parent_id"] = current_user["id"]
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(100)
    return users


@router.get("/admin/advertiser/{advertiser_id}/dashboard-data")
async def get_advertiser_dashboard_data(
    advertiser_id: str,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """
    Get dashboard data for a specific advertiser (for view-as feature).
    Returns the same data the advertiser would see.
    """
    # Verify access
    advertiser = await db.users.find_one({"id": advertiser_id}, {"_id": 0, "password_hash": 0})
    if not advertiser:
        raise HTTPException(status_code=404, detail="Advertiser not found")
    
    if advertiser["role"] != UserRole.ADVERTISER.value:
        raise HTTPException(status_code=400, detail="Target user is not an advertiser")
    
    # Admin can only view their own advertisers
    if current_user["role"] == UserRole.ADMIN.value:
        if advertiser.get("parent_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Cannot view this advertiser's data")
    
    # Get advertiser's campaigns
    campaigns = await db.campaigns.find(
        {"owner_id": advertiser_id},
        {"_id": 0}
    ).to_list(100)
    
    # Get advertiser's creatives
    creatives = await db.creatives.find(
        {"owner_id": advertiser_id},
        {"_id": 0}
    ).to_list(100)
    
    # Calculate stats
    total_campaigns = len(campaigns)
    active_campaigns = len([c for c in campaigns if c.get("status") == "active"])
    total_spend = sum(c.get("budget", {}).get("total_spent", 0) for c in campaigns)
    total_impressions = sum(c.get("wins", 0) for c in campaigns)
    
    return {
        "advertiser": {
            "id": advertiser["id"],
            "name": advertiser["name"],
            "email": advertiser["email"],
            "created_at": advertiser.get("created_at"),
            "is_active": advertiser.get("is_active", True)
        },
        "stats": {
            "total_campaigns": total_campaigns,
            "active_campaigns": active_campaigns,
            "total_creatives": len(creatives),
            "total_spend": total_spend,
            "total_impressions": total_impressions
        },
        "campaigns": campaigns[:10],  # Return last 10 campaigns
        "creatives": creatives[:10]   # Return last 10 creatives
    }


@router.get("/admin/admin/{admin_id}/dashboard-data")
async def get_admin_dashboard_data(
    admin_id: str,
    current_user: dict = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """
    Get dashboard data for a specific admin (Super Admin only).
    Returns the admin's advertisers and aggregate stats.
    """
    admin = await db.users.find_one({"id": admin_id}, {"_id": 0, "password_hash": 0})
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    if admin["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=400, detail="Target user is not an admin")
    
    # Get admin's advertisers
    advertisers = await db.users.find(
        {"parent_id": admin_id, "role": UserRole.ADVERTISER.value},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    
    # Get aggregate stats across all advertisers
    advertiser_ids = [a["id"] for a in advertisers]
    owner_ids = [admin_id] + advertiser_ids
    
    campaigns = await db.campaigns.find(
        {"owner_id": {"$in": owner_ids}},
        {"_id": 0}
    ).to_list(1000)
    
    creatives_count = await db.creatives.count_documents({"owner_id": {"$in": owner_ids}})
    
    total_spend = sum(c.get("budget", {}).get("total_spent", 0) for c in campaigns)
    total_impressions = sum(c.get("wins", 0) for c in campaigns)
    
    return {
        "admin": {
            "id": admin["id"],
            "name": admin["name"],
            "email": admin["email"],
            "created_at": admin.get("created_at"),
            "is_active": admin.get("is_active", True)
        },
        "stats": {
            "total_advertisers": len(advertisers),
            "total_campaigns": len(campaigns),
            "active_campaigns": len([c for c in campaigns if c.get("status") == "active"]),
            "total_creatives": creatives_count,
            "total_spend": total_spend,
            "total_impressions": total_impressions
        },
        "advertisers": advertisers
    }


# ============== EMAIL PREFERENCES ==============

@router.get("/auth/email-preferences")
async def get_email_preferences(current_user: dict = Depends(get_current_user)):
    """Get current user's email notification preferences"""
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "email_preferences": 1})
    
    # Return existing preferences or defaults
    preferences = user.get("email_preferences") if user else None
    if not preferences:
        preferences = DEFAULT_EMAIL_PREFERENCES
    
    return {
        "preferences": preferences,
        "defaults": DEFAULT_EMAIL_PREFERENCES
    }


@router.put("/auth/email-preferences")
async def update_email_preferences(
    updates: EmailPreferencesUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user's email notification preferences"""
    # Get current preferences
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "email_preferences": 1})
    current_prefs = user.get("email_preferences", DEFAULT_EMAIL_PREFERENCES) if user else DEFAULT_EMAIL_PREFERENCES
    
    # Apply updates
    update_data = updates.model_dump(exclude_none=True)
    
    # Validate threshold values
    if "budget_warning_threshold" in update_data:
        if not 10 <= update_data["budget_warning_threshold"] <= 95:
            raise HTTPException(status_code=400, detail="Budget warning threshold must be between 10 and 95")
    
    if "budget_critical_threshold" in update_data:
        if not 50 <= update_data["budget_critical_threshold"] <= 100:
            raise HTTPException(status_code=400, detail="Budget critical threshold must be between 50 and 100")
    
    # Ensure critical > warning
    warning = update_data.get("budget_warning_threshold", current_prefs.get("budget_warning_threshold", 75))
    critical = update_data.get("budget_critical_threshold", current_prefs.get("budget_critical_threshold", 90))
    if critical <= warning:
        raise HTTPException(status_code=400, detail="Critical threshold must be greater than warning threshold")
    
    # Validate digest_day
    if "digest_day" in update_data:
        valid_days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        if update_data["digest_day"].lower() not in valid_days:
            raise HTTPException(status_code=400, detail=f"Invalid digest day. Must be one of: {valid_days}")
        update_data["digest_day"] = update_data["digest_day"].lower()
    
    # Validate quiet hours
    if "quiet_hours_start" in update_data:
        if not 0 <= update_data["quiet_hours_start"] <= 23:
            raise HTTPException(status_code=400, detail="Quiet hours start must be between 0 and 23")
    
    if "quiet_hours_end" in update_data:
        if not 0 <= update_data["quiet_hours_end"] <= 23:
            raise HTTPException(status_code=400, detail="Quiet hours end must be between 0 and 23")
    
    # Merge with current preferences
    new_prefs = {**current_prefs, **update_data}
    
    # Update in database
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"email_preferences": new_prefs, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "status": "updated",
        "preferences": new_prefs
    }


@router.post("/auth/email-preferences/reset")
async def reset_email_preferences(current_user: dict = Depends(get_current_user)):
    """Reset email preferences to defaults"""
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"email_preferences": DEFAULT_EMAIL_PREFERENCES, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "status": "reset",
        "preferences": DEFAULT_EMAIL_PREFERENCES
    }


async def get_user_email_preferences(user_id: str) -> dict:
    """Helper function to get user's email preferences"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "email_preferences": 1})
    return user.get("email_preferences", DEFAULT_EMAIL_PREFERENCES) if user else DEFAULT_EMAIL_PREFERENCES


async def should_send_notification(user_id: str, notification_type: str) -> bool:
    """
    Check if a notification should be sent based on user preferences.
    notification_type: 'new_user', 'security', 'budget', 'password_reset', 'system'
    """
    prefs = await get_user_email_preferences(user_id)
    
    type_mapping = {
        "new_user": "new_user_notifications",
        "security": "security_alerts",
        "budget": "budget_alerts",
        "password_reset": "password_reset_notifications",
        "system": "system_announcements"
    }
    
    pref_key = type_mapping.get(notification_type)
    if not pref_key:
        return True  # Unknown types default to sending
    
    # Check if notification is enabled
    if not prefs.get(pref_key, True):
        return False
    
    # Check quiet hours for non-critical notifications
    if notification_type not in ["security", "password_reset"] and prefs.get("quiet_hours_enabled", False):
        from datetime import datetime
        current_hour = datetime.now().hour
        start = prefs.get("quiet_hours_start", 22)
        end = prefs.get("quiet_hours_end", 8)
        
        # Handle overnight quiet hours (e.g., 22:00 to 08:00)
        if start > end:
            if current_hour >= start or current_hour < end:
                return False
        else:
            if start <= current_hour < end:
                return False
    
    return True


async def get_budget_thresholds(user_id: str) -> tuple:
    """Get user's budget alert thresholds (warning, critical)"""
    prefs = await get_user_email_preferences(user_id)
    return (
        prefs.get("budget_warning_threshold", 75),
        prefs.get("budget_critical_threshold", 90)
    )


# ============== PASSWORD RESET ALIAS ENDPOINTS ==============
# These are aliases for the frontend paths

@router.post("/auth/forgot-password")
async def forgot_password(data: PasswordResetRequest, request: Request):
    """Alias for password reset request - matches frontend path"""
    return await request_password_reset(data, request)


@router.get("/auth/validate-reset-token")
async def validate_reset_token(token: str):
    """Validate a password reset token without using it"""
    token_hash = hash_password(token)
    
    reset_record = await db.password_resets.find_one({"token_hash": token_hash})
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid reset token")
    
    # Check expiration
    expires_at = datetime.fromisoformat(reset_record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    return {"valid": True}


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=6)


@router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest, request: Request):
    """Alias for password reset confirm - matches frontend path"""
    confirm_data = PasswordResetConfirm(token=data.token, new_password=data.password)
    return await confirm_password_reset(confirm_data, request)


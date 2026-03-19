"""
Authentication and Role-Based Access Control (RBAC) endpoints
Roles: User, Advertiser, Admin, Super Admin
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

from routers.shared import db
from routers.audit import log_audit, AuditAction, get_audit_logs

router = APIRouter(tags=["Authentication"])


# ============== ENUMS ==============
class UserRole(str, Enum):
    USER = "user"
    ADVERTISER = "advertiser"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


# ============== MODELS ==============
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: UserRole = UserRole.USER


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


# ============== DEFAULT PERMISSIONS ==============
DEFAULT_PERMISSIONS = {
    UserRole.USER: [
        "view_dashboard",
        "view_reports",
    ],
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
    UserRole.USER: [
        "dashboard",
        "reports",
    ],
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
# Hierarchy: Super Admin -> Admin -> Advertiser -> User

def get_allowed_child_roles(parent_role: str) -> List[str]:
    """Get roles that a parent can create"""
    if parent_role == UserRole.SUPER_ADMIN.value:
        return [UserRole.ADMIN.value, UserRole.ADVERTISER.value, UserRole.USER.value]
    elif parent_role == UserRole.ADMIN.value:
        return [UserRole.ADVERTISER.value, UserRole.USER.value]
    elif parent_role == UserRole.ADVERTISER.value:
        return [UserRole.USER.value]
    return []


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
        if current_role == UserRole.ADMIN.value:
            raise HTTPException(
                status_code=403,
                detail="Admin can only create Advertiser or User accounts"
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
    """Create demo accounts for testing (one-time setup)"""
    demo_accounts = [
        {
            "email": "user@demo.com",
            "password": "demo123",
            "name": "Demo User",
            "role": UserRole.USER,
        },
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
    for account in demo_accounts:
        existing = await db.users.find_one({"email": account["email"]})
        if existing:
            created.append({"email": account["email"], "status": "already_exists"})
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
        await db.users.insert_one(user)
        created.append({"email": account["email"], "status": "created", "role": role.value})
    
    return {
        "status": "success",
        "accounts": created,
        "credentials": {
            "user": {"email": "user@demo.com", "password": "demo123"},
            "advertiser": {"email": "advertiser@demo.com", "password": "demo123"},
            "admin": {"email": "admin@demo.com", "password": "demo123"},
            "super_admin": {"email": "superadmin@demo.com", "password": "demo123"},
        }
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
    In production, this would send an email. For demo, we return the token directly.
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
    
    # In production, send email here. For demo, return token directly.
    return {
        "status": "success",
        "message": "Password reset link generated",
        "reset_token": reset_token,  # Remove this in production!
        "reset_url": f"/reset-password?token={reset_token}"  # For demo
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


"""
Authentication and Role-Based Access Control (RBAC) endpoints
Roles: User, Advertiser, Admin, Super Admin
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from enum import Enum
import hashlib
import secrets
import uuid

from routers.shared import db

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


class TokenResponse(BaseModel):
    token: str
    user: UserResponse


class SidebarConfig(BaseModel):
    role: UserRole
    allowed_items: List[str]


class PermissionConfig(BaseModel):
    role: UserRole
    permissions: List[str]


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


@router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login with email and password"""
    # Find user
    user = await db.users.find_one({"email": credentials.email.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if user["password_hash"] != hash_password(credentials.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User account is deactivated")
    
    # Create session
    token = generate_token()
    session = {
        "token": token,
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.sessions.insert_one(session)
    
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
    )
    
    return TokenResponse(token=token, user=user_response)


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
    )


# ============== USER MANAGEMENT (Admin/Super Admin) ==============
@router.get("/admin/users")
async def get_all_users(user: dict = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN]))):
    """Get all users (Admin/Super Admin only)"""
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users


@router.post("/admin/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
):
    """Create a new user (Admin/Super Admin only)"""
    # Only super_admin can create admin/super_admin
    if user_data.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        if current_user["role"] != UserRole.SUPER_ADMIN.value:
            raise HTTPException(
                status_code=403,
                detail="Only Super Admin can create Admin or Super Admin users"
            )
    
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Get role config
    role_config = await db.role_configs.find_one({"role": user_data.role.value})
    permissions = role_config.get("permissions") if role_config else DEFAULT_PERMISSIONS[user_data.role]
    sidebar_access = role_config.get("sidebar_access") if role_config else DEFAULT_SIDEBAR_ACCESS[user_data.role]
    
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
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        permissions=user["permissions"],
        sidebar_access=user["sidebar_access"],
        created_at=user["created_at"],
        is_active=user["is_active"],
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

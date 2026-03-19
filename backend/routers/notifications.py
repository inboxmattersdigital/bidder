"""
WebSocket notification system for real-time updates.
Features:
- Connection management per user
- Broadcast to all connected clients
- Role-based notifications
- Event types: campaign_update, user_activity, security_alert, system_message
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from typing import Dict, List, Set, Optional
from datetime import datetime, timezone
import json
import asyncio
import logging

from routers.shared import db
from routers.auth import get_current_user_ws, get_current_user, UserRole

router = APIRouter(tags=["WebSocket"])
logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and message broadcasting"""
    
    def __init__(self):
        # Store connections by user_id
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Store user info for role-based broadcasting
        self.user_info: Dict[str, dict] = {}
        # Lock for thread safety
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket, user_id: str, user_info: dict):
        await websocket.accept()
        async with self._lock:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(websocket)
            self.user_info[user_id] = user_info
        logger.info(f"WebSocket connected: {user_id} ({user_info.get('role')})")
    
    async def disconnect(self, websocket: WebSocket, user_id: str):
        async with self._lock:
            if user_id in self.active_connections:
                try:
                    self.active_connections[user_id].remove(websocket)
                except ValueError:
                    pass
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
                    if user_id in self.user_info:
                        del self.user_info[user_id]
        logger.info(f"WebSocket disconnected: {user_id}")
    
    async def send_personal(self, user_id: str, message: dict):
        """Send message to a specific user"""
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to send to {user_id}: {e}")
    
    async def broadcast_to_role(self, role: str, message: dict):
        """Send message to all users with a specific role"""
        async with self._lock:
            targets = [
                uid for uid, info in self.user_info.items() 
                if info.get("role") == role
            ]
        
        for user_id in targets:
            await self.send_personal(user_id, message)
    
    async def broadcast_to_roles(self, roles: List[str], message: dict):
        """Send message to users with any of the specified roles"""
        async with self._lock:
            targets = [
                uid for uid, info in self.user_info.items() 
                if info.get("role") in roles
            ]
        
        for user_id in targets:
            await self.send_personal(user_id, message)
    
    async def broadcast_all(self, message: dict):
        """Send message to all connected users"""
        async with self._lock:
            all_users = list(self.active_connections.keys())
        
        for user_id in all_users:
            await self.send_personal(user_id, message)
    
    async def broadcast_to_hierarchy(self, parent_id: str, message: dict):
        """Send message to a user and all their children in hierarchy"""
        # Get all children of the parent
        children = await db.users.find(
            {"parent_id": parent_id},
            {"id": 1, "_id": 0}
        ).to_list(1000)
        
        child_ids = [c["id"] for c in children]
        all_ids = [parent_id] + child_ids
        
        for user_id in all_ids:
            await self.send_personal(user_id, message)
    
    def get_connected_count(self) -> int:
        """Get total number of connected users"""
        return len(self.active_connections)
    
    def get_connected_users(self) -> List[dict]:
        """Get list of connected users (for admin panel)"""
        return [
            {"user_id": uid, **info}
            for uid, info in self.user_info.items()
        ]


# Global connection manager
manager = ConnectionManager()


# ============== NOTIFICATION HELPERS ==============

async def notify_campaign_update(campaign_id: str, campaign_name: str, status: str, owner_id: str):
    """Notify about campaign status changes"""
    message = {
        "type": "campaign_update",
        "data": {
            "campaign_id": campaign_id,
            "campaign_name": campaign_name,
            "status": status,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    }
    
    # Notify campaign owner
    await manager.send_personal(owner_id, message)
    
    # Get owner's parent (admin) and notify them too
    owner = await db.users.find_one({"id": owner_id}, {"parent_id": 1, "_id": 0})
    if owner and owner.get("parent_id"):
        await manager.send_personal(owner["parent_id"], message)
    
    # Notify super admins
    await manager.broadcast_to_role(UserRole.SUPER_ADMIN.value, message)


async def notify_user_activity(actor_id: str, actor_name: str, action: str, target: Optional[str] = None):
    """Notify about user activities (login, user creation, etc.)"""
    message = {
        "type": "user_activity",
        "data": {
            "actor_id": actor_id,
            "actor_name": actor_name,
            "action": action,
            "target": target,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    }
    
    # Notify admins and super admins
    await manager.broadcast_to_roles(
        [UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value],
        message
    )


async def notify_security_alert(alert_type: str, details: dict, target_roles: List[str] = None):
    """Notify about security events"""
    message = {
        "type": "security_alert",
        "data": {
            "alert_type": alert_type,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    }
    
    if target_roles:
        await manager.broadcast_to_roles(target_roles, message)
    else:
        # Default to super admins only
        await manager.broadcast_to_role(UserRole.SUPER_ADMIN.value, message)


async def notify_new_advertiser(admin_id: str, advertiser_name: str, advertiser_email: str):
    """Notify admin when a new advertiser is created under them"""
    message = {
        "type": "new_advertiser",
        "data": {
            "advertiser_name": advertiser_name,
            "advertiser_email": advertiser_email,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    }
    
    await manager.send_personal(admin_id, message)
    await manager.broadcast_to_role(UserRole.SUPER_ADMIN.value, message)


async def notify_budget_alert(campaign_id: str, campaign_name: str, owner_id: str, alert_type: str, percentage: float):
    """Notify about budget alerts"""
    message = {
        "type": "budget_alert",
        "data": {
            "campaign_id": campaign_id,
            "campaign_name": campaign_name,
            "alert_type": alert_type,  # "depleted", "warning_75", "warning_90"
            "percentage": percentage,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    }
    
    await manager.send_personal(owner_id, message)


# ============== WEBSOCKET ENDPOINT ==============

@router.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    """
    WebSocket endpoint for real-time notifications.
    Connect with: ws://host/api/ws/notifications?token=<jwt_token>
    """
    if not token:
        await websocket.close(code=4001, reason="Token required")
        return
    
    # Validate token and get user
    try:
        user = await get_current_user_ws(token)
        if not user:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception as e:
        logger.error(f"WebSocket auth error: {e}")
        await websocket.close(code=4001, reason="Authentication failed")
        return
    
    user_id = user["id"]
    user_info = {
        "name": user.get("name"),
        "email": user.get("email"),
        "role": user.get("role")
    }
    
    await manager.connect(websocket, user_id, user_info)
    
    # Send welcome message
    await manager.send_personal(user_id, {
        "type": "connected",
        "data": {
            "message": f"Connected as {user_info['name']}",
            "role": user_info["role"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    })
    
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            
            # Handle ping/pong for keep-alive
            if data == "ping":
                await websocket.send_text("pong")
            else:
                # Could handle other message types here
                try:
                    message = json.loads(data)
                    # Process client messages if needed
                    logger.debug(f"Received from {user_id}: {message}")
                except json.JSONDecodeError:
                    pass
                    
    except WebSocketDisconnect:
        await manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket error for {user_id}: {e}")
        await manager.disconnect(websocket, user_id)


# ============== REST API ENDPOINTS ==============

@router.get("/notifications/status")
async def get_notification_status(current_user: dict = Depends(get_current_user)):
    """Get WebSocket connection status (admin only)"""
    if current_user.get("role") not in [UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return {
        "connected_users": manager.get_connected_count(),
        "users": manager.get_connected_users() if current_user.get("role") == UserRole.SUPER_ADMIN.value else []
    }


@router.post("/notifications/broadcast")
async def broadcast_notification(
    message: str,
    notification_type: str = "system_message",
    target_roles: Optional[List[str]] = None,
    current_user: dict = Depends(get_current_user)
):
    """Broadcast a notification (super admin only)"""
    if current_user.get("role") != UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Super Admin access required")
    
    notification = {
        "type": notification_type,
        "data": {
            "message": message,
            "from": current_user.get("name"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    }
    
    if target_roles:
        await manager.broadcast_to_roles(target_roles, notification)
    else:
        await manager.broadcast_all(notification)
    
    return {"status": "sent", "recipients": manager.get_connected_count()}

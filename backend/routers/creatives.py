"""
Creative management endpoints - CRUD operations, validation
With data ownership filtering based on user hierarchy
"""
from fastapi import APIRouter, HTTPException, Header
from typing import List, Optional

from models import Creative, CreativeCreate, CreativeType
from routers.shared import db
from routers.auth import get_current_user, UserRole

router = APIRouter(tags=["Creatives"])


async def get_user_data_scope(user: dict):
    """Get the IDs of users whose data the current user can access"""
    role = user["role"]
    user_id = user["id"]
    
    if role == UserRole.SUPER_ADMIN.value:
        return None  # None means all data
    elif role == UserRole.ADMIN.value:
        children = await db.users.find({"parent_id": user_id}, {"id": 1, "_id": 0}).to_list(1000)
        return [user_id] + [c["id"] for c in children]
    else:
        return [user_id]


@router.get("/creatives")
async def get_creatives(
    type: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """Get creatives based on user's data scope"""
    query = {}
    if type:
        query["type"] = type
    
    # Apply data ownership filter if user is authenticated
    if authorization:
        try:
            user = await get_current_user(authorization)
            scope = await get_user_data_scope(user)
            if scope is not None:  # Not super admin
                query["owner_id"] = {"$in": scope}
        except:
            pass  # If auth fails, show all (for backward compatibility)
    
    creatives = await db.creatives.find(query, {"_id": 0}).to_list(1000)
    return creatives


@router.get("/creatives/{creative_id}", response_model=Creative)
async def get_creative(creative_id: str):
    """Get a single creative"""
    creative = await db.creatives.find_one({"id": creative_id}, {"_id": 0})
    if not creative:
        raise HTTPException(status_code=404, detail="Creative not found")
    return creative


@router.post("/creatives", response_model=Creative)
async def create_creative(
    input: CreativeCreate,
    authorization: Optional[str] = Header(None)
):
    """Create a new creative with ownership tracking"""
    # Get current user for ownership
    owner_id = None
    owner_email = None
    if authorization:
        try:
            user = await get_current_user(authorization)
            owner_id = user["id"]
            owner_email = user["email"]
        except:
            pass
    
    creative = Creative(
        name=input.name,
        type=input.type,
        format=input.format,
        adomain=input.adomain,
        iurl=input.iurl,
        cat=input.cat,
        banner_data=input.banner_data,
        video_data=input.video_data,
        native_data=input.native_data,
        audio_data=input.audio_data,
        js_tag=input.js_tag
    )
    
    # Generate preview URL based on creative type
    if creative.type == CreativeType.BANNER:
        if creative.banner_data and creative.banner_data.image_url:
            creative.preview_url = creative.banner_data.image_url
        elif creative.iurl:
            creative.preview_url = creative.iurl
    elif creative.type == CreativeType.VIDEO:
        if creative.video_data:
            if creative.video_data.vast_url:
                creative.preview_url = creative.video_data.vast_url
            elif creative.video_data.video_url:
                creative.preview_url = creative.video_data.video_url
    
    doc = creative.model_dump()
    # Add ownership
    doc["owner_id"] = owner_id
    doc["owner_email"] = owner_email
    
    for field in ["created_at", "updated_at"]:
        if doc.get(field):
            doc[field] = doc[field].isoformat()
    
    await db.creatives.insert_one(doc)
    return creative


@router.delete("/creatives/{creative_id}")
async def delete_creative(creative_id: str):
    """Delete a creative"""
    # Check if used by campaigns
    campaign = await db.campaigns.find_one({"creative_id": creative_id})
    if campaign:
        raise HTTPException(status_code=400, detail="Creative is used by a campaign")
    
    result = await db.creatives.delete_one({"id": creative_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Creative not found")
    return {"status": "deleted"}


@router.put("/creatives/{creative_id}", response_model=Creative)
async def update_creative(
    creative_id: str,
    input: CreativeCreate,
    authorization: Optional[str] = Header(None)
):
    """Update an existing creative"""
    from datetime import datetime, timezone
    
    # Find existing creative
    existing = await db.creatives.find_one({"id": creative_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Creative not found")
    
    # Build update data
    update_data = {
        "name": input.name,
        "type": input.type.value if hasattr(input.type, 'value') else input.type,
        "format": input.format.value if hasattr(input.format, 'value') else input.format,
        "adomain": input.adomain,
        "iurl": input.iurl,
        "cat": input.cat,
        "js_tag": input.js_tag,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update type-specific data
    if input.banner_data:
        update_data["banner_data"] = input.banner_data.model_dump() if hasattr(input.banner_data, 'model_dump') else input.banner_data
    if input.video_data:
        update_data["video_data"] = input.video_data.model_dump() if hasattr(input.video_data, 'model_dump') else input.video_data
    if input.native_data:
        update_data["native_data"] = input.native_data.model_dump() if hasattr(input.native_data, 'model_dump') else input.native_data
    if input.audio_data:
        update_data["audio_data"] = input.audio_data.model_dump() if hasattr(input.audio_data, 'model_dump') else input.audio_data
    
    # Update preview URL based on creative type
    if update_data.get("type") == "banner":
        banner_data = update_data.get("banner_data", {})
        if banner_data.get("image_url"):
            update_data["preview_url"] = banner_data["image_url"]
        elif input.iurl:
            update_data["preview_url"] = input.iurl
    elif update_data.get("type") == "video":
        video_data = update_data.get("video_data", {})
        if video_data.get("vast_url"):
            update_data["preview_url"] = video_data["vast_url"]
        elif video_data.get("video_url"):
            update_data["preview_url"] = video_data["video_url"]
    
    await db.creatives.update_one(
        {"id": creative_id},
        {"$set": update_data}
    )
    
    updated = await db.creatives.find_one({"id": creative_id}, {"_id": 0})
    return updated


@router.post("/creatives/validate")
async def validate_creative(creative_data: dict):
    """Validate creative data"""
    issues = []
    warnings = []
    
    creative_type = creative_data.get("type")
    
    if creative_type == "banner":
        banner = creative_data.get("banner_data", {})
        if not banner.get("width") or not banner.get("height"):
            issues.append("Banner dimensions are required")
        if not banner.get("image_url"):
            issues.append("Banner image URL is required")
        
        # Check for common sizes
        common_sizes = [(300, 250), (728, 90), (160, 600), (320, 50), (300, 600)]
        size = (banner.get("width"), banner.get("height"))
        if size not in common_sizes:
            warnings.append(f"Banner size {size} is not a standard IAB size")
    
    elif creative_type == "video":
        video = creative_data.get("video_data", {})
        if not video.get("vast_url") and not video.get("video_url"):
            issues.append("Video URL or VAST tag is required")
        if not video.get("duration"):
            warnings.append("Video duration not specified")
    
    elif creative_type == "native":
        native = creative_data.get("native_data", {})
        if not native.get("title"):
            issues.append("Native ad title is required")
        if not native.get("image_url"):
            warnings.append("Native ad main image recommended")
    
    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "warnings": warnings
    }

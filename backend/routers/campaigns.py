"""
Campaign management endpoints - CRUD operations, status changes
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime, timezone

from models import Campaign, CampaignCreate, CampaignUpdate, CampaignStatus
from routers.shared import db

router = APIRouter(tags=["Campaigns"])


@router.get("/campaigns", response_model=List[Campaign])
async def get_campaigns(status: Optional[str] = None):
    """Get all campaigns"""
    query = {}
    if status:
        query["status"] = status
    
    campaigns = await db.campaigns.find(query, {"_id": 0}).to_list(1000)
    
    # Parse datetime strings
    for campaign in campaigns:
        for field in ["created_at", "updated_at", "start_date", "end_date"]:
            if campaign.get(field) and isinstance(campaign[field], str):
                try:
                    campaign[field] = datetime.fromisoformat(campaign[field].replace('Z', '+00:00'))
                except (ValueError, TypeError):
                    pass
    
    return campaigns


@router.get("/campaigns/{campaign_id}", response_model=Campaign)
async def get_campaign(campaign_id: str):
    """Get a single campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.post("/campaigns", response_model=Campaign)
async def create_campaign(input: CampaignCreate):
    """Create a new campaign"""
    # Verify creative exists
    creative = await db.creatives.find_one({"id": input.creative_id}, {"_id": 0})
    if not creative:
        raise HTTPException(status_code=400, detail="Creative not found")
    
    campaign = Campaign(
        name=input.name,
        bid_price=input.bid_price,
        bid_floor=input.bid_floor,
        currency=input.currency,
        priority=input.priority,
        placements=input.placements,
        creative_id=input.creative_id,
        budget=input.budget,
        bid_shading=input.bid_shading,
        frequency_cap=input.frequency_cap,
        spo=input.spo,
        ml_prediction=input.ml_prediction,
        targeting=input.targeting,
        status=CampaignStatus.DRAFT
    )
    
    if input.start_date:
        campaign.start_date = datetime.fromisoformat(input.start_date)
    if input.end_date:
        campaign.end_date = datetime.fromisoformat(input.end_date)
    
    doc = campaign.model_dump()
    # Serialize datetimes
    for field in ["created_at", "updated_at", "start_date", "end_date"]:
        if doc.get(field):
            doc[field] = doc[field].isoformat()
    
    await db.campaigns.insert_one(doc)
    return campaign


@router.put("/campaigns/{campaign_id}", response_model=Campaign)
async def update_campaign(campaign_id: str, input: CampaignUpdate):
    """Update a campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    update_data = input.model_dump(exclude_unset=True)
    
    if "creative_id" in update_data:
        creative = await db.creatives.find_one({"id": update_data["creative_id"]}, {"_id": 0})
        if not creative:
            raise HTTPException(status_code=400, detail="Creative not found")
    
    # Handle datetime fields
    for field in ["start_date", "end_date"]:
        if field in update_data and update_data[field]:
            try:
                update_data[field] = datetime.fromisoformat(update_data[field]).isoformat()
            except (ValueError, TypeError):
                pass
    
    # Handle nested objects
    nested_fields = ["budget", "targeting", "bid_shading", "frequency_cap", "spo", "ml_prediction"]
    for field in nested_fields:
        if field in update_data and update_data[field]:
            update_data[field] = update_data[field].model_dump() if hasattr(update_data[field], 'model_dump') else update_data[field]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": update_data}
    )
    
    updated = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    return updated


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str):
    """Delete a campaign"""
    result = await db.campaigns.delete_one({"id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"status": "deleted"}


@router.post("/campaigns/{campaign_id}/activate")
async def activate_campaign(campaign_id: str):
    """Activate a campaign"""
    result = await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"status": "active"}


@router.post("/campaigns/{campaign_id}/pause")
async def pause_campaign(campaign_id: str):
    """Pause a campaign"""
    result = await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"status": "paused", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"status": "paused"}


@router.post("/campaigns/{campaign_id}/reset-daily-spend")
async def reset_daily_spend(campaign_id: str):
    """Reset daily spend for a campaign"""
    result = await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"budget.daily_spent": 0, "budget.last_reset": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"status": "reset", "daily_spent": 0}


@router.post("/campaigns/{campaign_id}/duplicate")
async def duplicate_campaign(campaign_id: str):
    """Duplicate a campaign with a new ID"""
    import uuid
    
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Create new campaign with copied data
    new_id = str(uuid.uuid4())
    new_campaign = campaign.copy()
    new_campaign["id"] = new_id
    new_campaign["name"] = f"{campaign['name']} (Copy)"
    new_campaign["status"] = "draft"
    new_campaign["bids"] = 0
    new_campaign["wins"] = 0
    new_campaign["created_at"] = datetime.now(timezone.utc).isoformat()
    new_campaign["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Reset budget spent
    if "budget" in new_campaign and new_campaign["budget"]:
        new_campaign["budget"]["daily_spent"] = 0
        new_campaign["budget"]["total_spent"] = 0
    
    await db.campaigns.insert_one(new_campaign)
    
    # Remove _id from response
    new_campaign.pop("_id", None)
    return new_campaign


@router.post("/campaigns/bulk/activate")
async def bulk_activate_campaigns(campaign_ids: List[str]):
    """Activate multiple campaigns"""
    result = await db.campaigns.update_many(
        {"id": {"$in": campaign_ids}},
        {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"updated": result.modified_count}


@router.post("/campaigns/bulk/pause")
async def bulk_pause_campaigns(campaign_ids: List[str]):
    """Pause multiple campaigns"""
    result = await db.campaigns.update_many(
        {"id": {"$in": campaign_ids}},
        {"$set": {"status": "paused", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"updated": result.modified_count}


@router.post("/campaigns/bulk/delete")
async def bulk_delete_campaigns(campaign_ids: List[str]):
    """Delete multiple campaigns"""
    result = await db.campaigns.delete_many({"id": {"$in": campaign_ids}})
    return {"deleted": result.deleted_count}


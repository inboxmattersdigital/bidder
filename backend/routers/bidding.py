"""
Bidding endpoints - OpenRTB bid handling, SSP management, notifications, bid logs
"""
from fastapi import APIRouter, HTTPException, Header, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import time
import os
import asyncio
import json

from models import (
    SSPEndpoint, SSPEndpointCreate, BidLog,
    OPENRTB_MIGRATION_MATRIX
)
from routers.shared import db, logger, ws_manager
from openrtb_handler import BiddingEngine

router = APIRouter(tags=["Bidding"])
bid_router = APIRouter(tags=["Bid Endpoint"])

# Initialize bidding engine
bidding_engine = BiddingEngine(db)

# Recent bids for streaming
recent_bids = []
MAX_RECENT_BIDS = 100

# Global counters for real-time stats (in-memory, resets on restart)
bid_stream_stats = {
    "total_requests": 0,
    "total_bids": 0,
    "total_no_bids": 0
}


async def broadcast_new_bid(bid_data: dict):
    """Broadcast new bid to all connected WebSocket clients with stats"""
    await ws_manager.broadcast({
        "type": "new_bid",
        "bid": bid_data,
        "stats": bid_stream_stats.copy()
    })


# ==================== SSP ENDPOINT MANAGEMENT ====================

@router.get("/ssp-endpoints", response_model=List[SSPEndpoint])
async def get_ssp_endpoints():
    """Get all SSP endpoints"""
    endpoints = await db.ssp_endpoints.find({}, {"_id": 0}).to_list(100)
    return endpoints


@router.post("/ssp-endpoints", response_model=SSPEndpoint)
async def create_ssp_endpoint(input: SSPEndpointCreate):
    """Create a new SSP endpoint"""
    endpoint = SSPEndpoint(
        name=input.name,
        description=input.description,
        ortb_version=input.ortb_version
    )
    
    doc = endpoint.model_dump()
    for field in ["created_at", "updated_at"]:
        if doc.get(field):
            doc[field] = doc[field].isoformat()
    
    await db.ssp_endpoints.insert_one(doc)
    return endpoint


@router.delete("/ssp-endpoints/{endpoint_id}")
async def delete_ssp_endpoint(endpoint_id: str):
    """Delete an SSP endpoint"""
    result = await db.ssp_endpoints.delete_one({"id": endpoint_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    return {"status": "deleted"}


@router.put("/ssp-endpoints/{endpoint_id}/status")
async def update_ssp_status(endpoint_id: str, status: str):
    """Update SSP endpoint status"""
    if status not in ["active", "inactive"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.ssp_endpoints.update_one(
        {"id": endpoint_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    
    return {"status": status}


@router.get("/ssp-endpoints/{endpoint_id}/endpoint-url")
async def get_ssp_endpoint_url(endpoint_id: str, request: Request):
    """Get the unique bid endpoint URL for an SSP"""
    endpoint = await db.ssp_endpoints.find_one({"id": endpoint_id}, {"_id": 0})
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    
    base_url = os.environ.get('REACT_APP_BACKEND_URL', str(request.base_url).rstrip('/'))
    
    return {
        "endpoint_url": f"{base_url}/api/bid/{endpoint.get('endpoint_token')}",
        "generic_url": f"{base_url}/api/bid",
        "endpoint_token": endpoint.get("endpoint_token"),
        "ortb_version": endpoint.get("ortb_version", "2.5")
    }


@router.post("/ssp-endpoints/{endpoint_id}/regenerate-token")
async def regenerate_endpoint_token(endpoint_id: str):
    """Regenerate the unique endpoint token for an SSP"""
    new_token = uuid.uuid4().hex[:16]
    
    result = await db.ssp_endpoints.update_one(
        {"id": endpoint_id},
        {"$set": {"endpoint_token": new_token, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    
    return {"endpoint_token": new_token}


# ==================== BID LOGS ====================

@router.get("/bid-logs")
async def get_bid_logs(limit: int = 50, offset: int = 0):
    """Get bid logs with pagination"""
    logs = await db.bid_logs.find(
        {},
        {"_id": 0}
    ).sort("timestamp", -1).skip(offset).limit(limit).to_list(limit)
    
    total = await db.bid_logs.count_documents({})
    
    return {
        "logs": logs,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/bid-logs/{log_id}")
async def get_bid_log(log_id: str):
    """Get a single bid log"""
    log = await db.bid_logs.find_one({"id": log_id}, {"_id": 0})
    if not log:
        raise HTTPException(status_code=404, detail="Bid log not found")
    return log


# ==================== BID STREAM ====================

@router.get("/bid-stream")
async def get_bid_stream(limit: int = 20):
    """Get recent bids for the bid stream"""
    return recent_bids[-limit:]


@router.get("/bid-stream/stats")
async def get_bid_stream_stats(force_refresh: bool = False):
    """Get bid stream statistics - syncs from DB if counters are 0 or force_refresh is True"""
    global bid_stream_stats
    
    # Force refresh or sync from database if counters are 0 (server restart scenario)
    if force_refresh or bid_stream_stats["total_requests"] == 0:
        # Get totals from ssp_endpoints
        endpoints = await db.ssp_endpoints.find({}, {"_id": 0, "total_requests": 1, "total_bids": 1}).to_list(100)
        total_requests = sum(e.get("total_requests", 0) for e in endpoints)
        total_bids = sum(e.get("total_bids", 0) for e in endpoints)
        
        bid_stream_stats["total_requests"] = total_requests
        bid_stream_stats["total_bids"] = total_bids
        bid_stream_stats["total_no_bids"] = total_requests - total_bids
    
    return bid_stream_stats


@router.websocket("/ws/bid-stream")
async def websocket_bid_stream(websocket: WebSocket):
    """WebSocket endpoint for real-time bid stream"""
    global bid_stream_stats
    
    await ws_manager.connect(websocket)
    try:
        # If counters are 0, sync from database (server restart scenario)
        if bid_stream_stats["total_requests"] == 0:
            endpoints = await db.ssp_endpoints.find({}, {"_id": 0, "total_requests": 1, "total_bids": 1}).to_list(100)
            total_requests = sum(e.get("total_requests", 0) for e in endpoints)
            total_bids = sum(e.get("total_bids", 0) for e in endpoints)
            
            if total_requests > 0:
                bid_stream_stats["total_requests"] = total_requests
                bid_stream_stats["total_bids"] = total_bids
                bid_stream_stats["total_no_bids"] = total_requests - total_bids
        
        # Send recent bids and stats on connection
        await websocket.send_json({
            "type": "initial",
            "bids": recent_bids[-20:],
            "stats": bid_stream_stats.copy()
        })
        
        # Keep connection alive
        while True:
            try:
                # Wait for ping/pong or messages
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                msg = json.loads(data) if data.startswith('{') else {"type": data}
                
                if msg.get("type") == "ping" or data == "ping":
                    await websocket.send_text("pong")
                elif msg.get("type") == "get_recent":
                    limit = msg.get("limit", 50)
                    await websocket.send_json({
                        "type": "recent",
                        "bids": recent_bids[-limit:],
                        "stats": bid_stream_stats.copy()
                    })
            except asyncio.TimeoutError:
                # Send heartbeat with current stats
                await websocket.send_json({
                    "type": "heartbeat",
                    "stats": bid_stream_stats.copy()
                })
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)


# ==================== OpenRTB BID ENDPOINT ====================

async def _process_bid_request_internal(
    request: Request,
    x_openrtb_version: str = None,
    ssp_id: str = None
):
    """Internal bid request processor - shared logic for all bid endpoints"""
    global recent_bids
    
    try:
        bid_request = await request.json()
    except Exception as e:
        logger.error(f"Failed to parse bid request: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    # Build headers dict for version detection
    headers = {}
    if x_openrtb_version:
        headers["x-openrtb-version"] = x_openrtb_version
    
    # Get base URL for nurl/burl callbacks
    # Check for X-Forwarded-Proto header (set by reverse proxy) or fallback to request scheme
    scheme = request.headers.get('x-forwarded-proto', request.base_url.scheme)
    host = request.headers.get('host', '')
    nurl_base = os.environ.get('NURL_BASE_URL', f"{scheme}://{host}")
    
    # Process bid request
    try:
        response, log_data = await bidding_engine.process_bid_request(
            bid_request,
            headers=headers,
            ssp_id=ssp_id,
            nurl_base=nurl_base
        )
    except Exception as e:
        logger.error(f"Bid processing error: {e}")
        raise HTTPException(status_code=500, detail="Bid processing failed")
    
    # Save bid log with SSP info
    log_data["ssp_id"] = ssp_id
    log = BidLog(**log_data)
    log_doc = log.model_dump()
    log_doc["timestamp"] = log_doc["timestamp"].isoformat()
    await db.bid_logs.insert_one(log_doc)
    
    # Update global in-memory counters for real-time stats
    global bid_stream_stats
    bid_stream_stats["total_requests"] += 1
    if log_data.get("bid_made"):
        bid_stream_stats["total_bids"] += 1
    else:
        bid_stream_stats["total_no_bids"] += 1
    
    # Update SSP stats
    if ssp_id:
        await db.ssp_endpoints.update_one(
            {"id": ssp_id},
            {"$inc": {"total_requests": 1}}
        )
        if log_data.get("bid_made"):
            await db.ssp_endpoints.update_one(
                {"id": ssp_id},
                {"$inc": {"total_bids": 1}}
            )
    
    # Update campaign stats if bid was made
    if log_data.get("bid_made") and log_data.get("campaign_id"):
        await db.campaigns.update_one(
            {"id": log_data["campaign_id"]},
            {"$inc": {"bids": 1}}
        )
    
    # Add to real-time bid stream
    stream_entry = {
        "id": log_data.get("id"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "bid_made": log_data.get("bid_made", False),
        "campaign_name": log_data.get("campaign_name"),
        "bid_price": log_data.get("bid_price"),
        "ssp_id": ssp_id,
        "device_type": bid_request.get("device", {}).get("devicetype"),
        "geo_country": bid_request.get("device", {}).get("geo", {}).get("country"),
        "domain": bid_request.get("site", {}).get("domain") or bid_request.get("app", {}).get("bundle")
    }
    recent_bids.append(stream_entry)
    if len(recent_bids) > MAX_RECENT_BIDS:
        recent_bids = recent_bids[-MAX_RECENT_BIDS:]
    
    # Broadcast to WebSocket clients
    asyncio.create_task(broadcast_new_bid(stream_entry))
    
    # Return no-bid (204) or bid response (200)
    if not log_data.get("bid_made"):
        return Response(status_code=204)
    
    return JSONResponse(content=response, status_code=200)


@bid_router.post("/{endpoint_token}")
async def handle_bid_request_by_token(
    request: Request,
    endpoint_token: str,
    x_openrtb_version: str = Header(None)
):
    """Handle OpenRTB bid requests for a specific SSP by unique token"""
    start_time = time.time()
    
    # Look up SSP by endpoint_token
    endpoint = await db.ssp_endpoints.find_one(
        {"endpoint_token": endpoint_token},
        {"_id": 0}
    )
    
    if not endpoint:
        raise HTTPException(status_code=404, detail="SSP endpoint not found")
    
    if endpoint.get("status") != "active":
        raise HTTPException(status_code=403, detail="SSP endpoint is inactive")
    
    # Process the bid request
    response = await _process_bid_request_internal(request, x_openrtb_version, endpoint.get("id"))
    
    # Update performance metrics (only response time, request count is handled in _process_bid_request_internal)
    response_time_ms = (time.time() - start_time) * 1000
    await db.ssp_endpoints.update_one(
        {"id": endpoint.get("id")},
        {"$set": {"last_request_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Update avg response time (rolling average)
    current_avg = endpoint.get("avg_response_time_ms", 0)
    total_reqs = endpoint.get("total_requests", 0)
    if total_reqs > 0:
        new_avg = ((current_avg * (total_reqs - 1)) + response_time_ms) / total_reqs
        await db.ssp_endpoints.update_one(
            {"id": endpoint.get("id")},
            {"$set": {"avg_response_time_ms": round(new_avg, 2)}}
        )
    
    return response


@bid_router.post("")
@bid_router.post("/")
async def handle_bid_request(
    request: Request,
    x_openrtb_version: str = Header(None)
):
    """Handle OpenRTB bid requests from SSPs (generic endpoint)"""
    return await _process_bid_request_internal(request, x_openrtb_version, None)


# ==================== WIN/BILLING NOTIFICATIONS ====================

async def adjust_bid_shading(campaign_id: str, current_win_rate: float, shading_config: dict):
    """Adjust bid shading factor based on win rate"""
    if not shading_config.get("enabled", False):
        return
    
    target_win_rate = shading_config.get("target_win_rate", 0.3)
    learning_rate = shading_config.get("learning_rate", 0.1)
    current_factor = shading_config.get("current_shade_factor", 0.85)
    min_factor = shading_config.get("min_shade_factor", 0.5)
    max_factor = shading_config.get("max_shade_factor", 0.95)
    
    rate_diff = current_win_rate - target_win_rate
    adjustment = -rate_diff * learning_rate
    
    new_factor = current_factor + adjustment
    new_factor = max(min_factor, min(max_factor, new_factor))
    
    await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"bid_shading.current_shade_factor": new_factor}}
    )


@router.api_route("/notify/win/{bid_id}", methods=["GET", "POST"])
async def win_notification(bid_id: str, price: float = 0.0):
    """Handle win notification (nurl callback) - Supports both GET and POST"""
    # First try to find by bid_id field
    bid_log = await db.bid_logs.find_one({"bid_id": bid_id}, {"_id": 0})
    if not bid_log:
        # Fallback to id field
        bid_log = await db.bid_logs.find_one({"id": bid_id}, {"_id": 0})
    if not bid_log:
        # Fallback to request_id
        bid_log = await db.bid_logs.find_one(
            {"request_id": bid_id, "bid_made": True},
            {"_id": 0}
        )
    
    if not bid_log:
        raise HTTPException(status_code=404, detail="Bid not found")
    
    if bid_log.get("win_notified"):
        return {"status": "already_notified", "bid_id": bid_id}
    
    campaign_id = bid_log.get("campaign_id")
    ssp_id = bid_log.get("ssp_id")
    bid_price = bid_log.get("shaded_price") or bid_log.get("bid_price", 0)
    
    win_price = price if price > 0 else bid_price
    
    await db.bid_logs.update_one(
        {"id": bid_log["id"]},
        {"$set": {"win_notified": True, "win_price": win_price}}
    )
    
    if campaign_id:
        impression_cost = win_price / 1000
        
        await db.campaigns.update_one(
            {"id": campaign_id},
            {
                "$inc": {
                    "wins": 1,
                    "impressions": 1,
                    "budget.daily_spend": impression_cost,
                    "budget.total_spend": impression_cost
                }
            }
        )
        
        campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
        if campaign:
            total_bids = campaign.get("bids", 1)
            total_wins = campaign.get("wins", 0)
            new_win_rate = total_wins / max(total_bids, 1)
            
            old_avg = campaign.get("avg_win_price", 0)
            new_avg = (old_avg * (total_wins - 1) + win_price) / total_wins if total_wins > 0 else win_price
            
            await db.campaigns.update_one(
                {"id": campaign_id},
                {"$set": {"recent_win_rate": new_win_rate, "avg_win_price": new_avg}}
            )
            
            await adjust_bid_shading(campaign_id, new_win_rate, campaign.get("bid_shading", {}))
    
    if ssp_id:
        impression_cost = win_price / 1000
        await db.ssp_endpoints.update_one(
            {"id": ssp_id},
            {"$inc": {"total_wins": 1, "total_impressions": 1, "total_spend": impression_cost}}
        )
    
    logger.info(f"Win notification processed: bid_id={bid_id}, price={win_price}, campaign={campaign_id}, ssp={ssp_id}")
    
    return {"status": "success", "bid_id": bid_id, "win_price": win_price, "campaign_id": campaign_id}


@router.api_route("/notify/billing/{bid_id}", methods=["GET", "POST"])
async def billing_notification(bid_id: str, price: float = 0.0):
    """Handle billing notification (burl callback) - Supports both GET and POST"""
    # First try to find by bid_id field
    bid_log = await db.bid_logs.find_one({"bid_id": bid_id}, {"_id": 0})
    if not bid_log:
        # Fallback to id field
        bid_log = await db.bid_logs.find_one({"id": bid_id}, {"_id": 0})
    if not bid_log:
        # Fallback to request_id
        bid_log = await db.bid_logs.find_one(
            {"request_id": bid_id, "bid_made": True},
            {"_id": 0}
        )
    
    if not bid_log:
        raise HTTPException(status_code=404, detail="Bid not found")
    
    if bid_log.get("billing_notified"):
        return {"status": "already_notified", "bid_id": bid_id}
    
    # Get campaign and SSP info for updating stats
    campaign_id = bid_log.get("campaign_id")
    ssp_id = bid_log.get("ssp_id")
    
    await db.bid_logs.update_one(
        {"id": bid_log["id"]},
        {"$set": {"billing_notified": True}}
    )
    
    # Update SSP total_impressions (burl = actual ad render = impression)
    if ssp_id:
        await db.ssp_endpoints.update_one(
            {"id": ssp_id},
            {"$inc": {"total_impressions": 1}}
        )
    
    logger.info(f"Billing notification processed: bid_id={bid_id}, campaign_id={campaign_id}, ssp_id={ssp_id}")
    
    return {"status": "success", "bid_id": bid_id, "campaign_id": campaign_id}


# ==================== IMPRESSION TRACKING ====================

@router.get("/pixel/{bid_id}")
async def impression_pixel(bid_id: str, price: float = 0.0):
    """
    Impression tracking pixel - embed this in your creative ad markup.
    Returns a 1x1 transparent GIF.
    
    Usage in creative HTML:
    <img src="https://your-domain/api/pixel/{bid_id}?price={win_price}" width="1" height="1" style="display:none" />
    """
    # First try to find by bid_id field
    bid_log = await db.bid_logs.find_one({"bid_id": bid_id}, {"_id": 0})
    if not bid_log:
        bid_log = await db.bid_logs.find_one({"id": bid_id}, {"_id": 0})
    
    if bid_log and not bid_log.get("impression_tracked"):
        campaign_id = bid_log.get("campaign_id")
        ssp_id = bid_log.get("ssp_id")
        
        # Mark impression as tracked
        await db.bid_logs.update_one(
            {"id": bid_log["id"]},
            {"$set": {"impression_tracked": True, "impression_time": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Update campaign impressions if not already counted via nurl
        if campaign_id and not bid_log.get("win_notified"):
            await db.campaigns.update_one(
                {"id": campaign_id},
                {"$inc": {"impressions": 1}}
            )
        
        # Update SSP impressions
        if ssp_id and not bid_log.get("win_notified"):
            await db.ssp_endpoints.update_one(
                {"id": ssp_id},
                {"$inc": {"total_impressions": 1}}
            )
        
        logger.info(f"Impression tracked via pixel: bid_id={bid_id}, campaign={campaign_id}")
    
    # Return 1x1 transparent GIF
    gif_data = b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;'
    return Response(content=gif_data, media_type="image/gif")


@router.api_route("/track/impression", methods=["GET", "POST"])
async def track_impression(bid_id: str = None, campaign_id: str = None, ssp_id: str = None, price: float = 0.0):
    """
    Alternative impression tracking endpoint for server-to-server calls.
    Supports both GET and POST methods.
    Can be called with just campaign_id if bid_id is not available.
    """
    if bid_id:
        # Try to find the bid log
        bid_log = await db.bid_logs.find_one({"bid_id": bid_id}, {"_id": 0})
        if not bid_log:
            bid_log = await db.bid_logs.find_one({"id": bid_id}, {"_id": 0})
        
        if bid_log:
            campaign_id = bid_log.get("campaign_id") or campaign_id
            ssp_id = bid_log.get("ssp_id") or ssp_id
            
            await db.bid_logs.update_one(
                {"id": bid_log["id"]},
                {"$set": {"impression_tracked": True}}
            )
    
    result = {"status": "success", "bid_id": bid_id}
    
    if campaign_id:
        await db.campaigns.update_one(
            {"id": campaign_id},
            {"$inc": {"impressions": 1}}
        )
        result["campaign_id"] = campaign_id
    
    if ssp_id:
        await db.ssp_endpoints.update_one(
            {"id": ssp_id},
            {"$inc": {"total_impressions": 1}}
        )
        result["ssp_id"] = ssp_id
    
    logger.info(f"Impression tracked: bid_id={bid_id}, campaign={campaign_id}, ssp={ssp_id}")
    return result


@router.post("/track/bulk-impressions")
async def track_bulk_impressions(impressions: List[dict]):
    """
    Bulk impression tracking for batch processing.
    
    Request body:
    [
        {"campaign_id": "xxx", "count": 100, "ssp_id": "yyy"},
        {"campaign_id": "zzz", "count": 50}
    ]
    """
    results = []
    
    for imp in impressions:
        campaign_id = imp.get("campaign_id")
        ssp_id = imp.get("ssp_id")
        count = imp.get("count", 1)
        
        if campaign_id:
            await db.campaigns.update_one(
                {"id": campaign_id},
                {"$inc": {"impressions": count}}
            )
        
        if ssp_id:
            await db.ssp_endpoints.update_one(
                {"id": ssp_id},
                {"$inc": {"total_impressions": count}}
            )
        
        results.append({
            "campaign_id": campaign_id,
            "ssp_id": ssp_id,
            "count": count,
            "status": "success"
        })
    
    logger.info(f"Bulk impressions tracked: {len(impressions)} records")
    return {"status": "success", "results": results}


# ==================== MIGRATION MATRIX ====================

@router.get("/migration-matrix")
async def get_migration_matrix():
    """Get OpenRTB 2.5 to 2.6 field migration matrix"""
    return OPENRTB_MIGRATION_MATRIX

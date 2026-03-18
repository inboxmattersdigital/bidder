"""
Misc endpoints - Insights, Currencies, Comparison, A/B Testing, Audiences, Uploads
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from pathlib import Path
import uuid
import shutil
import os

from routers.shared import db

router = APIRouter(tags=["Miscellaneous"])


# Create uploads directory
UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


# ==================== CURRENCY ====================

CURRENCY_RATES = {
    "USD": 1.0,
    "EUR": 0.92,
    "GBP": 0.79,
    "CAD": 1.36,
    "AUD": 1.53,
    "JPY": 149.5
}

CURRENCY_SYMBOLS = {
    "USD": "$",
    "EUR": "€",
    "GBP": "£",
    "CAD": "C$",
    "AUD": "A$",
    "JPY": "¥"
}


@router.get("/currencies")
async def get_supported_currencies():
    """Get list of supported currencies with conversion rates"""
    return {
        "base_currency": "USD",
        "currencies": [
            {"code": code, "symbol": CURRENCY_SYMBOLS.get(code, code), "rate": rate}
            for code, rate in CURRENCY_RATES.items()
        ]
    }


@router.get("/currency/convert")
async def convert_currency(amount: float, from_currency: str = "USD", to_currency: str = "USD"):
    """Convert amount between currencies"""
    if from_currency not in CURRENCY_RATES or to_currency not in CURRENCY_RATES:
        raise HTTPException(status_code=400, detail="Unsupported currency")
    
    usd_amount = amount / CURRENCY_RATES[from_currency]
    converted = usd_amount * CURRENCY_RATES[to_currency]
    
    return {
        "original": {"amount": amount, "currency": from_currency},
        "converted": {"amount": round(converted, 2), "currency": to_currency},
        "rate": CURRENCY_RATES[to_currency] / CURRENCY_RATES[from_currency]
    }


# ==================== CAMPAIGN COMPARISON ====================

class CampaignCompareRequest(BaseModel):
    campaign_ids: List[str]


@router.post("/campaigns/compare")
async def compare_campaigns(request: CampaignCompareRequest):
    """Compare 2-3 campaigns side by side"""
    campaign_ids = request.campaign_ids
    if len(campaign_ids) < 2 or len(campaign_ids) > 3:
        raise HTTPException(status_code=400, detail="Select 2-3 campaigns to compare")
    
    campaigns = []
    for cid in campaign_ids:
        campaign = await db.campaigns.find_one({"id": cid}, {"_id": 0})
        if campaign:
            campaigns.append(campaign)
    
    if len(campaigns) < 2:
        raise HTTPException(status_code=404, detail="One or more campaigns not found")
    
    comparison = {
        "campaigns": campaigns,
        "metrics_comparison": {},
        "targeting_differences": {},
        "recommendations": []
    }
    
    metrics = ["bids", "wins", "impressions", "clicks", "bid_price"]
    for metric in metrics:
        values = [c.get(metric, 0) for c in campaigns]
        comparison["metrics_comparison"][metric] = {
            "values": values,
            "best": campaign_ids[values.index(max(values))] if max(values) > 0 else None,
            "diff_pct": round((max(values) - min(values)) / max(values) * 100, 2) if max(values) > 0 else 0
        }
    
    win_rates = []
    for c in campaigns:
        bids = c.get("bids", 0)
        wins = c.get("wins", 0)
        win_rates.append(round(wins / bids * 100, 2) if bids > 0 else 0)
    comparison["metrics_comparison"]["win_rate"] = {
        "values": win_rates,
        "best": campaign_ids[win_rates.index(max(win_rates))] if max(win_rates) > 0 else None
    }
    
    targeting_fields = ["geo.countries", "device.device_types", "inventory.categories"]
    for field in targeting_fields:
        parts = field.split(".")
        values = []
        for c in campaigns:
            val = c.get("targeting", {})
            for p in parts:
                val = val.get(p, []) if isinstance(val, dict) else []
            values.append(set(val) if isinstance(val, list) else set())
        
        common = set.intersection(*values) if values else set()
        unique = [v - common for v in values]
        comparison["targeting_differences"][field] = {
            "common": list(common),
            "unique": [list(u) for u in unique]
        }
    
    if comparison["metrics_comparison"]["win_rate"]["values"]:
        best_idx = win_rates.index(max(win_rates))
        worst_idx = win_rates.index(min(win_rates))
        if best_idx != worst_idx:
            comparison["recommendations"].append({
                "type": "win_rate",
                "message": f"Consider adopting targeting from '{campaigns[best_idx]['name']}' for '{campaigns[worst_idx]['name']}'"
            })
    
    return comparison


# ==================== A/B TESTING ====================

class ABTestCreate(BaseModel):
    name: str
    campaign_ids: List[str]
    traffic_split: Optional[List[float]] = None


@router.post("/ab-tests")
async def create_ab_test(data: ABTestCreate):
    """Create an A/B test between campaigns"""
    if len(data.campaign_ids) < 2 or len(data.campaign_ids) > 4:
        raise HTTPException(status_code=400, detail="Select 2-4 campaigns for A/B test")
    
    traffic_split = data.traffic_split
    if traffic_split is None:
        traffic_split = [100 / len(data.campaign_ids)] * len(data.campaign_ids)
    
    if len(traffic_split) != len(data.campaign_ids) or abs(sum(traffic_split) - 100) > 0.1:
        raise HTTPException(status_code=400, detail="Traffic split must add up to 100%")
    
    campaigns = []
    for cid in data.campaign_ids:
        campaign = await db.campaigns.find_one({"id": cid}, {"_id": 0, "id": 1, "name": 1})
        if not campaign:
            raise HTTPException(status_code=404, detail=f"Campaign {cid} not found")
        campaigns.append(campaign)
    
    ab_test = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "status": "active",
        "campaign_ids": data.campaign_ids,
        "campaign_names": [c["name"] for c in campaigns],
        "traffic_split": traffic_split,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "stats": {cid: {"impressions": 0, "clicks": 0, "conversions": 0} for cid in data.campaign_ids}
    }
    
    await db.ab_tests.insert_one(ab_test)
    if "_id" in ab_test:
        del ab_test["_id"]
    
    return ab_test


@router.get("/ab-tests")
async def get_ab_tests():
    """Get all A/B tests"""
    tests = await db.ab_tests.find({}, {"_id": 0}).to_list(100)
    return {"tests": tests}


@router.get("/ab-tests/{test_id}")
async def get_ab_test(test_id: str):
    """Get A/B test details with performance data"""
    test = await db.ab_tests.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="A/B test not found")
    
    for cid in test["campaign_ids"]:
        campaign = await db.campaigns.find_one({"id": cid}, {"_id": 0})
        if campaign:
            bids = campaign.get("bids", 0)
            wins = campaign.get("wins", 0)
            test["stats"][cid]["bids"] = bids
            test["stats"][cid]["wins"] = wins
            test["stats"][cid]["win_rate"] = round(wins / bids * 100, 2) if bids > 0 else 0
    
    winner = None
    best_metric = 0
    for cid, stats in test["stats"].items():
        if stats.get("win_rate", 0) > best_metric:
            best_metric = stats["win_rate"]
            winner = cid
    
    test["winner"] = winner
    test["winner_name"] = None
    if winner:
        for idx, cid in enumerate(test["campaign_ids"]):
            if cid == winner:
                test["winner_name"] = test["campaign_names"][idx]
                break
    
    return test


@router.delete("/ab-tests/{test_id}")
async def delete_ab_test(test_id: str):
    """Delete an A/B test"""
    result = await db.ab_tests.delete_one({"id": test_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="A/B test not found")
    return {"status": "deleted"}


# ==================== AUDIENCES ====================

class AudienceCreate(BaseModel):
    name: str
    description: str = ""
    rules: dict = {}


@router.post("/audiences")
async def create_audience(data: AudienceCreate):
    """Create an audience segment"""
    audience = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "description": data.description,
        "rules": data.rules,
        "user_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.audiences.insert_one(audience)
    if "_id" in audience:
        del audience["_id"]
    
    return audience


@router.get("/audiences")
async def get_audiences():
    """Get all audience segments"""
    audiences = await db.audiences.find({}, {"_id": 0}).to_list(100)
    return {"audiences": audiences}


@router.get("/audiences/{audience_id}")
async def get_audience(audience_id: str):
    """Get audience segment details"""
    audience = await db.audiences.find_one({"id": audience_id}, {"_id": 0})
    if not audience:
        raise HTTPException(status_code=404, detail="Audience not found")
    return audience


@router.delete("/audiences/{audience_id}")
async def delete_audience(audience_id: str):
    """Delete audience segment"""
    result = await db.audiences.delete_one({"id": audience_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Audience not found")
    return {"status": "deleted"}


# ==================== CAMPAIGN INSIGHTS ====================

@router.get("/insights/campaigns")
async def get_campaign_insights():
    """Analyze all campaigns and provide actionable insights"""
    campaigns = await db.campaigns.find({}, {"_id": 0}).to_list(1000)
    
    insights = []
    overall_health = {"healthy": 0, "warning": 0, "critical": 0}
    
    for campaign in campaigns:
        campaign_insight = {
            "campaign_id": campaign["id"],
            "campaign_name": campaign["name"],
            "status": campaign.get("status", "draft"),
            "health_score": 100,
            "health_status": "healthy",
            "issues": [],
            "recommendations": [],
            "metrics": {}
        }
        
        bids = campaign.get("bids", 0)
        wins = campaign.get("wins", 0)
        impressions = campaign.get("impressions", 0)
        clicks = campaign.get("clicks", 0)
        
        win_rate = (wins / bids * 100) if bids > 0 else 0
        ctr = (clicks / impressions * 100) if impressions > 0 else 0
        
        campaign_insight["metrics"] = {
            "bids": bids,
            "wins": wins,
            "impressions": impressions,
            "clicks": clicks,
            "win_rate": round(win_rate, 2),
            "ctr": round(ctr, 2)
        }
        
        # Analyze issues
        if campaign.get("status") == "active" and bids == 0:
            campaign_insight["issues"].append({
                "severity": "critical",
                "message": "Active campaign has no bids - check targeting or SSP connections"
            })
            campaign_insight["health_score"] -= 40
        
        if bids > 100 and win_rate < 5:
            campaign_insight["issues"].append({
                "severity": "warning",
                "message": f"Very low win rate ({win_rate:.1f}%) - consider increasing bid price"
            })
            campaign_insight["health_score"] -= 20
            campaign_insight["recommendations"].append("Increase bid price or enable bid optimization")
        
        if impressions > 1000 and ctr < 0.1:
            campaign_insight["issues"].append({
                "severity": "warning",
                "message": f"Very low CTR ({ctr:.2f}%) - review creative quality"
            })
            campaign_insight["health_score"] -= 15
            campaign_insight["recommendations"].append("Test new creative variations")
        
        budget = campaign.get("budget", {})
        if budget.get("daily_budget") and budget.get("daily_spend", 0) >= budget.get("daily_budget", 0):
            campaign_insight["issues"].append({
                "severity": "info",
                "message": "Daily budget exhausted"
            })
        
        # Determine health status
        if campaign_insight["health_score"] < 50:
            campaign_insight["health_status"] = "critical"
            overall_health["critical"] += 1
        elif campaign_insight["health_score"] < 80:
            campaign_insight["health_status"] = "warning"
            overall_health["warning"] += 1
        else:
            overall_health["healthy"] += 1
        
        insights.append(campaign_insight)
    
    insights.sort(key=lambda x: x["health_score"])
    
    return {
        "overall_health": overall_health,
        "campaigns": insights,
        "top_issues": [i for i in insights if i["health_status"] != "healthy"][:5]
    }


# ==================== FILE UPLOAD ====================

@router.post("/upload/image")
async def upload_image(file: UploadFile = File(...)):
    """Upload an image file for creative assets"""
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {allowed_types}")
    
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = UPLOAD_DIR / filename
    
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    base_url = os.environ.get('REACT_APP_BACKEND_URL', '')
    file_url = f"{base_url}/api/uploads/{filename}"
    
    return {
        "filename": filename,
        "url": file_url,
        "content_type": file.content_type,
        "size": filepath.stat().st_size
    }


@router.get("/uploads/{filename}")
async def get_uploaded_file(filename: str):
    """Serve uploaded files"""
    filepath = UPLOAD_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    ext = filename.split('.')[-1].lower()
    content_types = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "gif": "image/gif",
        "webp": "image/webp",
        "mp4": "video/mp4",
        "webm": "video/webm",
        "ogg": "video/ogg",
        "mov": "video/quicktime"
    }
    content_type = content_types.get(ext, "application/octet-stream")
    
    return FileResponse(filepath, media_type=content_type)


@router.delete("/uploads/{filename}")
async def delete_uploaded_file(filename: str):
    """Delete an uploaded file"""
    filepath = UPLOAD_DIR / filename
    if filepath.exists():
        filepath.unlink()
    return {"status": "deleted"}


# ==================== VIDEO UPLOAD ====================

@router.post("/upload/video")
async def upload_video(file: UploadFile = File(...)):
    """Upload a video file for creative assets"""
    allowed_types = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {allowed_types}")
    
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'mp4'
    filename = f"video_{uuid.uuid4().hex}.{ext}"
    filepath = UPLOAD_DIR / filename
    
    try:
        # Save video file
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = filepath.stat().st_size
        
        # Check file size (max 100MB)
        if file_size > 100 * 1024 * 1024:
            filepath.unlink()
            raise HTTPException(status_code=400, detail="Video file too large. Max 100MB allowed.")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    base_url = os.environ.get('REACT_APP_BACKEND_URL', '')
    file_url = f"{base_url}/api/uploads/{filename}"
    
    return {
        "filename": filename,
        "url": file_url,
        "content_type": file.content_type,
        "size": file_size
    }


@router.post("/upload/video/chunk")
async def upload_video_chunk(
    chunk: UploadFile = File(...),
    chunk_index: int = 0,
    total_chunks: int = 1,
    upload_id: str = "",
    filename: str = ""
):
    """Upload video in chunks for large files"""
    if not upload_id:
        upload_id = uuid.uuid4().hex
    
    # Create temp directory for chunks
    chunks_dir = UPLOAD_DIR / f"chunks_{upload_id}"
    chunks_dir.mkdir(exist_ok=True)
    
    # Save chunk
    chunk_path = chunks_dir / f"chunk_{chunk_index:04d}"
    try:
        with open(chunk_path, "wb") as buffer:
            shutil.copyfileobj(chunk.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save chunk: {str(e)}")
    
    # Check if all chunks uploaded
    uploaded_chunks = list(chunks_dir.glob("chunk_*"))
    
    if len(uploaded_chunks) == total_chunks:
        # Merge chunks
        ext = filename.split('.')[-1] if '.' in filename else 'mp4'
        final_filename = f"video_{upload_id}.{ext}"
        final_path = UPLOAD_DIR / final_filename
        
        try:
            with open(final_path, "wb") as final_file:
                for i in range(total_chunks):
                    chunk_file = chunks_dir / f"chunk_{i:04d}"
                    with open(chunk_file, "rb") as cf:
                        final_file.write(cf.read())
            
            # Clean up chunks
            for chunk_file in chunks_dir.glob("*"):
                chunk_file.unlink()
            chunks_dir.rmdir()
            
            file_size = final_path.stat().st_size
            base_url = os.environ.get('REACT_APP_BACKEND_URL', '')
            file_url = f"{base_url}/api/uploads/{final_filename}"
            
            return {
                "status": "complete",
                "filename": final_filename,
                "url": file_url,
                "size": file_size,
                "upload_id": upload_id
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to merge chunks: {str(e)}")
    
    return {
        "status": "uploading",
        "upload_id": upload_id,
        "chunks_received": len(uploaded_chunks),
        "total_chunks": total_chunks
    }


@router.post("/upload/audio")
async def upload_audio(file: UploadFile = File(...)):
    """Upload an audio file for creative assets"""
    allowed_types = ["audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav", "audio/aac", "audio/x-wav", "audio/x-m4a", "audio/mp4"]
    # Also check file extension for browsers that don't send correct MIME type
    allowed_extensions = [".mp3", ".ogg", ".wav", ".aac", ".m4a", ".mpeg"]
    
    file_ext = f".{file.filename.split('.')[-1].lower()}" if '.' in file.filename else ''
    
    if file.content_type not in allowed_types and file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: MP3, OGG, WAV, AAC, M4A")
    
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'mp3'
    filename = f"audio_{uuid.uuid4().hex}.{ext}"
    filepath = UPLOAD_DIR / filename
    
    try:
        # Save audio file
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = filepath.stat().st_size
        
        # Check file size (max 50MB for audio)
        if file_size > 50 * 1024 * 1024:
            filepath.unlink()
            raise HTTPException(status_code=400, detail="Audio file too large. Max 50MB allowed.")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    base_url = os.environ.get('REACT_APP_BACKEND_URL', '')
    file_url = f"{base_url}/api/uploads/{filename}"
    
    return {
        "filename": filename,
        "url": file_url,
        "content_type": file.content_type,
        "size": file_size
    }


# ==================== VAST VALIDATION ====================

@router.post("/vast/validate")
async def validate_vast(vast_url: str = None, vast_xml: str = None):
    """Validate a VAST tag and extract media information"""
    import xml.etree.ElementTree as ET
    import httpx
    
    if not vast_url and not vast_xml:
        raise HTTPException(status_code=400, detail="Either vast_url or vast_xml is required")
    
    xml_content = vast_xml
    
    # Fetch VAST if URL provided
    if vast_url and not vast_xml:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(vast_url)
                response.raise_for_status()
                xml_content = response.text
        except httpx.TimeoutException:
            return {
                "valid": False,
                "errors": ["VAST URL request timed out"],
                "warnings": []
            }
        except Exception as e:
            return {
                "valid": False,
                "errors": [f"Failed to fetch VAST URL: {str(e)}"],
                "warnings": []
            }
    
    errors = []
    warnings = []
    media_files = []
    tracking_events = []
    click_through = None
    duration = None
    ad_system = None
    ad_title = None
    
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as e:
        return {
            "valid": False,
            "errors": [f"Invalid XML: {str(e)}"],
            "warnings": []
        }
    
    # Check VAST version
    vast_version = root.get("version")
    if not vast_version:
        warnings.append("VAST version not specified")
    elif vast_version not in ["2.0", "3.0", "4.0", "4.1", "4.2"]:
        warnings.append(f"Unknown VAST version: {vast_version}")
    
    # Find Ad element
    ad = root.find(".//Ad")
    if ad is None:
        errors.append("No <Ad> element found")
        return {"valid": False, "errors": errors, "warnings": warnings}
    
    # Check for InLine or Wrapper
    inline = ad.find("InLine")
    wrapper = ad.find("Wrapper")
    
    if inline is None and wrapper is None:
        errors.append("No <InLine> or <Wrapper> element found inside <Ad>")
        return {"valid": False, "errors": errors, "warnings": warnings}
    
    ad_content = inline if inline is not None else wrapper
    is_wrapper = wrapper is not None
    
    # Get AdSystem
    ad_system_elem = ad_content.find("AdSystem")
    if ad_system_elem is not None:
        ad_system = ad_system_elem.text
    else:
        warnings.append("No <AdSystem> element found")
    
    # Get AdTitle
    ad_title_elem = ad_content.find("AdTitle")
    if ad_title_elem is not None:
        ad_title = ad_title_elem.text
    
    # Check Impression
    impressions = ad_content.findall("Impression")
    if not impressions:
        errors.append("No <Impression> element found (required)")
    
    # Check Creatives (for InLine)
    if not is_wrapper:
        creatives = ad_content.find("Creatives")
        if creatives is None:
            errors.append("No <Creatives> element found in InLine")
        else:
            creative_list = creatives.findall("Creative")
            if not creative_list:
                errors.append("No <Creative> elements found")
            
            for creative in creative_list:
                linear = creative.find("Linear")
                if linear is not None:
                    # Get duration
                    duration_elem = linear.find("Duration")
                    if duration_elem is not None:
                        duration = duration_elem.text
                    else:
                        warnings.append("No <Duration> element in Linear creative")
                    
                    # Get MediaFiles
                    media_files_elem = linear.find("MediaFiles")
                    if media_files_elem is not None:
                        for mf in media_files_elem.findall("MediaFile"):
                            media_file = {
                                "delivery": mf.get("delivery"),
                                "type": mf.get("type"),
                                "width": mf.get("width"),
                                "height": mf.get("height"),
                                "bitrate": mf.get("bitrate"),
                                "url": mf.text.strip() if mf.text else None
                            }
                            media_files.append(media_file)
                    else:
                        errors.append("No <MediaFiles> element found in Linear creative")
                    
                    # Get VideoClicks
                    video_clicks = linear.find("VideoClicks")
                    if video_clicks is not None:
                        click_through_elem = video_clicks.find("ClickThrough")
                        if click_through_elem is not None:
                            click_through = click_through_elem.text.strip() if click_through_elem.text else None
                    
                    # Get TrackingEvents
                    tracking = linear.find("TrackingEvents")
                    if tracking is not None:
                        for event in tracking.findall("Tracking"):
                            tracking_events.append({
                                "event": event.get("event"),
                                "url": event.text.strip() if event.text else None
                            })
    else:
        # Wrapper - check VASTAdTagURI
        vast_uri = ad_content.find("VASTAdTagURI")
        if vast_uri is None:
            errors.append("No <VASTAdTagURI> found in Wrapper")
        else:
            warnings.append("This is a VAST Wrapper - it references another VAST tag")
    
    # Validate media files
    if not is_wrapper and not media_files:
        errors.append("No valid MediaFile elements found")
    
    valid_mimes = ["video/mp4", "video/webm", "video/ogg", "video/3gpp", "application/javascript"]
    for mf in media_files:
        if mf.get("type") and mf["type"] not in valid_mimes:
            warnings.append(f"Uncommon video MIME type: {mf['type']}")
        if not mf.get("url"):
            errors.append("MediaFile missing URL")
    
    is_valid = len(errors) == 0
    
    return {
        "valid": is_valid,
        "errors": errors,
        "warnings": warnings,
        "vast_version": vast_version,
        "is_wrapper": is_wrapper,
        "ad_system": ad_system,
        "ad_title": ad_title,
        "duration": duration,
        "click_through": click_through,
        "media_files": media_files,
        "tracking_events_count": len(tracking_events),
        "impressions_count": len(impressions) if 'impressions' in dir() else 0
    }


@router.get("/vast/preview")
async def preview_vast(vast_url: str):
    """Fetch and return VAST XML content for preview"""
    import httpx
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(vast_url)
            response.raise_for_status()
            return {"xml": response.text}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch VAST: {str(e)}")


# ==================== FRAUD DETECTION ====================

@router.get("/fraud/detection/{campaign_id}")
async def analyze_fraud_indicators(campaign_id: str):
    """Analyze potential fraud indicators for a campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    logs = await db.bid_logs.find(
        {"campaign_id": campaign_id, "bid_made": True},
        {"_id": 0}
    ).to_list(1000)
    
    if not logs:
        return {
            "campaign_id": campaign_id,
            "fraud_score": 0,
            "indicators": [],
            "message": "Not enough data to analyze"
        }
    
    indicators = []
    fraud_score = 0
    
    # Analyze patterns
    ip_counts = {}
    ua_counts = {}
    bundle_counts = {}
    
    for log in logs:
        summary = log.get("request_summary", {})
        ip = summary.get("ip", "unknown")
        ua = summary.get("user_agent", "unknown")
        bundle = summary.get("bundle", "unknown")
        
        ip_counts[ip] = ip_counts.get(ip, 0) + 1
        ua_counts[ua] = ua_counts.get(ua, 0) + 1
        bundle_counts[bundle] = bundle_counts.get(bundle, 0) + 1
    
    # Check for IP concentration
    total_bids = len(logs)
    max_ip_count = max(ip_counts.values()) if ip_counts else 0
    ip_concentration = max_ip_count / total_bids if total_bids > 0 else 0
    
    if ip_concentration > 0.5:
        indicators.append({
            "type": "ip_concentration",
            "severity": "high",
            "message": f"Single IP accounts for {ip_concentration*100:.1f}% of traffic"
        })
        fraud_score += 30
    elif ip_concentration > 0.3:
        indicators.append({
            "type": "ip_concentration",
            "severity": "medium",
            "message": f"Single IP accounts for {ip_concentration*100:.1f}% of traffic"
        })
        fraud_score += 15
    
    # Check user agent diversity
    ua_diversity = len(ua_counts) / total_bids if total_bids > 0 else 0
    if ua_diversity < 0.1 and total_bids > 100:
        indicators.append({
            "type": "low_ua_diversity",
            "severity": "medium",
            "message": "Very low user agent diversity suggests bot traffic"
        })
        fraud_score += 20
    
    return {
        "campaign_id": campaign_id,
        "campaign_name": campaign.get("name"),
        "fraud_score": min(fraud_score, 100),
        "risk_level": "high" if fraud_score >= 50 else "medium" if fraud_score >= 25 else "low",
        "indicators": indicators,
        "analyzed_bids": total_bids,
        "unique_ips": len(ip_counts),
        "unique_user_agents": len(ua_counts)
    }



# ==================== SEED DATA ====================

import random
from datetime import timedelta

@router.post("/seed-data")
async def seed_sample_data():
    """Seed database with sample campaigns, creatives, SSPs, and bid logs for testing"""
    
    # Clear existing data (optional - comment out if you want to preserve existing)
    # await db.campaigns.delete_many({})
    # await db.creatives.delete_many({})
    # await db.ssp_endpoints.delete_many({})
    # await db.bid_logs.delete_many({})
    
    # Sample data
    countries = ["US", "UK", "DE", "FR", "IN", "CA", "AU", "JP", "BR", "MX"]
    cities = {
        "US": ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"],
        "UK": ["London", "Manchester", "Birmingham", "Leeds", "Glasgow"],
        "DE": ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne"],
        "FR": ["Paris", "Lyon", "Marseille", "Toulouse", "Nice"],
        "IN": ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad"],
        "CA": ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
        "AU": ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"],
        "JP": ["Tokyo", "Osaka", "Nagoya", "Sapporo", "Fukuoka"],
        "BR": ["Sao Paulo", "Rio de Janeiro", "Brasilia", "Salvador", "Fortaleza"],
        "MX": ["Mexico City", "Guadalajara", "Monterrey", "Puebla", "Tijuana"]
    }
    os_list = ["Android", "iOS", "Windows", "macOS", "Linux"]
    makes = ["Samsung", "Apple", "Xiaomi", "OnePlus", "Google", "Oppo", "Vivo", "Huawei"]
    bundles = ["com.news.app", "com.game.puzzle", "com.social.chat", "com.video.stream", "com.shop.online", "com.fitness.tracker"]
    app_names = ["Daily News", "Puzzle Master", "ChatConnect", "StreamTV", "ShopEasy", "FitTrack"]
    domains = ["news.example.com", "sports.example.com", "tech.example.com", "finance.example.com", "entertainment.example.com"]
    
    # Create SSP Endpoints
    ssps = [
        {"id": str(uuid.uuid4()), "name": "Google AdX", "status": "active", "endpoint_token": uuid.uuid4().hex[:16]},
        {"id": str(uuid.uuid4()), "name": "OpenX", "status": "active", "endpoint_token": uuid.uuid4().hex[:16]},
        {"id": str(uuid.uuid4()), "name": "PubMatic", "status": "active", "endpoint_token": uuid.uuid4().hex[:16]},
        {"id": str(uuid.uuid4()), "name": "Magnite", "status": "active", "endpoint_token": uuid.uuid4().hex[:16]},
        {"id": str(uuid.uuid4()), "name": "Index Exchange", "status": "active", "endpoint_token": uuid.uuid4().hex[:16]},
    ]
    
    for ssp in ssps:
        ssp["total_requests"] = 0
        ssp["total_bids"] = 0
        ssp["total_wins"] = 0
        ssp["total_spend"] = 0
        ssp["impressions"] = 0
        ssp["created_at"] = datetime.now(timezone.utc).isoformat()
        existing = await db.ssp_endpoints.find_one({"name": ssp["name"]})
        if not existing:
            await db.ssp_endpoints.insert_one(ssp)
    
    # Reload SSPs with IDs
    ssps = await db.ssp_endpoints.find({}, {"_id": 0}).to_list(100)
    
    # Create Creatives
    creatives = [
        {"id": str(uuid.uuid4()), "name": "Hero Banner 300x250", "type": "banner", "size": "300x250", "status": "active"},
        {"id": str(uuid.uuid4()), "name": "Video Pre-roll 15s", "type": "video", "duration": 15, "status": "active"},
        {"id": str(uuid.uuid4()), "name": "Video Pre-roll 30s", "type": "video", "duration": 30, "status": "active"},
        {"id": str(uuid.uuid4()), "name": "Native Card A", "type": "native", "status": "active"},
        {"id": str(uuid.uuid4()), "name": "Skyscraper 160x600", "type": "banner", "size": "160x600", "status": "active"},
    ]
    
    for creative in creatives:
        creative["created_at"] = datetime.now(timezone.utc).isoformat()
        existing = await db.creatives.find_one({"name": creative["name"]})
        if not existing:
            await db.creatives.insert_one(creative)
    
    # Reload creatives with IDs
    creatives = await db.creatives.find({}, {"_id": 0}).to_list(100)
    
    # Create Campaigns
    campaigns = [
        {"id": str(uuid.uuid4()), "name": "Brand Awareness Q1", "status": "active", "goal": "awareness"},
        {"id": str(uuid.uuid4()), "name": "Retargeting Spring", "status": "active", "goal": "conversions"},
        {"id": str(uuid.uuid4()), "name": "Performance Max", "status": "active", "goal": "performance"},
        {"id": str(uuid.uuid4()), "name": "Video Reach", "status": "active", "goal": "reach"},
        {"id": str(uuid.uuid4()), "name": "Display Prospecting", "status": "active", "goal": "prospecting"},
    ]
    
    for i, campaign in enumerate(campaigns):
        # Assign a creative to each campaign
        creative = creatives[i % len(creatives)] if creatives else {"id": "default"}
        campaign["creative_id"] = creative.get("id", "default")
        campaign["budget"] = {"total_budget": 10000, "daily_budget": 500, "total_spend": 0, "daily_spend": 0}
        campaign["bid_price"] = round(random.uniform(1.5, 5.0), 2)
        campaign["bid_floor"] = 0.1
        campaign["currency"] = "USD"
        campaign["priority"] = 1
        campaign["placements"] = []
        campaign["targeting"] = {}
        campaign["impressions"] = 0
        campaign["clicks"] = 0
        campaign["bids"] = 0
        campaign["wins"] = 0
        campaign["created_at"] = datetime.now(timezone.utc).isoformat()
        campaign["updated_at"] = datetime.now(timezone.utc).isoformat()
        existing = await db.campaigns.find_one({"name": campaign["name"]})
        if not existing:
            await db.campaigns.insert_one(campaign)
    
    # Reload campaigns with IDs
    campaigns = await db.campaigns.find({}, {"_id": 0}).to_list(100)
    
    # Generate Bid Logs (last 30 days of data)
    bid_logs = []
    now = datetime.now(timezone.utc)
    
    for i in range(5000):  # Generate 5000 bid logs
        campaign = random.choice(campaigns)
        creative = random.choice(creatives)
        ssp = random.choice(ssps)
        country = random.choice(countries)
        city = random.choice(cities.get(country, ["Unknown"]))
        
        # Random timestamp in last 30 days
        days_ago = random.randint(0, 30)
        hours_ago = random.randint(0, 23)
        timestamp = now - timedelta(days=days_ago, hours=hours_ago)
        
        bid_made = random.random() < 0.85  # 85% bid rate
        win_notified = bid_made and random.random() < 0.35  # 35% win rate
        
        bid_price = random.uniform(1.0, 5.0)
        win_price = bid_price * random.uniform(0.6, 0.95) if win_notified else 0
        
        # Video metrics for video creatives
        is_video = creative.get("type") == "video"
        q1 = win_notified and is_video and random.random() < 0.85
        q2 = q1 and random.random() < 0.80
        q3 = q2 and random.random() < 0.75
        q4 = q3 and random.random() < 0.70
        
        log = {
            "id": str(uuid.uuid4()),
            "request_id": str(uuid.uuid4()),
            "bid_id": str(uuid.uuid4()),
            "campaign_id": campaign["id"],
            "campaign_name": campaign["name"],
            "creative_id": creative["id"],
            "creative_name": creative["name"],
            "ssp_id": ssp["id"],
            "ssp_name": ssp["name"],
            "timestamp": timestamp.isoformat(),
            "bid_made": bid_made,
            "bid_price": round(bid_price, 4) if bid_made else 0,
            "win_notified": win_notified,
            "win_price": round(win_price, 4) if win_notified else 0,
            "billing_notified": win_notified,
            "request_summary": {
                "domain": random.choice(domains),
                "bundle": random.choice(bundles),
                "app_name": random.choice(app_names),
                "country": country,
                "city": city,
                "ip": f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}",
                "device_ifa": str(uuid.uuid4()),  # Device ID (IDFA/GAID)
                "os": random.choice(os_list),
                "make": random.choice(makes),
                "user_id": f"user_{random.randint(10000, 99999)}"
            },
            "q1": q1,
            "q2": q2,
            "q3": q3,
            "q4": q4
        }
        bid_logs.append(log)
    
    # Bulk insert bid logs
    if bid_logs:
        await db.bid_logs.insert_many(bid_logs)
    
    # Update campaign stats
    for campaign in campaigns:
        logs = [l for l in bid_logs if l["campaign_id"] == campaign["id"]]
        impressions = sum(1 for l in logs if l["win_notified"])
        clicks = int(impressions * random.uniform(0.01, 0.03))
        spend = sum(l["win_price"] for l in logs if l["win_notified"])
        
        await db.campaigns.update_one(
            {"id": campaign["id"]},
            {"$set": {
                "impressions": impressions,
                "clicks": clicks,
                "bids": len([l for l in logs if l["bid_made"]]),
                "wins": impressions,
                "budget.total_spend": round(spend, 2)
            }}
        )
    
    # Update SSP stats
    for ssp in ssps:
        logs = [l for l in bid_logs if l["ssp_id"] == ssp["id"]]
        total_bids = len([l for l in logs if l["bid_made"]])
        total_wins = len([l for l in logs if l["win_notified"]])
        total_spend = sum(l["win_price"] for l in logs if l["win_notified"])
        
        await db.ssp_endpoints.update_one(
            {"id": ssp["id"]},
            {"$set": {
                "total_requests": len(logs),
                "total_bids": total_bids,
                "total_wins": total_wins,
                "total_spend": round(total_spend, 2),
                "impressions": total_wins
            }}
        )
    
    return {
        "status": "success",
        "created": {
            "campaigns": len(campaigns),
            "creatives": len(creatives),
            "ssp_endpoints": len(ssps),
            "bid_logs": len(bid_logs)
        },
        "message": "Sample data seeded successfully. Ad Performance Report will now show REAL DATA."
    }


@router.delete("/seed-data")
async def clear_seed_data():
    """Clear all seeded data from database"""
    result = {
        "bid_logs_deleted": (await db.bid_logs.delete_many({})).deleted_count,
        "campaigns_deleted": (await db.campaigns.delete_many({})).deleted_count,
        "creatives_deleted": (await db.creatives.delete_many({})).deleted_count,
        "ssp_endpoints_deleted": (await db.ssp_endpoints.delete_many({})).deleted_count
    }
    return {"status": "cleared", "deleted": result}



@router.post("/seed-data/update-ip-device")
async def update_bid_logs_with_ip_device():
    """Update existing bid_logs to add IP and device_ifa fields"""
    import random
    
    # Get all bid_logs that don't have ip or device_ifa
    bid_logs = await db.bid_logs.find({}, {"_id": 1, "request_summary": 1}).to_list(100000)
    
    updated_count = 0
    for log in bid_logs:
        request_summary = log.get("request_summary", {})
        needs_update = False
        
        if not request_summary.get("ip"):
            request_summary["ip"] = f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"
            needs_update = True
        
        if not request_summary.get("device_ifa"):
            request_summary["device_ifa"] = str(uuid.uuid4())
            needs_update = True
        
        if needs_update:
            await db.bid_logs.update_one(
                {"_id": log["_id"]},
                {"$set": {"request_summary": request_summary}}
            )
            updated_count += 1
    
    return {
        "status": "success",
        "updated_count": updated_count,
        "message": f"Updated {updated_count} bid_logs with IP and device_ifa"
    }

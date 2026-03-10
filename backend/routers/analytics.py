"""
Analytics endpoints - SSP analytics, dashboard stats, reports, pacing, insights
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import csv
import io
import json

from models import DashboardStats
from routers.shared import db

router = APIRouter(tags=["Analytics"])


# ==================== DASHBOARD ====================

@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics"""
    campaigns = await db.campaigns.find({}, {"_id": 0}).to_list(1000)
    creatives = await db.creatives.count_documents({})
    endpoints = await db.ssp_endpoints.count_documents({})
    
    active_campaigns = len([c for c in campaigns if c.get("status") == "active"])
    total_bids = sum(c.get("bids", 0) for c in campaigns)
    total_wins = sum(c.get("wins", 0) for c in campaigns)
    total_impressions = sum(c.get("impressions", 0) for c in campaigns)
    total_spend = sum(c.get("budget", {}).get("total_spend", 0) for c in campaigns)
    
    avg_win_rate = (total_wins / total_bids * 100) if total_bids > 0 else 0
    
    return DashboardStats(
        total_campaigns=len(campaigns),
        active_campaigns=active_campaigns,
        total_creatives=creatives,
        total_endpoints=endpoints,
        total_bids=total_bids,
        total_wins=total_wins,
        total_impressions=total_impressions,
        total_spend=total_spend,
        avg_win_rate=round(avg_win_rate, 2)
    )


@router.get("/dashboard/chart-data")
async def get_chart_data():
    """Get chart data for dashboard"""
    # Last 7 days of data
    end_dt = datetime.now(timezone.utc)
    start_dt = end_dt - timedelta(days=7)
    
    pipeline = [
        {
            "$match": {
                "timestamp": {
                    "$gte": start_dt.isoformat(),
                    "$lte": end_dt.isoformat()
                }
            }
        },
        {
            "$group": {
                "_id": {"$substr": ["$timestamp", 0, 10]},
                "bids": {"$sum": {"$cond": ["$bid_made", 1, 0]}},
                "wins": {"$sum": {"$cond": ["$win_notified", 1, 0]}},
                "spend": {"$sum": {"$ifNull": ["$win_price", 0]}}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    daily_data = await db.bid_logs.aggregate(pipeline).to_list(100)
    
    return {
        "labels": [d["_id"] for d in daily_data],
        "bids": [d["bids"] for d in daily_data],
        "wins": [d["wins"] for d in daily_data],
        "spend": [d["spend"] / 1000 for d in daily_data]
    }


# ==================== SSP ANALYTICS ====================

@router.get("/ssp-analytics/overview")
async def get_ssp_analytics_overview():
    """Get SSP performance analytics overview"""
    endpoints = await db.ssp_endpoints.find({}, {"_id": 0}).to_list(100)
    
    total_requests = sum(e.get("total_requests", 0) for e in endpoints)
    total_bids = sum(e.get("total_bids", 0) for e in endpoints)
    total_wins = sum(e.get("total_wins", 0) for e in endpoints)
    total_spend = sum(e.get("total_spend", 0) for e in endpoints)
    
    overall_bid_rate = (total_bids / total_requests * 100) if total_requests > 0 else 0
    overall_win_rate = (total_wins / total_bids * 100) if total_bids > 0 else 0
    
    ssp_rankings = []
    for e in endpoints:
        requests = e.get("total_requests", 0)
        bids = e.get("total_bids", 0)
        wins = e.get("total_wins", 0)
        spend = e.get("total_spend", 0)
        
        ssp_rankings.append({
            "id": e.get("id"),
            "name": e.get("name"),
            "status": e.get("status"),
            "requests": requests,
            "bids": bids,
            "wins": wins,
            "spend": spend,
            "bid_rate": round((bids / requests * 100) if requests > 0 else 0, 2),
            "win_rate": round((wins / bids * 100) if bids > 0 else 0, 2),
            "avg_response_time_ms": e.get("avg_response_time_ms", 0),
            "last_request_at": e.get("last_request_at")
        })
    
    ssp_rankings.sort(key=lambda x: x["requests"], reverse=True)
    
    return {
        "overview": {
            "total_ssps": len(endpoints),
            "active_ssps": len([e for e in endpoints if e.get("status") == "active"]),
            "total_requests": total_requests,
            "total_bids": total_bids,
            "total_wins": total_wins,
            "total_spend": round(total_spend, 2),
            "overall_bid_rate": round(overall_bid_rate, 2),
            "overall_win_rate": round(overall_win_rate, 2)
        },
        "ssp_rankings": ssp_rankings,
        "top_performers": {
            "by_requests": ssp_rankings[:3] if ssp_rankings else [],
            "by_win_rate": sorted([s for s in ssp_rankings if s["bids"] > 0], key=lambda x: x["win_rate"], reverse=True)[:3],
            "by_spend": sorted(ssp_rankings, key=lambda x: x["spend"], reverse=True)[:3]
        }
    }


@router.get("/ssp-analytics/{ssp_id}/details")
async def get_ssp_analytics_details(ssp_id: str):
    """Get detailed analytics for a specific SSP"""
    endpoint = await db.ssp_endpoints.find_one({"id": ssp_id}, {"_id": 0})
    if not endpoint:
        raise HTTPException(status_code=404, detail="SSP endpoint not found")
    
    recent_logs = await db.bid_logs.find(
        {"ssp_id": ssp_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(100).to_list(100)
    
    hourly_dist = {}
    for log in recent_logs:
        try:
            ts = log.get("timestamp")
            if isinstance(ts, str):
                hour = datetime.fromisoformat(ts.replace("Z", "+00:00")).hour
            else:
                hour = ts.hour
            hourly_dist[hour] = hourly_dist.get(hour, 0) + 1
        except (ValueError, TypeError, AttributeError):
            pass
    
    response_times = [log.get("response_time_ms", 0) for log in recent_logs if log.get("response_time_ms")]
    
    campaign_dist = {}
    for log in recent_logs:
        if log.get("bid_made") and log.get("campaign_id"):
            cid = log.get("campaign_id")
            cname = log.get("campaign_name", "Unknown")
            if cid not in campaign_dist:
                campaign_dist[cid] = {"name": cname, "bids": 0, "wins": 0}
            campaign_dist[cid]["bids"] += 1
            if log.get("win_notified"):
                campaign_dist[cid]["wins"] += 1
    
    return {
        "ssp": {
            "id": endpoint.get("id"),
            "name": endpoint.get("name"),
            "status": endpoint.get("status"),
            "endpoint_token": endpoint.get("endpoint_token"),
            "ortb_version": endpoint.get("ortb_version")
        },
        "metrics": {
            "total_requests": endpoint.get("total_requests", 0),
            "total_bids": endpoint.get("total_bids", 0),
            "total_wins": endpoint.get("total_wins", 0),
            "total_spend": endpoint.get("total_spend", 0),
            "avg_response_time_ms": endpoint.get("avg_response_time_ms", 0),
            "bid_rate": round((endpoint.get("total_bids", 0) / endpoint.get("total_requests", 1)) * 100, 2),
            "win_rate": round((endpoint.get("total_wins", 0) / max(endpoint.get("total_bids", 1), 1)) * 100, 2)
        },
        "hourly_distribution": [{"hour": h, "requests": c} for h, c in sorted(hourly_dist.items())],
        "campaign_distribution": list(campaign_dist.values()),
        "response_time_stats": {
            "avg": round(sum(response_times) / len(response_times), 2) if response_times else 0,
            "min": min(response_times) if response_times else 0,
            "max": max(response_times) if response_times else 0
        },
        "recent_activity": recent_logs[:10]
    }


# ==================== BUDGET PACING ====================

@router.post("/pacing/reset-all")
async def reset_all_daily_spend():
    """Reset daily spend for all campaigns"""
    result = await db.campaigns.update_many(
        {},
        {"$set": {
            "budget.daily_spend": 0,
            "budget.current_hour_spend": 0,
            "budget.last_hour_reset": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"status": "reset", "campaigns_updated": result.modified_count}


@router.get("/pacing/status")
async def get_pacing_status():
    """Get pacing status for all active campaigns"""
    campaigns = await db.campaigns.find(
        {"status": "active"},
        {"_id": 0, "id": 1, "name": 1, "budget": 1, "bid_shading": 1}
    ).to_list(1000)
    
    now = datetime.now(timezone.utc)
    current_hour = now.hour
    hours_remaining = 24 - current_hour
    
    status = []
    for c in campaigns:
        budget = c.get("budget", {})
        daily_budget = budget.get("daily_budget", 0)
        daily_spend = budget.get("daily_spend", 0)
        
        if daily_budget > 0:
            pacing_percentage = (daily_spend / daily_budget) * 100
            ideal_percentage = (current_hour / 24) * 100
            pacing_status = "on_track"
            
            if pacing_percentage > ideal_percentage + 10:
                pacing_status = "overpacing"
            elif pacing_percentage < ideal_percentage - 10:
                pacing_status = "underpacing"
        else:
            pacing_percentage = 0
            ideal_percentage = 0
            pacing_status = "unlimited"
        
        status.append({
            "campaign_id": c["id"],
            "campaign_name": c["name"],
            "daily_budget": daily_budget,
            "daily_spend": daily_spend,
            "pacing_percentage": round(pacing_percentage, 1),
            "ideal_percentage": round(ideal_percentage, 1),
            "pacing_status": pacing_status,
            "hours_remaining": hours_remaining,
            "bid_shading_enabled": c.get("bid_shading", {}).get("enabled", False),
            "current_shade_factor": c.get("bid_shading", {}).get("current_shade_factor", 1.0)
        })
    
    return {"current_hour": current_hour, "campaigns": status}


# ==================== REPORTING ====================

@router.get("/reports/campaign/{campaign_id}")
async def get_campaign_report(
    campaign_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get performance report for a specific campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if not end_date:
        end_dt = datetime.now(timezone.utc)
        end_date = end_dt.strftime("%Y-%m-%d")
    else:
        end_dt = datetime.fromisoformat(end_date)
    
    if not start_date:
        start_dt = end_dt - timedelta(days=7)
        start_date = start_dt.strftime("%Y-%m-%d")
    else:
        start_dt = datetime.fromisoformat(start_date)
    
    pipeline = [
        {
            "$match": {
                "campaign_id": campaign_id,
                "timestamp": {
                    "$gte": start_dt.isoformat(),
                    "$lte": (end_dt + timedelta(days=1)).isoformat()
                }
            }
        },
        {
            "$group": {
                "_id": {"$substr": ["$timestamp", 0, 10]},
                "bids": {"$sum": 1},
                "wins": {"$sum": {"$cond": ["$win_notified", 1, 0]}},
                "total_bid_price": {"$sum": {"$ifNull": ["$shaded_price", "$bid_price"]}},
                "total_win_price": {"$sum": {"$ifNull": ["$win_price", 0]}}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    daily_data = await db.bid_logs.aggregate(pipeline).to_list(100)
    
    total_bids = sum(d["bids"] for d in daily_data)
    total_wins = sum(d["wins"] for d in daily_data)
    total_bid_value = sum(d["total_bid_price"] for d in daily_data)
    total_win_value = sum(d["total_win_price"] for d in daily_data)
    
    impressions = campaign.get("impressions", 0)
    clicks = campaign.get("clicks", 0)
    spend = campaign.get("budget", {}).get("total_spend", 0)
    
    return {
        "campaign_id": campaign_id,
        "campaign_name": campaign.get("name"),
        "start_date": start_date,
        "end_date": end_date,
        "summary": {
            "impressions": impressions,
            "clicks": clicks,
            "bids": total_bids,
            "wins": total_wins,
            "spend": spend,
            "ctr": (clicks / impressions * 100) if impressions > 0 else 0,
            "win_rate": (total_wins / total_bids * 100) if total_bids > 0 else 0,
            "avg_cpm": (spend / impressions * 1000) if impressions > 0 else 0,
            "avg_bid_price": (total_bid_value / total_bids) if total_bids > 0 else 0,
            "avg_win_price": (total_win_value / total_wins) if total_wins > 0 else 0
        },
        "daily_data": [
            {
                "date": d["_id"],
                "bids": d["bids"],
                "wins": d["wins"],
                "win_rate": (d["wins"] / d["bids"] * 100) if d["bids"] > 0 else 0,
                "avg_bid_price": (d["total_bid_price"] / d["bids"]) if d["bids"] > 0 else 0,
                "avg_win_price": (d["total_win_price"] / d["wins"]) if d["wins"] > 0 else 0
            }
            for d in daily_data
        ],
        "bid_shading": {
            "enabled": campaign.get("bid_shading", {}).get("enabled", False),
            "current_factor": campaign.get("bid_shading", {}).get("current_shade_factor", 1.0),
            "target_win_rate": campaign.get("bid_shading", {}).get("target_win_rate", 0.3),
            "actual_win_rate": campaign.get("recent_win_rate", 0)
        }
    }


@router.get("/reports/summary")
async def get_report_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get overall performance report summary"""
    if not end_date:
        end_dt = datetime.now(timezone.utc)
        end_date = end_dt.strftime("%Y-%m-%d")
    else:
        end_dt = datetime.fromisoformat(end_date)
    
    if not start_date:
        start_dt = end_dt - timedelta(days=7)
        start_date = start_dt.strftime("%Y-%m-%d")
    else:
        start_dt = datetime.fromisoformat(start_date)
    
    pipeline = [
        {
            "$match": {
                "timestamp": {
                    "$gte": start_dt.isoformat(),
                    "$lte": (end_dt + timedelta(days=1)).isoformat()
                }
            }
        },
        {
            "$group": {
                "_id": {"$substr": ["$timestamp", 0, 10]},
                "total_bids": {"$sum": {"$cond": ["$bid_made", 1, 0]}},
                "no_bids": {"$sum": {"$cond": ["$bid_made", 0, 1]}},
                "wins": {"$sum": {"$cond": ["$win_notified", 1, 0]}},
                "total_spend": {"$sum": {"$ifNull": ["$win_price", 0]}}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    daily_data = await db.bid_logs.aggregate(pipeline).to_list(100)
    
    campaigns = await db.campaigns.find({}, {"_id": 0}).to_list(1000)
    
    total_impressions = sum(c.get("impressions", 0) for c in campaigns)
    total_clicks = sum(c.get("clicks", 0) for c in campaigns)
    total_spend = sum(c.get("budget", {}).get("total_spend", 0) for c in campaigns)
    
    total_bids = sum(d["total_bids"] for d in daily_data)
    total_wins = sum(d["wins"] for d in daily_data)
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "summary": {
            "total_impressions": total_impressions,
            "total_clicks": total_clicks,
            "total_bids": total_bids,
            "total_wins": total_wins,
            "total_spend": total_spend,
            "ctr": (total_clicks / total_impressions * 100) if total_impressions > 0 else 0,
            "win_rate": (total_wins / total_bids * 100) if total_bids > 0 else 0,
            "avg_cpm": (total_spend / total_impressions * 1000) if total_impressions > 0 else 0
        },
        "daily_data": [
            {
                "date": d["_id"],
                "bids": d["total_bids"],
                "no_bids": d["no_bids"],
                "wins": d["wins"],
                "spend": d["total_spend"] / 1000,
                "win_rate": (d["wins"] / d["total_bids"] * 100) if d["total_bids"] > 0 else 0
            }
            for d in daily_data
        ],
        "campaigns": len(campaigns),
        "active_campaigns": len([c for c in campaigns if c.get("status") == "active"])
    }


@router.get("/reports/export/csv")
async def export_report_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    campaign_id: Optional[str] = None
):
    """Export report data as CSV"""
    if campaign_id:
        report = await get_campaign_report(campaign_id, start_date, end_date)
        daily_data = report["daily_data"]
    else:
        report = await get_report_summary(start_date, end_date)
        daily_data = report["daily_data"]
    
    output = io.StringIO()
    if daily_data:
        writer = csv.DictWriter(output, fieldnames=daily_data[0].keys())
        writer.writeheader()
        writer.writerows(daily_data)
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=report_{start_date}_{end_date}.csv"}
    )


@router.get("/reports/export/json")
async def export_report_json(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    campaign_id: Optional[str] = None
):
    """Export report data as JSON"""
    if campaign_id:
        report = await get_campaign_report(campaign_id, start_date, end_date)
    else:
        report = await get_report_summary(start_date, end_date)
    
    return Response(
        content=json.dumps(report, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=report_{start_date}_{end_date}.json"}
    )


# ==================== AD PERFORMANCE REPORT ====================

import random
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

# Supply Sources for mock data
SUPPLY_SOURCES = [
    "Google AdX", "OpenX", "PubMatic", "Magnite", "Xandr", 
    "Index Exchange", "TripleLift", "Sovrn", "Amazon TAM", "Yahoo SSP"
]

# Sample domains
SAMPLE_DOMAINS = [
    "news.example.com", "sports.example.com", "tech.example.com", 
    "lifestyle.example.com", "entertainment.example.com", "finance.example.com",
    "travel.example.com", "health.example.com", "auto.example.com", "gaming.example.com"
]


def generate_mock_ad_performance_data(
    dimensions: List[str],
    start_date: str,
    end_date: str,
    num_rows: int = 100
) -> List[dict]:
    """Generate mock ad performance data based on selected dimensions"""
    random.seed(42)  # For consistent mock data
    
    data = []
    
    for i in range(num_rows):
        row = {}
        
        # Add dimensions
        if "source" in dimensions:
            row["source"] = random.choice(SUPPLY_SOURCES)
        if "domain" in dimensions:
            row["domain"] = random.choice(SAMPLE_DOMAINS)
        if "insertion_order" in dimensions:
            row["insertion_order"] = f"IO-{random.randint(1000, 9999)}"
        if "line_item" in dimensions:
            row["line_item"] = f"LI-{random.choice(['Prospecting', 'Retargeting', 'Contextual', 'Lookalike'])}-{random.randint(100, 999)}"
        if "creative_name" in dimensions:
            creative_types = ["Banner_300x250", "Banner_728x90", "Video_15s", "Video_30s", "Native_InFeed"]
            row["creative_name"] = f"{random.choice(creative_types)}_{random.randint(1, 50)}"
        
        # Performance metrics
        impressions = random.randint(1000, 500000)
        reach = int(impressions * random.uniform(0.3, 0.8))
        clicks = int(impressions * random.uniform(0.001, 0.05))
        ctr = (clicks / impressions * 100) if impressions > 0 else 0
        conversions = int(clicks * random.uniform(0.01, 0.15))
        
        row["impressions"] = impressions
        row["reach"] = reach
        row["clicks"] = clicks
        row["ctr"] = round(ctr, 2)
        row["conversions"] = conversions
        
        # Video metrics (if video-related creative)
        is_video = "creative_name" in row and "Video" in row.get("creative_name", "")
        
        # Always include video metrics, but they'll be 0 for non-video
        q1_25 = int(impressions * random.uniform(0.6, 0.95)) if is_video else 0
        q2_50 = int(q1_25 * random.uniform(0.7, 0.95)) if is_video else 0
        q3_75 = int(q2_50 * random.uniform(0.7, 0.95)) if is_video else 0
        completed = int(q3_75 * random.uniform(0.6, 0.9)) if is_video else 0
        completion_rate = (completed / impressions * 100) if impressions > 0 and is_video else 0
        
        row["video_q1_25"] = q1_25
        row["video_q2_50"] = q2_50
        row["video_q3_75"] = q3_75
        row["video_completed_100"] = completed
        row["video_completion_rate"] = round(completion_rate, 2)
        
        data.append(row)
    
    return data


@router.post("/reports/ad-performance")
async def generate_ad_performance_report(
    dimensions: str = "source,domain,creative_name",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    include_video_metrics: bool = True,
    num_rows: int = 100
):
    """Generate ad performance report with mock data"""
    # Parse comma-separated dimensions string
    dims = [d.strip() for d in dimensions.split(",")]
    
    if not end_date:
        end_dt = datetime.now(timezone.utc)
        end_date = end_dt.strftime("%Y-%m-%d")
    
    if not start_date:
        start_dt = datetime.now(timezone.utc) - timedelta(days=30)
        start_date = start_dt.strftime("%Y-%m-%d")
    
    # Generate mock data
    data = generate_mock_ad_performance_data(
        dimensions=dims,
        start_date=start_date,
        end_date=end_date,
        num_rows=min(num_rows, 1000)
    )
    
    # Calculate summary
    total_impressions = sum(d["impressions"] for d in data)
    total_reach = sum(d["reach"] for d in data)
    total_clicks = sum(d["clicks"] for d in data)
    total_conversions = sum(d["conversions"] for d in data)
    avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
    
    video_data = [d for d in data if d.get("video_completed_100", 0) > 0]
    total_video_impressions = sum(d["impressions"] for d in video_data)
    total_completed = sum(d["video_completed_100"] for d in video_data)
    avg_completion_rate = (total_completed / total_video_impressions * 100) if total_video_impressions > 0 else 0
    
    return {
        "report_metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "start_date": start_date,
            "end_date": end_date,
            "dimensions": dims,
            "total_rows": len(data),
            "data_source": "MOCK DATA (Demonstration)"
        },
        "summary": {
            "total_impressions": total_impressions,
            "total_reach": total_reach,
            "total_clicks": total_clicks,
            "total_conversions": total_conversions,
            "avg_ctr": round(avg_ctr, 2),
            "video_completion_rate": round(avg_completion_rate, 2)
        },
        "data": data
    }


@router.get("/reports/ad-performance/export/csv")
async def export_ad_performance_csv(
    dimensions: str = "source,domain,creative_name",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    num_rows: int = 100
):
    """Export ad performance report as CSV"""
    dims = [d.strip() for d in dimensions.split(",")]
    
    if not end_date:
        end_dt = datetime.now(timezone.utc)
        end_date = end_dt.strftime("%Y-%m-%d")
    
    if not start_date:
        start_dt = datetime.now(timezone.utc) - timedelta(days=30)
        start_date = start_dt.strftime("%Y-%m-%d")
    
    data = generate_mock_ad_performance_data(
        dimensions=dims,
        start_date=start_date,
        end_date=end_date,
        num_rows=min(num_rows, 1000)
    )
    
    # Define column headers
    headers = []
    
    # Dimension headers
    dimension_labels = {
        "source": "Source",
        "domain": "Domain", 
        "insertion_order": "Insertion Order",
        "line_item": "Line Item",
        "creative_name": "Creative Name"
    }
    for dim in dims:
        if dim in dimension_labels:
            headers.append(dimension_labels[dim])
    
    # Performance metric headers
    headers.extend([
        "Impressions",
        "Reach",
        "Clicks",
        "CTR (%)",
        "Conversions"
    ])
    
    # Video metric headers
    headers.extend([
        "Video Q1 (25%)",
        "Video Q2 (50%)",
        "Video Q3 (75%)",
        "Video Completed (100%)",
        "Video Completion Rate (%)"
    ])
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    
    for row in data:
        csv_row = []
        
        # Dimensions
        for dim in dims:
            csv_row.append(row.get(dim, ""))
        
        # Performance metrics
        csv_row.extend([
            row["impressions"],
            row["reach"],
            row["clicks"],
            row["ctr"],
            row["conversions"]
        ])
        
        # Video metrics
        csv_row.extend([
            row["video_q1_25"],
            row["video_q2_50"],
            row["video_q3_75"],
            row["video_completed_100"],
            row["video_completion_rate"]
        ])
        
        writer.writerow(csv_row)
    
    filename = f"ad_performance_report_{start_date}_to_{end_date}.csv"
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/reports/ad-performance/export/excel")
async def export_ad_performance_excel(
    dimensions: str = "source,domain,creative_name",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    num_rows: int = 100
):
    """Export ad performance report as Excel (XLSX)"""
    dims = [d.strip() for d in dimensions.split(",")]
    
    if not end_date:
        end_dt = datetime.now(timezone.utc)
        end_date = end_dt.strftime("%Y-%m-%d")
    
    if not start_date:
        start_dt = datetime.now(timezone.utc) - timedelta(days=30)
        start_date = start_dt.strftime("%Y-%m-%d")
    
    data = generate_mock_ad_performance_data(
        dimensions=dims,
        start_date=start_date,
        end_date=end_date,
        num_rows=min(num_rows, 1000)
    )
    
    # Create workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Ad Performance Report"
    
    # Styling
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="3B82F6", end_color="3B82F6", fill_type="solid")
    dimension_fill = PatternFill(start_color="10B981", end_color="10B981", fill_type="solid")
    video_fill = PatternFill(start_color="8B5CF6", end_color="8B5CF6", fill_type="solid")
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Headers
    headers = []
    dimension_labels = {
        "source": "Source",
        "domain": "Domain", 
        "insertion_order": "Insertion Order",
        "line_item": "Line Item",
        "creative_name": "Creative Name"
    }
    
    dimension_cols = []
    for dim in dims:
        if dim in dimension_labels:
            headers.append(dimension_labels[dim])
            dimension_cols.append(len(headers))
    
    performance_headers = ["Impressions", "Reach", "Clicks", "CTR (%)", "Conversions"]
    headers.extend(performance_headers)
    
    video_headers = ["Video Q1 (25%)", "Video Q2 (50%)", "Video Q3 (75%)", "Video Completed (100%)", "Video Completion Rate (%)"]
    video_start_col = len(headers) + 1
    headers.extend(video_headers)
    
    # Write headers
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.alignment = Alignment(horizontal='center')
        cell.border = thin_border
        
        if col in dimension_cols:
            cell.fill = dimension_fill
        elif col >= video_start_col:
            cell.fill = video_fill
        else:
            cell.fill = header_fill
    
    # Write data
    for row_idx, row_data in enumerate(data, 2):
        col = 1
        
        # Dimensions
        for dim in dims:
            cell = ws.cell(row=row_idx, column=col, value=row_data.get(dim, ""))
            cell.border = thin_border
            col += 1
        
        # Performance metrics
        for field in ["impressions", "reach", "clicks", "ctr", "conversions"]:
            cell = ws.cell(row=row_idx, column=col, value=row_data[field])
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='right')
            col += 1
        
        # Video metrics
        for field in ["video_q1_25", "video_q2_50", "video_q3_75", "video_completed_100", "video_completion_rate"]:
            cell = ws.cell(row=row_idx, column=col, value=row_data[field])
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='right')
            col += 1
    
    # Auto-adjust column widths
    for col in ws.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except (TypeError, AttributeError):
                pass
        adjusted_width = min(max_length + 2, 30)
        ws.column_dimensions[column].width = adjusted_width
    
    # Save to bytes
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"ad_performance_report_{start_date}_to_{end_date}.xlsx"
    
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


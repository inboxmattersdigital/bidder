"""
OpenRTB Protocol Handler
Handles parsing and response generation for OpenRTB 2.5 and 2.6
"""
from typing import Dict, Any, Optional, List, Tuple
import time
import logging

logger = logging.getLogger(__name__)


class OpenRTBParser:
    """Unified parser for OpenRTB 2.5 and 2.6 bid requests"""
    
    def __init__(self):
        self.version = "2.5"
    
    def detect_version(self, request: Dict[str, Any], headers: Dict[str, str] = None) -> str:
        """Detect OpenRTB version from headers or request content"""
        # Check header first (prioritized for 2.6)
        if headers:
            version_header = headers.get("x-openrtb-version", "").lower()
            if version_header == "2.6":
                return "2.6"
        
        # Check for 2.6 specific fields
        has_2_6_fields = False
        
        # Check for 2.6 video fields
        for imp in request.get("imp", []):
            video = imp.get("video", {})
            if any(key in video for key in ["plcmt", "podid", "podseq", "slotinpod", "rqddurs"]):
                has_2_6_fields = True
                break
            # Check imp.rwdd (2.6 location)
            if "rwdd" in imp:
                has_2_6_fields = True
                break
        
        # Check for core regs fields (2.6)
        regs = request.get("regs", {})
        if "gdpr" in regs or "us_privacy" in regs:
            has_2_6_fields = True
        
        # Check for core source.schain (2.6)
        source = request.get("source", {})
        if "schain" in source and "ext" not in str(source.get("schain", {})):
            has_2_6_fields = True
        
        # Check for user.consent at root level (2.6)
        user = request.get("user", {})
        if "consent" in user or "eids" in user:
            has_2_6_fields = True
        
        # Check device.sua (2.6)
        device = request.get("device", {})
        if "sua" in device:
            has_2_6_fields = True
        
        return "2.6" if has_2_6_fields else "2.5"
    
    def parse(self, request: Dict[str, Any], headers: Dict[str, str] = None) -> Dict[str, Any]:
        """Parse bid request into unified internal format"""
        self.version = self.detect_version(request, headers)
        
        parsed = {
            "_version": self.version,
            "_raw": request,
            "id": request.get("id"),
            "at": request.get("at", 2),  # Default to second-price auction
            "tmax": request.get("tmax", 100),
            "cur": request.get("cur", ["USD"]),
            "bcat": request.get("bcat", []),
            "badv": request.get("badv", []),
        }
        
        # Parse impressions
        parsed["imp"] = [self._parse_impression(imp) for imp in request.get("imp", [])]
        
        # Parse site/app
        parsed["site"] = self._parse_site(request.get("site"))
        parsed["app"] = self._parse_app(request.get("app"))
        
        # Parse device
        parsed["device"] = self._parse_device(request.get("device", {}))
        
        # Parse user
        parsed["user"] = self._parse_user(request.get("user", {}))
        
        # Parse source
        parsed["source"] = self._parse_source(request.get("source", {}))
        
        # Parse regs
        parsed["regs"] = self._parse_regs(request.get("regs", {}))
        
        return parsed
    
    def _parse_impression(self, imp: Dict[str, Any]) -> Dict[str, Any]:
        """Parse impression object"""
        parsed = {
            "id": imp.get("id"),
            "bidfloor": imp.get("bidfloor", 0),
            "bidfloorcur": imp.get("bidfloorcur", "USD"),
            "secure": imp.get("secure", 1),
            "tagid": imp.get("tagid"),
            "instl": imp.get("instl", 0),
            "exp": imp.get("exp", 3600),
        }
        
        # Parse rewarded flag (2.6 location vs 2.5 ext)
        if "rwdd" in imp:
            parsed["rwdd"] = imp["rwdd"]
        elif imp.get("ext", {}).get("rwdd"):
            parsed["rwdd"] = imp["ext"]["rwdd"]
        else:
            parsed["rwdd"] = 0
        
        # Parse banner
        if "banner" in imp:
            parsed["banner"] = self._parse_banner(imp["banner"])
        
        # Parse video
        if "video" in imp:
            parsed["video"] = self._parse_video(imp["video"])
        
        # Parse native
        if "native" in imp:
            parsed["native"] = imp["native"]
        
        return parsed
    
    def _parse_banner(self, banner: Dict[str, Any]) -> Dict[str, Any]:
        """Parse banner object"""
        return {
            "w": banner.get("w"),
            "h": banner.get("h"),
            "format": banner.get("format", []),
            "wmax": banner.get("wmax"),
            "hmax": banner.get("hmax"),
            "wmin": banner.get("wmin"),
            "hmin": banner.get("hmin"),
            "pos": banner.get("pos", 0),
            "mimes": banner.get("mimes", ["image/jpeg", "image/png", "image/gif"]),
            "battr": banner.get("battr", []),
        }
    
    def _parse_video(self, video: Dict[str, Any]) -> Dict[str, Any]:
        """Parse video object with 2.5/2.6 compatibility"""
        parsed = {
            "mimes": video.get("mimes", []),
            "minduration": video.get("minduration", 0),
            "maxduration": video.get("maxduration", 0),
            "protocols": video.get("protocols", []),
            "w": video.get("w"),
            "h": video.get("h"),
            "startdelay": video.get("startdelay"),
            "linearity": video.get("linearity", 1),
            "skip": video.get("skip"),
            "skipmin": video.get("skipmin", 0),
            "skipafter": video.get("skipafter", 0),
            "pos": video.get("pos", 0),
            "playbackmethod": video.get("playbackmethod", []),
            "playbackend": video.get("playbackend"),
            "api": video.get("api", []),
            "battr": video.get("battr", []),
        }
        
        # Handle placement/plcmt (2.5 vs 2.6)
        # 2.5 uses placement, 2.6 uses plcmt
        if "plcmt" in video:
            parsed["plcmt"] = video["plcmt"]
            # Map to 2.5 placement for internal use
            parsed["placement"] = self._plcmt_to_placement(video["plcmt"])
        elif "placement" in video:
            parsed["placement"] = video["placement"]
            # Map to 2.6 plcmt for internal use
            parsed["plcmt"] = self._placement_to_plcmt(video["placement"])
        
        # 2.6 Ad Pod fields
        if "podid" in video:
            parsed["podid"] = video["podid"]
        if "podseq" in video:
            parsed["podseq"] = video["podseq"]
        if "slotinpod" in video:
            parsed["slotinpod"] = video["slotinpod"]
        if "rqddurs" in video:
            parsed["rqddurs"] = video["rqddurs"]
        
        # Companion ads
        if "companionad" in video:
            parsed["companionad"] = video["companionad"]
        if "companiontype" in video:
            parsed["companiontype"] = video["companiontype"]
        
        return parsed
    
    def _placement_to_plcmt(self, placement: int) -> int:
        """Convert OpenRTB 2.5 placement to 2.6 plcmt"""
        mapping = {
            1: 1,  # In-Stream -> Instream
            2: 2,  # In-Banner -> Accompanying Content
            3: 2,  # In-Article -> Accompanying Content
            4: 2,  # In-Feed -> Accompanying Content
            5: 3,  # Interstitial -> Interstitial
        }
        return mapping.get(placement, 4)  # Default to No-Content
    
    def _plcmt_to_placement(self, plcmt: int) -> int:
        """Convert OpenRTB 2.6 plcmt to 2.5 placement"""
        mapping = {
            1: 1,  # Instream -> In-Stream
            2: 4,  # Accompanying -> In-Feed
            3: 5,  # Interstitial -> Interstitial/Floating
            4: 5,  # No-Content -> Interstitial/Floating
        }
        return mapping.get(plcmt, 5)
    
    def _parse_site(self, site: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Parse site object"""
        if not site:
            return None
        
        return {
            "id": site.get("id"),
            "name": site.get("name"),
            "domain": site.get("domain"),
            "cat": site.get("cat", []),
            "sectioncat": site.get("sectioncat", []),
            "pagecat": site.get("pagecat", []),
            "page": site.get("page"),
            "ref": site.get("ref"),
            "search": site.get("search"),
            "mobile": site.get("mobile"),
            "publisher": site.get("publisher"),
            "content": site.get("content"),
            "keywords": site.get("keywords"),
        }
    
    def _parse_app(self, app: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Parse app object"""
        if not app:
            return None
        
        return {
            "id": app.get("id"),
            "name": app.get("name"),
            "bundle": app.get("bundle"),
            "domain": app.get("domain"),
            "storeurl": app.get("storeurl"),
            "cat": app.get("cat", []),
            "sectioncat": app.get("sectioncat", []),
            "pagecat": app.get("pagecat", []),
            "ver": app.get("ver"),
            "publisher": app.get("publisher"),
            "content": app.get("content"),
            "keywords": app.get("keywords"),
        }
    
    def _parse_device(self, device: Dict[str, Any]) -> Dict[str, Any]:
        """Parse device object"""
        parsed = {
            "ua": device.get("ua"),
            "dnt": device.get("dnt"),
            "lmt": device.get("lmt"),
            "ip": device.get("ip"),
            "ipv6": device.get("ipv6"),
            "devicetype": device.get("devicetype"),
            "make": device.get("make"),
            "model": device.get("model"),
            "os": device.get("os"),
            "osv": device.get("osv"),
            "hwv": device.get("hwv"),
            "h": device.get("h"),
            "w": device.get("w"),
            "ppi": device.get("ppi"),
            "pxratio": device.get("pxratio"),
            "js": device.get("js"),
            "language": device.get("language"),
            "carrier": device.get("carrier"),
            "connectiontype": device.get("connectiontype"),
            "ifa": device.get("ifa"),
        }
        
        # Parse geo
        if "geo" in device:
            parsed["geo"] = self._parse_geo(device["geo"])
        
        # 2.6 Structured User Agent
        if "sua" in device:
            parsed["sua"] = device["sua"]
        
        return parsed
    
    def _parse_geo(self, geo: Dict[str, Any]) -> Dict[str, Any]:
        """Parse geo object"""
        return {
            "lat": geo.get("lat"),
            "lon": geo.get("lon"),
            "type": geo.get("type"),
            "ipservice": geo.get("ipservice"),
            "country": geo.get("country"),
            "region": geo.get("region"),
            "city": geo.get("city"),
            "zip": geo.get("zip"),
            "metro": geo.get("metro"),
            "utcoffset": geo.get("utcoffset"),
        }
    
    def _parse_user(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """Parse user object with 2.5/2.6 compatibility"""
        parsed = {
            "id": user.get("id"),
            "buyeruid": user.get("buyeruid"),
            "yob": user.get("yob"),
            "gender": user.get("gender"),
            "keywords": user.get("keywords"),
            "customdata": user.get("customdata"),
            "data": user.get("data", []),
        }
        
        # Handle consent (2.6 location vs 2.5 ext)
        if "consent" in user:
            parsed["consent"] = user["consent"]
        elif user.get("ext", {}).get("consent"):
            parsed["consent"] = user["ext"]["consent"]
        
        # Handle eids (2.6 location vs 2.5 ext)
        if "eids" in user:
            parsed["eids"] = user["eids"]
        elif user.get("ext", {}).get("eids"):
            parsed["eids"] = user["ext"]["eids"]
        
        return parsed
    
    def _parse_source(self, source: Dict[str, Any]) -> Dict[str, Any]:
        """Parse source object with 2.5/2.6 compatibility"""
        parsed = {
            "fd": source.get("fd"),
            "tid": source.get("tid"),
            "pchain": source.get("pchain"),
        }
        
        # Handle schain (2.6 location vs 2.5 ext)
        if "schain" in source:
            parsed["schain"] = source["schain"]
        elif source.get("ext", {}).get("schain"):
            parsed["schain"] = source["ext"]["schain"]
        
        return parsed
    
    def _parse_regs(self, regs: Dict[str, Any]) -> Dict[str, Any]:
        """Parse regs object with 2.5/2.6 compatibility"""
        parsed = {
            "coppa": regs.get("coppa"),
        }
        
        # Handle GDPR (2.6 location vs 2.5 ext)
        if "gdpr" in regs:
            parsed["gdpr"] = regs["gdpr"]
        elif regs.get("ext", {}).get("gdpr"):
            parsed["gdpr"] = regs["ext"]["gdpr"]
        
        # Handle US Privacy/CCPA (2.6 location vs 2.5 ext)
        if "us_privacy" in regs:
            parsed["us_privacy"] = regs["us_privacy"]
        elif regs.get("ext", {}).get("us_privacy"):
            parsed["us_privacy"] = regs["ext"]["us_privacy"]
        
        return parsed


class OpenRTBResponseBuilder:
    """Build OpenRTB bid responses"""
    
    def __init__(self, version: str = "2.5"):
        self.version = version
    
    def build_response(
        self,
        request_id: str,
        imp_id: str,
        bid_id: str,
        price: float,
        creative: Dict[str, Any],
        campaign: Dict[str, Any],
        seat_id: str = "default"
    ) -> Dict[str, Any]:
        """Build a complete bid response"""
        
        bid = {
            "id": bid_id,
            "impid": imp_id,
            "price": round(price, 6),
            "adid": creative.get("id"),
            "nurl": None,  # Win notice URL - can be set by caller
            "burl": None,  # Billing URL - can be set by caller
            "adomain": creative.get("adomain", []),
            "iurl": creative.get("iurl"),
            "cid": campaign.get("id"),
            "crid": creative.get("crid") or creative.get("id"),
            "cat": creative.get("cat", []),
            "attr": creative.get("attr", []),
        }
        
        # Add ad markup based on creative type
        creative_type = creative.get("type")
        if creative_type == "banner" and creative.get("banner_data"):
            bid["adm"] = creative["banner_data"].get("ad_markup", "")
            bid["w"] = creative["banner_data"].get("width")
            bid["h"] = creative["banner_data"].get("height")
        elif creative_type == "video" and creative.get("video_data"):
            video_data = creative["video_data"]
            if video_data.get("vast_xml"):
                bid["adm"] = video_data["vast_xml"]
            elif video_data.get("vast_url"):
                bid["nurl"] = video_data["vast_url"]
        elif creative_type == "native" and creative.get("native_data"):
            bid["adm"] = self._build_native_response(creative["native_data"])
        
        # Handle mtype (2.6) vs ext.prebid.type (2.5)
        mtype_mapping = {"banner": 1, "video": 2, "audio": 3, "native": 4}
        mtype = mtype_mapping.get(creative_type, 1)
        
        if self.version == "2.6":
            bid["mtype"] = mtype
        else:
            bid["ext"] = {
                "prebid": {
                    "type": creative_type
                }
            }
        
        response = {
            "id": request_id,
            "seatbid": [
                {
                    "bid": [bid],
                    "seat": seat_id,
                    "group": 0
                }
            ],
            "bidid": bid_id,
            "cur": "USD"
        }
        
        return response
    
    def build_no_bid_response(self, request_id: str) -> Dict[str, Any]:
        """Build a no-bid response"""
        return {
            "id": request_id,
            "seatbid": []
        }
    
    def _build_native_response(self, native_data: Dict[str, Any]) -> str:
        """Build native ad response JSON"""
        import json
        native_response = {
            "native": {
                "ver": "1.2",
                "assets": [
                    {"id": 1, "title": {"text": native_data.get("title", "")}},
                    {"id": 2, "data": {"value": native_data.get("description", "")}},
                ],
                "link": {"url": native_data.get("click_url", "")},
            }
        }
        
        if native_data.get("icon_url"):
            native_response["native"]["assets"].append({
                "id": 3,
                "img": {"url": native_data["icon_url"], "type": 1}
            })
        
        if native_data.get("image_url"):
            native_response["native"]["assets"].append({
                "id": 4,
                "img": {"url": native_data["image_url"], "type": 3}
            })
        
        return json.dumps(native_response)


class BiddingEngine:
    """Real-time bidding decision engine"""
    
    def __init__(self, db):
        self.db = db
        self.parser = OpenRTBParser()
        self.response_builder = OpenRTBResponseBuilder()
    
    async def process_bid_request(
        self,
        request: Dict[str, Any],
        headers: Dict[str, str] = None,
        ssp_id: str = None
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Process a bid request and return (response, log_data)
        """
        start_time = time.time()
        
        # Parse request
        parsed = self.parser.parse(request, headers)
        version = parsed["_version"]
        
        self.response_builder.version = version
        
        log_data = {
            "request_id": parsed["id"],
            "ssp_id": ssp_id,
            "openrtb_version": version,
            "request_summary": self._create_request_summary(parsed),
            "bid_made": False,
            "matched_campaigns": [],
            "rejection_reasons": [],
        }
        
        # Get active campaigns
        campaigns = await self._get_active_campaigns()
        
        if not campaigns:
            log_data["rejection_reasons"].append("No active campaigns")
            log_data["processing_time_ms"] = (time.time() - start_time) * 1000
            return self.response_builder.build_no_bid_response(parsed["id"]), log_data
        
        # Match campaigns to impressions
        winning_bids = []
        
        for imp in parsed.get("imp", []):
            matched = await self._match_campaigns(imp, parsed, campaigns)
            
            for campaign, creative, score in matched:
                log_data["matched_campaigns"].append(campaign["id"])
            
            if matched:
                # Select best match (highest priority * bid price)
                best_match = max(matched, key=lambda x: x[0]["priority"] * x[0]["bid_price"])
                campaign, creative, score = best_match
                
                # Check bid floor
                if campaign["bid_price"] < imp.get("bidfloor", 0):
                    log_data["rejection_reasons"].append(
                        f"Bid price {campaign['bid_price']} below floor {imp.get('bidfloor')}"
                    )
                    continue
                
                winning_bids.append({
                    "imp": imp,
                    "campaign": campaign,
                    "creative": creative,
                    "price": campaign["bid_price"]
                })
        
        if not winning_bids:
            if not log_data["rejection_reasons"]:
                log_data["rejection_reasons"].append("No matching campaigns for impressions")
            log_data["processing_time_ms"] = (time.time() - start_time) * 1000
            return self.response_builder.build_no_bid_response(parsed["id"]), log_data
        
        # Build response for first winning bid (single bid response)
        winning = winning_bids[0]
        import uuid
        bid_id = str(uuid.uuid4())
        
        response = self.response_builder.build_response(
            request_id=parsed["id"],
            imp_id=winning["imp"]["id"],
            bid_id=bid_id,
            price=winning["price"],
            creative=winning["creative"],
            campaign=winning["campaign"]
        )
        
        log_data["bid_made"] = True
        log_data["bid_price"] = winning["price"]
        log_data["campaign_id"] = winning["campaign"]["id"]
        log_data["creative_id"] = winning["creative"]["id"]
        log_data["processing_time_ms"] = (time.time() - start_time) * 1000
        
        return response, log_data
    
    async def _get_active_campaigns(self) -> List[Dict[str, Any]]:
        """Get all active campaigns with their creatives"""
        campaigns = await self.db.campaigns.find(
            {"status": "active"},
            {"_id": 0}
        ).to_list(1000)
        
        # Load creatives for each campaign
        for campaign in campaigns:
            creative = await self.db.creatives.find_one(
                {"id": campaign["creative_id"]},
                {"_id": 0}
            )
            if creative:
                campaign["_creative"] = creative
        
        return [c for c in campaigns if "_creative" in c]
    
    async def _match_campaigns(
        self,
        imp: Dict[str, Any],
        request: Dict[str, Any],
        campaigns: List[Dict[str, Any]]
    ) -> List[Tuple[Dict[str, Any], Dict[str, Any], float]]:
        """Match campaigns against an impression"""
        matches = []
        
        for campaign in campaigns:
            creative = campaign.get("_creative")
            if not creative:
                continue
            
            # Check creative type matches impression
            if not self._creative_matches_impression(creative, imp):
                continue
            
            # Check all targeting rules
            targeting = campaign.get("targeting", {})
            
            if not self._check_geo_targeting(targeting.get("geo", {}), request.get("device", {}).get("geo")):
                continue
            
            if not self._check_device_targeting(targeting.get("device", {}), request.get("device", {})):
                continue
            
            if not self._check_inventory_targeting(
                targeting.get("inventory", {}),
                request.get("site"),
                request.get("app")
            ):
                continue
            
            if not self._check_video_targeting(targeting.get("video", {}), imp.get("video")):
                continue
            
            site_content = (request.get("site") or {}).get("content")
            app_content = (request.get("app") or {}).get("content")
            if not self._check_content_targeting(
                targeting.get("content", {}),
                site_content or app_content
            ):
                continue
            
            if not self._check_privacy_compliance(targeting.get("privacy", {}), request.get("regs", {})):
                continue
            
            # Check budget
            budget = campaign.get("budget", {})
            if budget.get("daily_budget", 0) > 0 and budget.get("daily_spend", 0) >= budget.get("daily_budget", 0):
                continue
            if budget.get("total_budget", 0) > 0 and budget.get("total_spend", 0) >= budget.get("total_budget", 0):
                continue
            
            # Calculate match score
            score = campaign.get("priority", 1) * campaign.get("bid_price", 0)
            matches.append((campaign, creative, score))
        
        return matches
    
    def _creative_matches_impression(self, creative: Dict[str, Any], imp: Dict[str, Any]) -> bool:
        """Check if creative type matches impression format"""
        creative_type = creative.get("type")
        
        if creative_type == "banner" and "banner" in imp:
            banner = imp["banner"]
            banner_data = creative.get("banner_data", {})
            
            # Check dimensions if specified
            if banner.get("w") and banner_data.get("width"):
                if banner["w"] != banner_data["width"]:
                    return False
            if banner.get("h") and banner_data.get("height"):
                if banner["h"] != banner_data["height"]:
                    return False
            
            return True
        
        elif creative_type == "video" and "video" in imp:
            video = imp["video"]
            video_data = creative.get("video_data", {})
            
            # Check duration
            if video.get("minduration") and video_data.get("duration"):
                if video_data["duration"] < video["minduration"]:
                    return False
            if video.get("maxduration") and video_data.get("duration"):
                if video_data["duration"] > video["maxduration"]:
                    return False
            
            # Check mimes
            if video.get("mimes") and video_data.get("mimes"):
                if not any(m in video["mimes"] for m in video_data["mimes"]):
                    return False
            
            # Check protocols
            if video.get("protocols") and video_data.get("protocols"):
                if not any(p in video["protocols"] for p in video_data["protocols"]):
                    return False
            
            return True
        
        elif creative_type == "native" and "native" in imp:
            return True
        
        return False
    
    def _check_geo_targeting(self, targeting: Dict[str, Any], geo: Optional[Dict[str, Any]]) -> bool:
        """Check geo targeting rules"""
        if not targeting or not any(targeting.values()):
            return True  # No geo targeting
        
        if not geo:
            return False  # Geo targeting required but no geo data
        
        # Check countries
        countries = targeting.get("countries", [])
        if countries and geo.get("country") not in countries:
            return False
        
        # Check regions
        regions = targeting.get("regions", [])
        if regions and geo.get("region") not in regions:
            return False
        
        # Check cities
        cities = targeting.get("cities", [])
        if cities and geo.get("city") not in cities:
            return False
        
        # Check lat/lon radius
        radius_config = targeting.get("lat_lon_radius")
        if radius_config and geo.get("lat") and geo.get("lon"):
            import math
            lat1, lon1 = radius_config["lat"], radius_config["lon"]
            lat2, lon2 = geo["lat"], geo["lon"]
            radius = radius_config.get("radius_km", 50)
            
            # Haversine formula
            R = 6371  # Earth radius in km
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
            c = 2 * math.asin(math.sqrt(a))
            distance = R * c
            
            if distance > radius:
                return False
        
        return True
    
    def _check_device_targeting(self, targeting: Dict[str, Any], device: Dict[str, Any]) -> bool:
        """Check device targeting rules"""
        if not targeting or not any(targeting.values()):
            return True
        
        # Check device types
        device_types = targeting.get("device_types", [])
        if device_types and device.get("devicetype") not in device_types:
            return False
        
        # Check makes
        makes = targeting.get("makes", [])
        if makes and device.get("make") and device.get("make").upper() not in [m.upper() for m in makes]:
            return False
        
        # Check models
        models = targeting.get("models", [])
        if models and device.get("model") and device.get("model") not in models:
            return False
        
        # Check OS
        os_list = targeting.get("os_list", [])
        if os_list and device.get("os") and device.get("os").lower() not in [o.lower() for o in os_list]:
            return False
        
        # Check connection types
        connection_types = targeting.get("connection_types", [])
        if connection_types and device.get("connectiontype") not in connection_types:
            return False
        
        return True
    
    def _check_inventory_targeting(
        self,
        targeting: Dict[str, Any],
        site: Optional[Dict[str, Any]],
        app: Optional[Dict[str, Any]]
    ) -> bool:
        """Check inventory targeting rules"""
        if not targeting or not any(targeting.values()):
            return True
        
        # Get domain/bundle
        domain = site.get("domain") if site else None
        bundle = app.get("bundle") if app else None
        publisher_id = None
        
        if site and site.get("publisher"):
            publisher_id = site["publisher"].get("id")
        elif app and app.get("publisher"):
            publisher_id = app["publisher"].get("id")
        
        # Check domain whitelist
        domain_whitelist = targeting.get("domain_whitelist", [])
        if domain_whitelist and domain and domain not in domain_whitelist:
            return False
        
        # Check domain blacklist
        domain_blacklist = targeting.get("domain_blacklist", [])
        if domain_blacklist and domain and domain in domain_blacklist:
            return False
        
        # Check bundle whitelist
        bundle_whitelist = targeting.get("bundle_whitelist", [])
        if bundle_whitelist and bundle and bundle not in bundle_whitelist:
            return False
        
        # Check bundle blacklist
        bundle_blacklist = targeting.get("bundle_blacklist", [])
        if bundle_blacklist and bundle and bundle in bundle_blacklist:
            return False
        
        # Check publisher IDs
        publisher_ids = targeting.get("publisher_ids", [])
        if publisher_ids and publisher_id and publisher_id not in publisher_ids:
            return False
        
        # Check categories
        categories = targeting.get("categories", [])
        if categories:
            site_cats = (site.get("cat", []) if site else []) + (app.get("cat", []) if app else [])
            if not any(c in categories for c in site_cats):
                return False
        
        return True
    
    def _check_video_targeting(self, targeting: Dict[str, Any], video: Optional[Dict[str, Any]]) -> bool:
        """Check video-specific targeting"""
        if not targeting or not any(targeting.values()):
            return True
        
        if not video:
            return True  # No video in impression
        
        # Check placements (2.5)
        placements = targeting.get("placements", [])
        if placements and video.get("placement") not in placements:
            return False
        
        # Check plcmts (2.6)
        plcmts = targeting.get("plcmts", [])
        if plcmts and video.get("plcmt") not in plcmts:
            return False
        
        # Check duration
        min_duration = targeting.get("min_duration")
        max_duration = targeting.get("max_duration")
        
        if min_duration and video.get("maxduration") and video["maxduration"] < min_duration:
            return False
        if max_duration and video.get("minduration") and video["minduration"] > max_duration:
            return False
        
        # Check protocols
        protocols = targeting.get("protocols", [])
        if protocols and video.get("protocols"):
            if not any(p in protocols for p in video["protocols"]):
                return False
        
        # Check mimes
        mimes = targeting.get("mimes", [])
        if mimes and video.get("mimes"):
            if not any(m in mimes for m in video["mimes"]):
                return False
        
        # Check pod positions (2.6)
        pod_positions = targeting.get("pod_positions", [])
        if pod_positions and video.get("slotinpod") not in pod_positions:
            return False
        
        return True
    
    def _check_content_targeting(self, targeting: Dict[str, Any], content: Optional[Dict[str, Any]]) -> bool:
        """Check content targeting rules"""
        if not targeting or not any(targeting.values()):
            return True
        
        if not content:
            return True
        
        # Check categories
        categories = targeting.get("categories", [])
        if categories:
            content_cats = content.get("cat", [])
            if content_cats and not any(c in categories for c in content_cats):
                return False
        
        # Check keywords
        keywords = targeting.get("keywords", [])
        if keywords and content.get("keywords"):
            content_keywords = content["keywords"].lower().split(",")
            if not any(k.lower() in content_keywords for k in keywords):
                return False
        
        return True
    
    def _check_privacy_compliance(self, settings: Dict[str, Any], regs: Dict[str, Any]) -> bool:
        """Check privacy compliance"""
        if not settings:
            return True
        
        # GDPR check
        if regs.get("gdpr") == 1:
            if settings.get("gdpr_required") and not regs.get("gdpr"):
                return False
        
        # COPPA check
        if regs.get("coppa") == 1 and not settings.get("coppa_allowed", False):
            return False
        
        return True
    
    def _create_request_summary(self, parsed: Dict[str, Any]) -> Dict[str, Any]:
        """Create a summary of the bid request for logging"""
        summary = {
            "id": parsed.get("id"),
            "version": parsed.get("_version"),
            "tmax": parsed.get("tmax"),
            "at": parsed.get("at"),
            "imp_count": len(parsed.get("imp", [])),
        }
        
        # Impression details
        if parsed.get("imp"):
            imp = parsed["imp"][0]
            summary["bidfloor"] = imp.get("bidfloor")
            summary["has_banner"] = "banner" in imp
            summary["has_video"] = "video" in imp
            summary["has_native"] = "native" in imp
        
        # Device info
        device = parsed.get("device", {})
        summary["device_type"] = device.get("devicetype")
        summary["os"] = device.get("os")
        summary["make"] = device.get("make")
        
        # Geo info
        geo = device.get("geo", {})
        summary["country"] = geo.get("country")
        summary["city"] = geo.get("city")
        
        # Site/App info
        if parsed.get("site"):
            summary["inventory_type"] = "site"
            summary["domain"] = parsed["site"].get("domain")
        elif parsed.get("app"):
            summary["inventory_type"] = "app"
            summary["bundle"] = parsed["app"].get("bundle")
            summary["app_name"] = parsed["app"].get("name")
        
        return summary

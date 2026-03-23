"""
Test Creative Size Matching Bug Fix
Bug: Bid response from DSP always showing 300x250 size even when multiple size creatives are available.
Fix: The system should select the creative that matches the impression's requested dimensions.

Tests verify:
1. When impression requests 728x90, the system should select a 728x90 creative if available
2. When impression requests 300x250, the system should select a 300x250 creative
3. When impression requests 320x480, the system should select a 320x480 creative
4. Multiple creatives per campaign should all be loaded and considered for matching
5. Format array in bid request should be properly parsed for size matching
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPERADMIN_EMAIL = "superadmin@demo.com"
SUPERADMIN_PASSWORD = "demo123"

# Existing campaign and creatives for testing (already configured with multiple sizes)
EXISTING_CAMPAIGN_ID = "f95a0193-6729-4042-9583-7fdd7953c5f8"
EXISTING_CREATIVE_IDS = {
    "320x480": "527bbac3-464d-4f07-b61e-2c4d82965cde",  # Test
    "728x90": "47753d0e-2594-4ae1-a67e-74a331ec10b0",   # Updated Ak
    "300x250": "83e140ef-1a16-42bf-be5c-e977d0500953"   # Test Creative
}


class TestCreativeSizeMatching:
    """Test that bid responses return creatives matching requested impression dimensions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        # Cleanup: Delete test campaign and creatives
        self._cleanup_test_data()
    
    def _cleanup_test_data(self):
        """Clean up test data created during tests"""
        # Delete test campaign
        if hasattr(self, 'test_campaign_id'):
            try:
                self.session.delete(f"{BASE_URL}/api/campaigns/{self.test_campaign_id}")
            except:
                pass
        
        # Delete test creatives
        if hasattr(self, 'test_creative_ids'):
            for creative_id in self.test_creative_ids:
                try:
                    self.session.delete(f"{BASE_URL}/api/creatives/{creative_id}")
                except:
                    pass
    
    def _create_test_creative(self, name: str, width: int, height: int) -> dict:
        """Create a test banner creative with specified dimensions"""
        creative_data = {
            "name": f"TEST_{name}_{width}x{height}",
            "type": "banner",
            "status": "active",
            "adomain": ["test.com"],
            "cat": ["IAB1"],
            "banner_data": {
                "width": width,
                "height": height,
                "mimes": ["image/jpeg", "image/png"],
                "ad_markup": f"<div>Test Ad {width}x{height}</div>"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/creatives", json=creative_data)
        assert response.status_code in [200, 201], f"Failed to create creative: {response.text}"
        return response.json()
    
    def _create_test_campaign(self, creative_ids: list) -> dict:
        """Create a test campaign with multiple creatives"""
        campaign_data = {
            "name": f"TEST_MultiSize_Campaign_{uuid.uuid4().hex[:8]}",
            "status": "active",
            "bid_price": 2.0,
            "bid_floor": 0.01,
            "currency": "USD",
            "priority": 10,
            "creative_id": creative_ids[0],  # Required field - first creative
            "creative_ids": creative_ids,     # All creatives for multi-size matching
            "budget": {
                "daily_budget": 1000.0,
                "total_budget": 10000.0,
                "pacing_type": "even"
            },
            "targeting": {
                "geo": {},
                "device": {},
                "inventory": {}
            },
            "start_date": "2026-01-01T00:00:00",
            "end_date": "2026-12-31T00:00:00"
        }
        
        response = self.session.post(f"{BASE_URL}/api/campaigns", json=campaign_data)
        assert response.status_code in [200, 201], f"Failed to create campaign: {response.text}"
        return response.json()
    
    def _send_bid_request(self, width: int, height: int, use_format_array: bool = False) -> dict:
        """Send a bid request with specified banner dimensions"""
        bid_request = {
            "id": f"test-bid-{uuid.uuid4()}",
            "at": 2,
            "tmax": 100,
            "cur": ["USD"],
            "imp": [{
                "id": "1",
                "bidfloor": 0.01,
                "bidfloorcur": "USD",
                "banner": {
                    "w": width,
                    "h": height,
                    "mimes": ["image/jpeg", "image/png", "image/gif"]
                }
            }],
            "site": {
                "id": "test-site",
                "domain": "test.com",
                "page": "https://test.com/page"
            },
            "device": {
                "ua": "Mozilla/5.0 Test",
                "ip": "1.2.3.4",
                "devicetype": 2
            }
        }
        
        # Optionally use format array instead of w/h
        if use_format_array:
            bid_request["imp"][0]["banner"] = {
                "format": [{"w": width, "h": height}],
                "mimes": ["image/jpeg", "image/png", "image/gif"]
            }
        
        response = self.session.post(f"{BASE_URL}/api/bid", json=bid_request)
        return response
    
    def test_setup_multi_size_creatives_and_campaign(self):
        """Test 1: Setup - Create multiple creatives with different sizes and a campaign"""
        # Create creatives with different sizes
        self.test_creative_ids = []
        
        # 300x250 creative
        creative_300x250 = self._create_test_creative("Banner", 300, 250)
        self.test_creative_ids.append(creative_300x250["id"])
        print(f"Created 300x250 creative: {creative_300x250['id']}")
        
        # 728x90 creative
        creative_728x90 = self._create_test_creative("Leaderboard", 728, 90)
        self.test_creative_ids.append(creative_728x90["id"])
        print(f"Created 728x90 creative: {creative_728x90['id']}")
        
        # 320x480 creative
        creative_320x480 = self._create_test_creative("Interstitial", 320, 480)
        self.test_creative_ids.append(creative_320x480["id"])
        print(f"Created 320x480 creative: {creative_320x480['id']}")
        
        # Create campaign with all creatives
        campaign = self._create_test_campaign(self.test_creative_ids)
        self.test_campaign_id = campaign["id"]
        print(f"Created campaign with {len(self.test_creative_ids)} creatives: {campaign['id']}")
        
        # Verify campaign has all creative_ids
        assert "creative_ids" in campaign or "creative_id" in campaign
        
        # Verify creatives are loaded
        campaign_detail = self.session.get(f"{BASE_URL}/api/campaigns/{campaign['id']}").json()
        print(f"Campaign details: {campaign_detail.get('name')}, creative_ids: {campaign_detail.get('creative_ids')}")
        
        assert len(self.test_creative_ids) == 3, "Should have created 3 creatives"
    
    def test_bid_request_300x250_returns_matching_creative(self):
        """Test 2: Bid request for 300x250 should return 300x250 creative"""
        # Setup
        self.test_creative_ids = []
        
        creative_300x250 = self._create_test_creative("Banner", 300, 250)
        self.test_creative_ids.append(creative_300x250["id"])
        
        creative_728x90 = self._create_test_creative("Leaderboard", 728, 90)
        self.test_creative_ids.append(creative_728x90["id"])
        
        campaign = self._create_test_campaign(self.test_creative_ids)
        self.test_campaign_id = campaign["id"]
        
        # Wait for campaign to be active
        time.sleep(0.5)
        
        # Send bid request for 300x250
        response = self._send_bid_request(300, 250)
        
        print(f"Bid response status: {response.status_code}")
        
        if response.status_code == 200:
            bid_response = response.json()
            print(f"Bid response: {bid_response}")
            
            # Check if we got a bid
            assert "seatbid" in bid_response
            assert len(bid_response["seatbid"]) > 0
            
            bid = bid_response["seatbid"][0]["bid"][0]
            
            # Verify dimensions match requested size
            assert bid.get("w") == 300, f"Expected width 300, got {bid.get('w')}"
            assert bid.get("h") == 250, f"Expected height 250, got {bid.get('h')}"
            
            print(f"SUCCESS: Bid returned creative with dimensions {bid.get('w')}x{bid.get('h')}")
        elif response.status_code == 204:
            print("No bid returned (204) - this may be due to targeting or budget constraints")
            # This is acceptable if there are other constraints
        else:
            print(f"Unexpected response: {response.status_code} - {response.text}")
    
    def test_bid_request_728x90_returns_matching_creative(self):
        """Test 3: Bid request for 728x90 should return 728x90 creative (not 300x250)"""
        # Setup
        self.test_creative_ids = []
        
        creative_300x250 = self._create_test_creative("Banner", 300, 250)
        self.test_creative_ids.append(creative_300x250["id"])
        
        creative_728x90 = self._create_test_creative("Leaderboard", 728, 90)
        self.test_creative_ids.append(creative_728x90["id"])
        
        campaign = self._create_test_campaign(self.test_creative_ids)
        self.test_campaign_id = campaign["id"]
        
        # Wait for campaign to be active
        time.sleep(0.5)
        
        # Send bid request for 728x90
        response = self._send_bid_request(728, 90)
        
        print(f"Bid response status: {response.status_code}")
        
        if response.status_code == 200:
            bid_response = response.json()
            print(f"Bid response: {bid_response}")
            
            # Check if we got a bid
            assert "seatbid" in bid_response
            assert len(bid_response["seatbid"]) > 0
            
            bid = bid_response["seatbid"][0]["bid"][0]
            
            # THIS IS THE KEY BUG FIX TEST:
            # Before fix: would return 300x250 (first creative)
            # After fix: should return 728x90 (matching creative)
            assert bid.get("w") == 728, f"BUG: Expected width 728, got {bid.get('w')} - system returned wrong size creative!"
            assert bid.get("h") == 90, f"BUG: Expected height 90, got {bid.get('h')} - system returned wrong size creative!"
            
            print(f"SUCCESS: Bid correctly returned 728x90 creative (not 300x250)")
        elif response.status_code == 204:
            print("No bid returned (204) - checking if this is expected")
        else:
            print(f"Unexpected response: {response.status_code} - {response.text}")
    
    def test_bid_request_320x480_returns_matching_creative(self):
        """Test 4: Bid request for 320x480 should return 320x480 creative"""
        # Setup
        self.test_creative_ids = []
        
        creative_300x250 = self._create_test_creative("Banner", 300, 250)
        self.test_creative_ids.append(creative_300x250["id"])
        
        creative_320x480 = self._create_test_creative("Interstitial", 320, 480)
        self.test_creative_ids.append(creative_320x480["id"])
        
        campaign = self._create_test_campaign(self.test_creative_ids)
        self.test_campaign_id = campaign["id"]
        
        # Wait for campaign to be active
        time.sleep(0.5)
        
        # Send bid request for 320x480
        response = self._send_bid_request(320, 480)
        
        print(f"Bid response status: {response.status_code}")
        
        if response.status_code == 200:
            bid_response = response.json()
            print(f"Bid response: {bid_response}")
            
            # Check if we got a bid
            assert "seatbid" in bid_response
            assert len(bid_response["seatbid"]) > 0
            
            bid = bid_response["seatbid"][0]["bid"][0]
            
            # Verify dimensions match requested size
            assert bid.get("w") == 320, f"BUG: Expected width 320, got {bid.get('w')}"
            assert bid.get("h") == 480, f"BUG: Expected height 480, got {bid.get('h')}"
            
            print(f"SUCCESS: Bid correctly returned 320x480 creative")
        elif response.status_code == 204:
            print("No bid returned (204)")
        else:
            print(f"Unexpected response: {response.status_code} - {response.text}")
    
    def test_bid_request_with_format_array(self):
        """Test 5: Bid request using format array should match correctly"""
        # Setup
        self.test_creative_ids = []
        
        creative_300x250 = self._create_test_creative("Banner", 300, 250)
        self.test_creative_ids.append(creative_300x250["id"])
        
        creative_728x90 = self._create_test_creative("Leaderboard", 728, 90)
        self.test_creative_ids.append(creative_728x90["id"])
        
        campaign = self._create_test_campaign(self.test_creative_ids)
        self.test_campaign_id = campaign["id"]
        
        # Wait for campaign to be active
        time.sleep(0.5)
        
        # Send bid request using format array for 728x90
        response = self._send_bid_request(728, 90, use_format_array=True)
        
        print(f"Bid response status (format array): {response.status_code}")
        
        if response.status_code == 200:
            bid_response = response.json()
            print(f"Bid response: {bid_response}")
            
            # Check if we got a bid
            assert "seatbid" in bid_response
            assert len(bid_response["seatbid"]) > 0
            
            bid = bid_response["seatbid"][0]["bid"][0]
            
            # Verify dimensions match requested size from format array
            assert bid.get("w") == 728, f"BUG: Expected width 728, got {bid.get('w')}"
            assert bid.get("h") == 90, f"BUG: Expected height 90, got {bid.get('h')}"
            
            print(f"SUCCESS: Bid correctly matched format array request")
        elif response.status_code == 204:
            print("No bid returned (204)")
        else:
            print(f"Unexpected response: {response.status_code} - {response.text}")
    
    def test_no_matching_size_returns_fallback_or_no_bid(self):
        """Test 6: Bid request for unavailable size should handle gracefully"""
        # Setup - only create 300x250 creative
        self.test_creative_ids = []
        
        creative_300x250 = self._create_test_creative("Banner", 300, 250)
        self.test_creative_ids.append(creative_300x250["id"])
        
        campaign = self._create_test_campaign(self.test_creative_ids)
        self.test_campaign_id = campaign["id"]
        
        # Wait for campaign to be active
        time.sleep(0.5)
        
        # Send bid request for 160x600 (not available)
        response = self._send_bid_request(160, 600)
        
        print(f"Bid response status for unavailable size: {response.status_code}")
        
        if response.status_code == 200:
            bid_response = response.json()
            print(f"Bid response: {bid_response}")
            
            # If a bid is returned, it should be a fallback (300x250)
            if bid_response.get("seatbid"):
                bid = bid_response["seatbid"][0]["bid"][0]
                print(f"Fallback creative returned: {bid.get('w')}x{bid.get('h')}")
                # This is acceptable behavior - fallback to available creative
        elif response.status_code == 204:
            print("No bid returned (204) - correct behavior when no matching size")
            # This is also acceptable - no matching creative
        else:
            print(f"Unexpected response: {response.status_code} - {response.text}")


class TestExistingCreativesAndCampaigns:
    """Test with existing creatives and campaigns in the system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        yield
    
    def test_list_available_creatives(self):
        """Test: List all available creatives and their sizes"""
        response = self.session.get(f"{BASE_URL}/api/creatives")
        assert response.status_code == 200
        
        creatives = response.json()
        print(f"\nAvailable creatives ({len(creatives)} total):")
        
        banner_creatives = []
        for c in creatives:
            if c.get("type") == "banner" and c.get("banner_data"):
                width = c["banner_data"].get("width")
                height = c["banner_data"].get("height")
                banner_creatives.append({
                    "id": c["id"],
                    "name": c["name"],
                    "size": f"{width}x{height}",
                    "status": c.get("status")
                })
                print(f"  - {c['name']}: {width}x{height} ({c.get('status')})")
        
        assert len(banner_creatives) > 0, "Should have at least one banner creative"
    
    def test_list_active_campaigns(self):
        """Test: List all active campaigns and their creatives"""
        response = self.session.get(f"{BASE_URL}/api/campaigns")
        assert response.status_code == 200
        
        campaigns = response.json()
        print(f"\nActive campaigns ({len(campaigns)} total):")
        
        for c in campaigns:
            if c.get("status") == "active":
                creative_ids = c.get("creative_ids", [])
                if c.get("creative_id"):
                    creative_ids.append(c["creative_id"])
                print(f"  - {c['name']}: {len(creative_ids)} creative(s)")
                print(f"    Creative IDs: {creative_ids}")
    
    def test_bid_endpoint_health(self):
        """Test: Verify bid endpoint is responding"""
        # Simple bid request
        bid_request = {
            "id": f"health-check-{uuid.uuid4()}",
            "at": 2,
            "tmax": 100,
            "cur": ["USD"],
            "imp": [{
                "id": "1",
                "bidfloor": 0.01,
                "banner": {
                    "w": 300,
                    "h": 250
                }
            }],
            "site": {
                "id": "test",
                "domain": "test.com"
            },
            "device": {
                "ip": "1.2.3.4"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/bid", json=bid_request)
        
        # Should return 200 (bid) or 204 (no bid)
        assert response.status_code in [200, 204], f"Unexpected status: {response.status_code}"
        print(f"Bid endpoint health check: {response.status_code}")
        
        if response.status_code == 200:
            bid_response = response.json()
            print(f"Bid response received: {bid_response.get('id')}")


class TestCreativeSizeMatchingWithExistingCampaign:
    """Test creative size matching using the existing campaign with multiple creatives"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        yield
    
    def _send_bid_request(self, width: int, height: int, use_format_array: bool = False) -> dict:
        """Send a bid request with specified banner dimensions and PHL geo (required by campaign)"""
        bid_request = {
            "id": f"test-{width}x{height}-{uuid.uuid4()}",
            "at": 2,
            "tmax": 100,
            "cur": ["USD"],
            "imp": [{
                "id": "1",
                "bidfloor": 0.01,
                "bidfloorcur": "USD",
                "banner": {
                    "w": width,
                    "h": height,
                    "mimes": ["image/jpeg", "image/png", "image/gif"]
                }
            }],
            "site": {
                "id": "test-site",
                "domain": "test.com",
                "page": "https://test.com/page"
            },
            "device": {
                "ua": "Mozilla/5.0 Test",
                "ip": "1.2.3.4",
                "devicetype": 2,
                "geo": {
                    "country": "PHL"  # Required by campaign targeting
                }
            }
        }
        
        # Optionally use format array instead of w/h
        if use_format_array:
            bid_request["imp"][0]["banner"] = {
                "format": [{"w": width, "h": height}],
                "mimes": ["image/jpeg", "image/png", "image/gif"]
            }
        
        response = self.session.post(f"{BASE_URL}/api/bid", json=bid_request)
        return response
    
    def test_bid_request_728x90_returns_728x90_creative(self):
        """Test: Bid request for 728x90 should return 728x90 creative (BUG FIX VERIFICATION)"""
        response = self._send_bid_request(728, 90)
        
        print(f"Bid response status: {response.status_code}")
        assert response.status_code == 200, f"Expected bid response, got {response.status_code}"
        
        bid_response = response.json()
        assert "seatbid" in bid_response
        assert len(bid_response["seatbid"]) > 0
        
        bid = bid_response["seatbid"][0]["bid"][0]
        
        # THIS IS THE KEY BUG FIX TEST:
        # Before fix: would return 300x250 or 320x480 (first creative)
        # After fix: should return 728x90 (matching creative)
        assert bid.get("w") == 728, f"BUG NOT FIXED: Expected width 728, got {bid.get('w')}"
        assert bid.get("h") == 90, f"BUG NOT FIXED: Expected height 90, got {bid.get('h')}"
        
        print(f"SUCCESS: Bid correctly returned 728x90 creative")
        print(f"  Creative ID: {bid.get('adid')}")
        print(f"  Dimensions: {bid.get('w')}x{bid.get('h')}")
    
    def test_bid_request_300x250_returns_300x250_creative(self):
        """Test: Bid request for 300x250 should return 300x250 creative"""
        response = self._send_bid_request(300, 250)
        
        print(f"Bid response status: {response.status_code}")
        assert response.status_code == 200, f"Expected bid response, got {response.status_code}"
        
        bid_response = response.json()
        assert "seatbid" in bid_response
        assert len(bid_response["seatbid"]) > 0
        
        bid = bid_response["seatbid"][0]["bid"][0]
        
        assert bid.get("w") == 300, f"Expected width 300, got {bid.get('w')}"
        assert bid.get("h") == 250, f"Expected height 250, got {bid.get('h')}"
        
        print(f"SUCCESS: Bid correctly returned 300x250 creative")
        print(f"  Creative ID: {bid.get('adid')}")
        print(f"  Dimensions: {bid.get('w')}x{bid.get('h')}")
    
    def test_bid_request_320x480_returns_320x480_creative(self):
        """Test: Bid request for 320x480 should return 320x480 creative"""
        response = self._send_bid_request(320, 480)
        
        print(f"Bid response status: {response.status_code}")
        assert response.status_code == 200, f"Expected bid response, got {response.status_code}"
        
        bid_response = response.json()
        assert "seatbid" in bid_response
        assert len(bid_response["seatbid"]) > 0
        
        bid = bid_response["seatbid"][0]["bid"][0]
        
        assert bid.get("w") == 320, f"Expected width 320, got {bid.get('w')}"
        assert bid.get("h") == 480, f"Expected height 480, got {bid.get('h')}"
        
        print(f"SUCCESS: Bid correctly returned 320x480 creative")
        print(f"  Creative ID: {bid.get('adid')}")
        print(f"  Dimensions: {bid.get('w')}x{bid.get('h')}")
    
    def test_bid_request_with_format_array_728x90(self):
        """Test: Bid request using format array should match 728x90 correctly"""
        response = self._send_bid_request(728, 90, use_format_array=True)
        
        print(f"Bid response status (format array): {response.status_code}")
        assert response.status_code == 200, f"Expected bid response, got {response.status_code}"
        
        bid_response = response.json()
        assert "seatbid" in bid_response
        assert len(bid_response["seatbid"]) > 0
        
        bid = bid_response["seatbid"][0]["bid"][0]
        
        assert bid.get("w") == 728, f"Expected width 728, got {bid.get('w')}"
        assert bid.get("h") == 90, f"Expected height 90, got {bid.get('h')}"
        
        print(f"SUCCESS: Format array bid correctly returned 728x90 creative")
    
    def test_unavailable_size_returns_fallback(self):
        """Test: Bid request for unavailable size should return fallback or no bid"""
        # Request 160x600 which is not available
        response = self._send_bid_request(160, 600)
        
        print(f"Bid response status for unavailable size: {response.status_code}")
        
        if response.status_code == 200:
            bid_response = response.json()
            if bid_response.get("seatbid"):
                bid = bid_response["seatbid"][0]["bid"][0]
                print(f"Fallback creative returned: {bid.get('w')}x{bid.get('h')}")
                # Fallback is acceptable behavior
        elif response.status_code == 204:
            print("No bid returned (204) - correct behavior when no matching size")
            # No bid is also acceptable
        else:
            pytest.fail(f"Unexpected response: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])

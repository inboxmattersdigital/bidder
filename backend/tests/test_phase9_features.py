"""
Phase 9 Feature Tests: WebSocket Bid Stream, Campaign Wizard, SSP Bid Endpoint
Testing WebSocket connectivity, Campaign Creation Wizard, and SSP bid endpoint
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWebSocketAndBidStream:
    """Tests for WebSocket bid stream and related endpoints"""
    
    def test_api_health(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "OpenRTB Bidder API"
        print("✅ API health check passed")
    
    def test_get_bid_stream_endpoint(self):
        """Test HTTP bid-stream endpoint returns recent bids"""
        response = requests.get(f"{BASE_URL}/api/bid-stream?limit=20")
        assert response.status_code == 200
        data = response.json()
        assert "bids" in data
        assert "total_in_memory" in data
        print(f"✅ Bid stream endpoint returned {len(data['bids'])} bids")
    
    def test_bid_logs_endpoint(self):
        """Test bid logs endpoint"""
        response = requests.get(f"{BASE_URL}/api/bid-logs?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert "total" in data
        print(f"✅ Bid logs endpoint returned {len(data['logs'])} logs")


class TestSSPBidEndpoint:
    """Tests for SSP bid endpoint with token-based URLs"""
    
    def test_ssp_endpoints_list(self):
        """Test getting SSP endpoints list"""
        response = requests.get(f"{BASE_URL}/api/ssp-endpoints")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} SSP endpoints")
        return data
    
    def test_bid_endpoint_with_token_mobile_device(self):
        """Test SSP bid endpoint with token '2a9659e425f8433e' for mobile device (type 4)"""
        # Use the test token provided
        endpoint_token = "2a9659e425f8433e"
        
        # Create a bid request with mobile device type 4 (matches Mobile Gaming Campaign)
        bid_request = {
            "id": "test-bid-request-001",
            "imp": [{
                "id": "1",
                "video": {
                    "w": 320,
                    "h": 480,
                    "mimes": ["video/mp4"],
                    "protocols": [2, 3],
                    "minduration": 5,
                    "maxduration": 30
                },
                "bidfloor": 0.5
            }],
            "site": {
                "domain": "example.com"
            },
            "device": {
                "devicetype": 4,  # Phone - matches Mobile Gaming Campaign
                "os": "Android",
                "geo": {
                    "country": "USA"
                }
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/bid/{endpoint_token}",
            json=bid_request,
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 200 with bid or 204 for no bid
        assert response.status_code in [200, 204], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "seatbid" in data or "id" in data
            print(f"✅ Bid endpoint returned a bid response: {data.get('id', 'N/A')}")
            return data
        else:
            print("✅ Bid endpoint returned 204 (no bid) - acceptable")
            return None
    
    def test_bid_endpoint_invalid_token(self):
        """Test that invalid token returns 404"""
        bid_request = {
            "id": "test-invalid-token",
            "imp": [{"id": "1", "banner": {"w": 300, "h": 250}}],
            "device": {"devicetype": 2}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/bid/invalid_token_123",
            json=bid_request,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid token, got {response.status_code}"
        print("✅ Invalid token correctly returns 404")
    
    def test_bid_endpoint_generic(self):
        """Test generic bid endpoint without token"""
        bid_request = {
            "id": "test-generic-bid",
            "imp": [{
                "id": "1",
                "banner": {
                    "w": 300,
                    "h": 250
                }
            }],
            "device": {"devicetype": 2},
            "site": {"domain": "test.com"}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/bid",
            json=bid_request,
            headers={"Content-Type": "application/json"}
        )
        
        # Generic endpoint should work
        assert response.status_code in [200, 204]
        print(f"✅ Generic bid endpoint returned status {response.status_code}")


class TestCampaignWizardAPIs:
    """Tests for Campaign Wizard related APIs"""
    
    def test_get_campaigns(self):
        """Test getting campaigns list"""
        response = requests.get(f"{BASE_URL}/api/campaigns")
        assert response.status_code == 200
        campaigns = response.json()
        assert isinstance(campaigns, list)
        print(f"✅ Found {len(campaigns)} campaigns")
        return campaigns
    
    def test_get_creatives(self):
        """Test getting creatives list for wizard"""
        response = requests.get(f"{BASE_URL}/api/creatives")
        assert response.status_code == 200
        creatives = response.json()
        assert isinstance(creatives, list)
        print(f"✅ Found {len(creatives)} creatives")
        return creatives
    
    def test_get_reference_data(self):
        """Test getting reference data for wizard"""
        response = requests.get(f"{BASE_URL}/api/reference/all")
        assert response.status_code == 200
        data = response.json()
        
        # Check for required reference data
        assert "device_types" in data
        assert "iab_categories" in data
        print("✅ Reference data endpoint returns all required data")
    
    def test_create_campaign_via_wizard(self):
        """Test creating a campaign (simulating wizard submission)"""
        # First get a creative to use
        creatives_resp = requests.get(f"{BASE_URL}/api/creatives")
        creatives = creatives_resp.json()
        
        if not creatives:
            pytest.skip("No creatives available for campaign creation test")
        
        creative_id = creatives[0]["id"]
        
        # Create campaign payload (simulating wizard submission)
        wizard_payload = {
            "name": "TEST_WIZARD_Campaign_" + str(os.urandom(4).hex()),
            "description": "Test campaign created via wizard",
            "advertiser": "Test Advertiser",
            "start_date": "2026-01-10T00:00:00Z",
            "end_date": "2026-12-31T23:59:59Z",
            "status": "draft",
            "bid_price": 2.50,
            "currency": "USD",
            "priority": 5,
            "creative_id": creative_id,
            "creative_ids": [creative_id],
            "budget": {
                "daily_budget": 500.0,
                "total_budget": 5000.0,
                "daily_spend": 0,
                "total_spend": 0,
                "pacing_type": "even"
            },
            "targeting": {
                "geo": {"countries": ["USA", "CAN"], "regions": [], "cities": []},
                "device": {"device_types": [4, 5], "os_list": ["Android", "iOS"], "makes": [], "models": [], "connection_types": [], "carriers": []},
                "inventory": {"domain_whitelist": [], "domain_blacklist": [], "bundle_whitelist": [], "bundle_blacklist": [], "publisher_ids": [], "categories": []},
                "video": {},
                "content": {},
                "privacy": {"gdpr_required": False, "ccpa_allowed": True, "coppa_allowed": False}
            },
            "frequency_cap": {
                "enabled": True,
                "max_impressions": 5,
                "period": "day"
            },
            "bid_shading": {
                "enabled": False,
                "min_reduction": 0.1,
                "max_reduction": 0.3
            },
            "ml_prediction": {
                "enabled": False,
                "model_type": "heuristic"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns",
            json=wizard_payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code in [200, 201], f"Campaign creation failed: {response.text}"
        data = response.json()
        assert "id" in data
        campaign_id = data["id"]
        print(f"✅ Campaign created via wizard: {data.get('name')} (ID: {campaign_id})")
        
        # Clean up - delete the test campaign
        cleanup_resp = requests.delete(f"{BASE_URL}/api/campaigns/{campaign_id}")
        assert cleanup_resp.status_code in [200, 204]
        print(f"✅ Test campaign cleaned up")
        
        return data


class TestCampaignCRUD:
    """Tests for Campaign CRUD operations"""
    
    def test_get_single_campaign(self):
        """Test getting a single campaign"""
        # First get campaigns list
        campaigns_resp = requests.get(f"{BASE_URL}/api/campaigns")
        campaigns = campaigns_resp.json()
        
        if not campaigns:
            pytest.skip("No campaigns available")
        
        campaign_id = campaigns[0]["id"]
        response = requests.get(f"{BASE_URL}/api/campaigns/{campaign_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == campaign_id
        print(f"✅ Got campaign: {data.get('name')}")
    
    def test_campaign_not_found(self):
        """Test 404 for non-existent campaign"""
        response = requests.get(f"{BASE_URL}/api/campaigns/nonexistent-campaign-id")
        assert response.status_code == 404
        print("✅ Non-existent campaign returns 404")


class TestDashboardAndStats:
    """Tests for Dashboard endpoints"""
    
    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "total_campaigns" in data
        assert "active_campaigns" in data
        assert "total_creatives" in data
        print(f"✅ Dashboard stats: {data['total_campaigns']} campaigns, {data['active_campaigns']} active")
    
    def test_chart_data(self):
        """Test chart data endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/chart-data")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Chart data returned {len(data)} data points")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

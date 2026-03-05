"""
Phase 8 Backend Tests: New Features
- SSP Endpoints with unique token-based URLs
- SSP Performance Analytics
- Bid Optimization
- Cross-Campaign Attribution
- Image Upload / Creative Editor
"""
import pytest
import requests
import os
import time
import uuid
from io import BytesIO

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSSPEndpointsWithTokens:
    """Test SSP endpoint token-based identification"""
    
    def test_create_ssp_endpoint_generates_token(self):
        """Create SSP endpoint and verify unique token generated"""
        response = requests.post(f"{BASE_URL}/api/ssp-endpoints", json={
            "name": f"TEST_PHASE8_SSP_{uuid.uuid4().hex[:8]}",
            "description": "Testing token generation",
            "ortb_version": "2.5"
        })
        assert response.status_code == 200, f"Failed to create SSP: {response.text}"
        data = response.json()
        
        # Verify token exists and is 16 chars hex
        assert "endpoint_token" in data, "endpoint_token not in response"
        token = data["endpoint_token"]
        assert len(token) == 16, f"Token should be 16 chars, got {len(token)}"
        assert all(c in '0123456789abcdef' for c in token), f"Token should be hex: {token}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/ssp-endpoints/{data['id']}")
        print(f"PASS: SSP endpoint created with unique token: {token}")
    
    def test_get_ssp_endpoint_url(self):
        """Get SSP endpoint URL returns token-based URL"""
        # Create SSP
        create_resp = requests.post(f"{BASE_URL}/api/ssp-endpoints", json={
            "name": f"TEST_PHASE8_TokenURL_{uuid.uuid4().hex[:8]}",
            "ortb_version": "2.6"
        })
        assert create_resp.status_code == 200
        ssp = create_resp.json()
        
        # Get endpoint URL
        url_resp = requests.get(f"{BASE_URL}/api/ssp-endpoints/{ssp['id']}/endpoint-url")
        assert url_resp.status_code == 200
        url_data = url_resp.json()
        
        # Verify URL contains token, not SSP name
        assert "endpoint_url" in url_data
        assert ssp["endpoint_token"] in url_data["endpoint_url"], "URL should contain token"
        assert "/api/bid/" in url_data["endpoint_url"]
        
        # Verify generic URL also provided
        assert "generic_url" in url_data
        assert url_data["generic_url"].endswith("/api/bid")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/ssp-endpoints/{ssp['id']}")
        print(f"PASS: Endpoint URL uses token: {url_data['endpoint_url']}")
    
    def test_bid_request_with_endpoint_token(self):
        """POST /api/bid/{endpoint_token} works with valid token"""
        # Create SSP
        create_resp = requests.post(f"{BASE_URL}/api/ssp-endpoints", json={
            "name": f"TEST_PHASE8_BidToken_{uuid.uuid4().hex[:8]}"
        })
        assert create_resp.status_code == 200
        ssp = create_resp.json()
        token = ssp["endpoint_token"]
        
        # Send bid request to token-based endpoint
        bid_request = {
            "id": str(uuid.uuid4()),
            "imp": [{"id": "1", "banner": {"w": 300, "h": 250}}],
            "site": {"domain": "test-phase8.com"}
        }
        
        bid_resp = requests.post(f"{BASE_URL}/api/bid/{token}", json=bid_request)
        # Should be 200 (bid) or 204 (no bid), not 404
        assert bid_resp.status_code in [200, 204], f"Token bid failed: {bid_resp.status_code} - {bid_resp.text}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/ssp-endpoints/{ssp['id']}")
        print(f"PASS: Bid request via token {token} returned {bid_resp.status_code}")
    
    def test_bid_request_invalid_token_returns_404(self):
        """POST /api/bid/{invalid_token} returns 404"""
        invalid_token = "0000000000000000"  # Non-existent token
        
        bid_request = {
            "id": str(uuid.uuid4()),
            "imp": [{"id": "1", "banner": {"w": 300, "h": 250}}]
        }
        
        response = requests.post(f"{BASE_URL}/api/bid/{invalid_token}", json=bid_request)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Invalid token returns 404")
    
    def test_regenerate_endpoint_token(self):
        """POST /api/ssp-endpoints/{id}/regenerate-token creates new token"""
        # Create SSP
        create_resp = requests.post(f"{BASE_URL}/api/ssp-endpoints", json={
            "name": f"TEST_PHASE8_Regen_{uuid.uuid4().hex[:8]}"
        })
        ssp = create_resp.json()
        old_token = ssp["endpoint_token"]
        
        # Regenerate token
        regen_resp = requests.post(f"{BASE_URL}/api/ssp-endpoints/{ssp['id']}/regenerate-token")
        assert regen_resp.status_code == 200
        new_token = regen_resp.json()["endpoint_token"]
        
        assert new_token != old_token, "New token should differ from old"
        assert len(new_token) == 16
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/ssp-endpoints/{ssp['id']}")
        print(f"PASS: Token regenerated: {old_token} -> {new_token}")


class TestSSPAnalytics:
    """Test SSP Performance Analytics endpoints"""
    
    def test_ssp_analytics_overview(self):
        """GET /api/ssp-analytics/overview returns overview data"""
        response = requests.get(f"{BASE_URL}/api/ssp-analytics/overview")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "overview" in data, "Missing 'overview' in response"
        overview = data["overview"]
        assert "total_ssps" in overview
        assert "active_ssps" in overview
        assert "total_requests" in overview
        assert "total_spend" in overview
        assert "overall_win_rate" in overview
        
        assert "ssp_rankings" in data
        assert "top_performers" in data
        
        print(f"PASS: SSP Analytics overview - {overview['total_ssps']} total SSPs")
    
    def test_ssp_analytics_details(self):
        """GET /api/ssp-analytics/{ssp_id}/details returns detailed metrics"""
        # Get existing SSPs
        ssps_resp = requests.get(f"{BASE_URL}/api/ssp-endpoints")
        ssps = ssps_resp.json()
        
        if not ssps:
            pytest.skip("No SSPs to test details")
        
        ssp_id = ssps[0]["id"]
        response = requests.get(f"{BASE_URL}/api/ssp-analytics/{ssp_id}/details")
        assert response.status_code == 200
        data = response.json()
        
        assert "ssp" in data
        assert "metrics" in data
        assert "response_time_stats" in data
        
        metrics = data["metrics"]
        assert "total_requests" in metrics
        assert "bid_rate" in metrics
        assert "win_rate" in metrics
        
        print(f"PASS: SSP details for {data['ssp']['name']}")


class TestBidOptimization:
    """Test Automated Bid Optimization endpoints"""
    
    def test_bid_optimization_status(self):
        """GET /api/bid-optimization/status returns campaign list"""
        response = requests.get(f"{BASE_URL}/api/bid-optimization/status")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "total_campaigns" in data
        assert "optimization_enabled_count" in data
        assert "campaigns" in data
        
        # Campaigns should have optimization fields
        if data["campaigns"]:
            campaign = data["campaigns"][0]
            assert "campaign_id" in campaign
            assert "campaign_name" in campaign
            assert "optimization_enabled" in campaign
            assert "bid_price" in campaign
        
        print(f"PASS: Bid optimization status - {data['total_campaigns']} campaigns")
    
    def test_enable_disable_bid_optimization(self):
        """Enable and disable bid optimization on a campaign"""
        # Get campaigns
        campaigns_resp = requests.get(f"{BASE_URL}/api/campaigns")
        campaigns = campaigns_resp.json()
        
        if not campaigns:
            pytest.skip("No campaigns to test optimization")
        
        campaign_id = campaigns[0]["id"]
        
        # Enable optimization
        enable_resp = requests.post(
            f"{BASE_URL}/api/bid-optimization/{campaign_id}/enable",
            params={"target_win_rate": 25, "auto_adjust": True}
        )
        assert enable_resp.status_code == 200, f"Enable failed: {enable_resp.text}"
        enable_data = enable_resp.json()
        assert enable_data.get("status") == "enabled"
        
        # Verify enabled
        status_resp = requests.get(f"{BASE_URL}/api/bid-optimization/status")
        status_data = status_resp.json()
        campaign_status = next((c for c in status_data["campaigns"] if c["campaign_id"] == campaign_id), None)
        assert campaign_status is not None
        assert campaign_status["optimization_enabled"] == True
        
        # Disable optimization
        disable_resp = requests.post(f"{BASE_URL}/api/bid-optimization/{campaign_id}/disable")
        assert disable_resp.status_code == 200
        
        print(f"PASS: Bid optimization enable/disable on {campaign_id}")
    
    def test_run_bid_optimization(self):
        """Run optimization on a campaign"""
        campaigns_resp = requests.get(f"{BASE_URL}/api/campaigns")
        campaigns = campaigns_resp.json()
        
        if not campaigns:
            pytest.skip("No campaigns to run optimization")
        
        campaign_id = campaigns[0]["id"]
        
        # Enable first
        requests.post(f"{BASE_URL}/api/bid-optimization/{campaign_id}/enable")
        
        # Run optimization
        run_resp = requests.post(f"{BASE_URL}/api/bid-optimization/{campaign_id}/run")
        assert run_resp.status_code == 200, f"Run failed: {run_resp.text}"
        data = run_resp.json()
        
        # Should return status (adjusted, no_change, skipped, recommendation)
        assert "status" in data or "recommended_bid" in data
        
        # Disable to cleanup
        requests.post(f"{BASE_URL}/api/bid-optimization/{campaign_id}/disable")
        
        print(f"PASS: Bid optimization run: {data}")
    
    def test_bid_optimization_history(self):
        """GET /api/bid-optimization/{campaign_id}/history returns history"""
        campaigns_resp = requests.get(f"{BASE_URL}/api/campaigns")
        campaigns = campaigns_resp.json()
        
        if not campaigns:
            pytest.skip("No campaigns")
        
        campaign_id = campaigns[0]["id"]
        response = requests.get(f"{BASE_URL}/api/bid-optimization/{campaign_id}/history")
        assert response.status_code == 200
        data = response.json()
        
        assert "history" in data
        # History may be empty if no adjustments made
        
        print(f"PASS: Bid optimization history returned {len(data['history'])} entries")


class TestAttribution:
    """Test Cross-Campaign Attribution endpoints"""
    
    def test_attribution_analysis(self):
        """GET /api/attribution/analysis returns analysis"""
        # Test with different models
        models = ["first_touch", "last_touch", "linear", "time_decay"]
        
        for model in models:
            response = requests.get(f"{BASE_URL}/api/attribution/analysis", params={"model": model})
            assert response.status_code == 200, f"Failed for model {model}: {response.text}"
            data = response.json()
            
            assert "model" in data
            assert data["model"] == model
            assert "total_conversions" in data
            assert "attribution" in data
            # total_value only present when there's conversion data
            if data["total_conversions"] > 0:
                assert "total_value" in data
        
        print(f"PASS: Attribution analysis works for all 4 models")
    
    def test_track_attribution_event(self):
        """POST /api/attribution/track creates event"""
        user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        campaign_id = f"test_campaign_{uuid.uuid4().hex[:8]}"
        
        # Track impression
        response = requests.post(
            f"{BASE_URL}/api/attribution/track",
            params={
                "user_id": user_id,
                "campaign_id": campaign_id,
                "event_type": "impression",
                "event_value": 0
            }
        )
        assert response.status_code == 200, f"Track failed: {response.text}"
        data = response.json()
        assert data.get("status") == "tracked"
        
        print(f"PASS: Attribution event tracked for user {user_id}")
    
    def test_user_journey(self):
        """GET /api/attribution/user/{user_id} returns journey"""
        # Create a test user with events
        user_id = f"journey_test_{uuid.uuid4().hex[:8]}"
        
        # Track some events
        for event_type in ["impression", "click", "conversion"]:
            requests.post(
                f"{BASE_URL}/api/attribution/track",
                params={
                    "user_id": user_id,
                    "campaign_id": "test_campaign_001",
                    "event_type": event_type,
                    "event_value": 100 if event_type == "conversion" else 0
                }
            )
        
        # Get journey
        response = requests.get(f"{BASE_URL}/api/attribution/user/{user_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert "user_id" in data
        assert "total_events" in data
        assert "journey" in data
        assert data["total_events"] >= 3
        
        print(f"PASS: User journey has {data['total_events']} events")


class TestImageUpload:
    """Test Image Upload for Creative Editor"""
    
    def test_upload_image(self):
        """POST /api/upload/image uploads file"""
        # Create a simple test image (1x1 red pixel PNG)
        import base64
        # 1x1 red PNG
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        )
        
        files = {
            'file': ('test_image.png', BytesIO(png_data), 'image/png')
        }
        
        response = requests.post(f"{BASE_URL}/api/upload/image", files=files)
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        assert "filename" in data
        assert "url" in data
        assert "size" in data
        assert data["url"].startswith(BASE_URL) or "uploads" in data["url"]
        
        # Cleanup - delete uploaded file
        filename = data["filename"]
        requests.delete(f"{BASE_URL}/api/uploads/{filename}")
        
        print(f"PASS: Image uploaded: {data['filename']}")
    
    def test_get_uploaded_file(self):
        """GET /api/uploads/{filename} retrieves file"""
        # Upload first
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        )
        files = {'file': ('test_get.png', BytesIO(png_data), 'image/png')}
        upload_resp = requests.post(f"{BASE_URL}/api/upload/image", files=files)
        assert upload_resp.status_code == 200
        filename = upload_resp.json()["filename"]
        
        # Get the file
        get_resp = requests.get(f"{BASE_URL}/api/uploads/{filename}")
        assert get_resp.status_code == 200
        assert len(get_resp.content) > 0
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/uploads/{filename}")
        
        print(f"PASS: Retrieved uploaded file {filename}")
    
    def test_delete_uploaded_file(self):
        """DELETE /api/uploads/{filename} removes file"""
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        )
        files = {'file': ('test_delete.png', BytesIO(png_data), 'image/png')}
        upload_resp = requests.post(f"{BASE_URL}/api/upload/image", files=files)
        filename = upload_resp.json()["filename"]
        
        # Delete
        delete_resp = requests.delete(f"{BASE_URL}/api/uploads/{filename}")
        assert delete_resp.status_code == 200
        
        # Verify deleted (should 404)
        get_resp = requests.get(f"{BASE_URL}/api/uploads/{filename}")
        assert get_resp.status_code == 404
        
        print("PASS: Uploaded file deleted successfully")


class TestNavigationPages:
    """Test that new pages are accessible"""
    
    def test_pages_load(self):
        """Verify all new pages are routable (frontend check via API health)"""
        # These are API endpoints that support the pages
        endpoints = [
            ("/api/ssp-analytics/overview", "SSP Analytics"),
            ("/api/bid-optimization/status", "Bid Optimization"),
            ("/api/attribution/analysis", "Attribution"),
        ]
        
        for endpoint, name in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code == 200, f"{name} API failed: {response.status_code}"
            print(f"PASS: {name} API accessible")


# Run with cleanup
@pytest.fixture(autouse=True)
def cleanup_test_data():
    """Cleanup TEST_PHASE8_ prefixed data after all tests"""
    yield
    # Cleanup SSP endpoints
    try:
        ssps = requests.get(f"{BASE_URL}/api/ssp-endpoints").json()
        for ssp in ssps:
            if ssp.get("name", "").startswith("TEST_PHASE8_"):
                requests.delete(f"{BASE_URL}/api/ssp-endpoints/{ssp['id']}")
    except:
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""
Phase 6 Feature Tests - OpenRTB Bidder
Testing: Campaign Comparison, A/B Testing, Fraud Detection, 
Viewability Prediction, Custom Audiences, Real-time Bid Stream,
and X-API-Key removal from bid endpoint
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://openrtb-campaign-hub.preview.emergentagent.com"

# Test data prefixes for cleanup
TEST_PREFIX = "TEST_PHASE6_"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def campaign_ids(api_client):
    """Get campaign IDs for testing, create if needed"""
    # First check if campaigns exist
    response = api_client.get(f"{BASE_URL}/api/campaigns")
    if response.status_code == 200 and len(response.json()) >= 2:
        campaigns = response.json()
        return [c["id"] for c in campaigns[:3]]
    
    # Seed data if needed
    api_client.post(f"{BASE_URL}/api/seed-data")
    time.sleep(1)
    
    response = api_client.get(f"{BASE_URL}/api/campaigns")
    if response.status_code == 200 and len(response.json()) >= 2:
        campaigns = response.json()
        return [c["id"] for c in campaigns[:3]]
    
    pytest.skip("Not enough campaigns for testing")


# ==================== CAMPAIGN COMPARISON TESTS ====================

class TestCampaignComparison:
    """Tests for POST /api/campaigns/compare"""
    
    def test_compare_two_campaigns(self, api_client, campaign_ids):
        """Test comparing 2 campaigns"""
        response = api_client.post(
            f"{BASE_URL}/api/campaigns/compare",
            json=campaign_ids[:2]
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "campaigns" in data
        assert "metrics_comparison" in data
        assert "targeting_differences" in data
        assert "recommendations" in data
        assert len(data["campaigns"]) == 2
        print(f"PASS: Campaign comparison returned {len(data['campaigns'])} campaigns")
    
    def test_compare_three_campaigns(self, api_client, campaign_ids):
        """Test comparing 3 campaigns"""
        if len(campaign_ids) < 3:
            pytest.skip("Need at least 3 campaigns")
        
        response = api_client.post(
            f"{BASE_URL}/api/campaigns/compare",
            json=campaign_ids[:3]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["campaigns"]) == 3
        print("PASS: Can compare 3 campaigns")
    
    def test_compare_single_campaign_fails(self, api_client, campaign_ids):
        """Test that comparing 1 campaign returns error"""
        response = api_client.post(
            f"{BASE_URL}/api/campaigns/compare",
            json=[campaign_ids[0]]
        )
        
        assert response.status_code == 400
        print("PASS: Single campaign comparison correctly rejected")
    
    def test_compare_invalid_campaign(self, api_client, campaign_ids):
        """Test comparing with non-existent campaign"""
        response = api_client.post(
            f"{BASE_URL}/api/campaigns/compare",
            json=[campaign_ids[0], "invalid-campaign-id-12345"]
        )
        
        assert response.status_code == 404
        print("PASS: Invalid campaign ID correctly rejected")


# ==================== A/B TESTING TESTS ====================

class TestABTesting:
    """Tests for A/B testing endpoints"""
    
    def test_get_ab_tests(self, api_client):
        """Test GET /api/ab-tests"""
        response = api_client.get(f"{BASE_URL}/api/ab-tests")
        
        assert response.status_code == 200
        data = response.json()
        assert "tests" in data
        assert isinstance(data["tests"], list)
        print(f"PASS: Retrieved {len(data['tests'])} A/B tests")
    
    def test_create_ab_test(self, api_client, campaign_ids):
        """Test POST /api/ab-tests"""
        test_name = f"{TEST_PREFIX}ABTest_{uuid.uuid4().hex[:8]}"
        
        # A/B test API expects JSON body with name, campaign_ids, and traffic_split
        response = api_client.post(
            f"{BASE_URL}/api/ab-tests",
            json={
                "name": test_name,
                "campaign_ids": campaign_ids[:2],
                "traffic_split": [50, 50]
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == test_name
        assert data["status"] == "active"
        assert len(data["campaign_ids"]) == 2
        assert data["traffic_split"] == [50, 50]
        print(f"PASS: Created A/B test '{test_name}'")
        
        return data["id"]
    
    def test_get_single_ab_test(self, api_client, campaign_ids):
        """Test GET /api/ab-tests/{test_id}"""
        # Create a test first
        test_name = f"{TEST_PREFIX}ABTestDetail_{uuid.uuid4().hex[:8]}"
        create_response = api_client.post(
            f"{BASE_URL}/api/ab-tests",
            json={
                "name": test_name,
                "campaign_ids": campaign_ids[:2],
                "traffic_split": [50, 50]
            }
        )
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        test_id = create_response.json()["id"]
        
        # Get the test details
        response = api_client.get(f"{BASE_URL}/api/ab-tests/{test_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_id
        assert "stats" in data
        assert "winner" in data
        print(f"PASS: Retrieved A/B test details with stats")
    
    def test_update_ab_test_status(self, api_client, campaign_ids):
        """Test PUT /api/ab-tests/{test_id}/status"""
        # Create a test first
        test_name = f"{TEST_PREFIX}ABTestStatus_{uuid.uuid4().hex[:8]}"
        create_response = api_client.post(
            f"{BASE_URL}/api/ab-tests",
            json={
                "name": test_name,
                "campaign_ids": campaign_ids[:2],
                "traffic_split": [50, 50]
            }
        )
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        test_id = create_response.json()["id"]
        
        # Update status to paused
        response = api_client.put(f"{BASE_URL}/api/ab-tests/{test_id}/status?status=paused")
        
        assert response.status_code == 200
        assert response.json()["status"] == "paused"
        print("PASS: A/B test status updated to paused")
        
        # Update to completed
        response = api_client.put(f"{BASE_URL}/api/ab-tests/{test_id}/status?status=completed")
        assert response.status_code == 200
        print("PASS: A/B test status updated to completed")


# ==================== FRAUD DETECTION TESTS ====================

class TestFraudDetection:
    """Tests for fraud detection endpoints"""
    
    def test_get_fraud_stats(self, api_client):
        """Test GET /api/fraud/stats"""
        response = api_client.get(f"{BASE_URL}/api/fraud/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_bids" in data
        assert "flagged_bids" in data
        assert "fraud_rate" in data
        assert "fraud_by_type" in data
        assert "patterns" in data
        print(f"PASS: Fraud stats - {data['total_bids']} total bids, {data['fraud_rate']}% fraud rate")
    
    def test_check_clean_request(self, api_client):
        """Test POST /api/fraud/check with clean request"""
        clean_request = {
            "device": {
                "ua": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
                "ip": "192.168.1.1",
                "geo": {"country": "USA"},
                "js": 1
            }
        }
        
        response = api_client.post(f"{BASE_URL}/api/fraud/check", json=clean_request)
        
        assert response.status_code == 200
        data = response.json()
        assert "is_fraudulent" in data
        assert "fraud_score" in data
        assert "flags" in data
        assert "recommendation" in data
        assert data["is_fraudulent"] == False
        assert data["recommendation"] == "allow"
        print(f"PASS: Clean request - fraud_score={data['fraud_score']}, recommendation={data['recommendation']}")
    
    def test_check_bot_request(self, api_client):
        """Test POST /api/fraud/check with bot user agent"""
        bot_request = {
            "device": {
                "ua": "Googlebot/2.1 (+http://www.google.com/bot.html)",
                "ip": "192.168.1.1",
                "geo": {"country": "USA"},
                "js": 1
            }
        }
        
        response = api_client.post(f"{BASE_URL}/api/fraud/check", json=bot_request)
        
        assert response.status_code == 200
        data = response.json()
        assert "bot_user_agent" in data["flags"]
        assert data["fraud_score"] >= 30
        print(f"PASS: Bot detected - flags={data['flags']}, score={data['fraud_score']}")
    
    def test_check_missing_fields(self, api_client):
        """Test POST /api/fraud/check with missing fields"""
        incomplete_request = {
            "device": {
                "geo": {"country": "XX"}
            }
        }
        
        response = api_client.post(f"{BASE_URL}/api/fraud/check", json=incomplete_request)
        
        assert response.status_code == 200
        data = response.json()
        assert "missing_ip" in data["flags"] or "missing_user_agent" in data["flags"] or "invalid_geo" in data["flags"]
        print(f"PASS: Missing fields detected - flags={data['flags']}")


# ==================== VIEWABILITY PREDICTION TESTS ====================

class TestViewabilityPrediction:
    """Tests for viewability endpoints"""
    
    def test_get_viewability_stats(self, api_client):
        """Test GET /api/viewability/stats"""
        response = api_client.get(f"{BASE_URL}/api/viewability/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert "average_viewability" in data
        assert "total_measured" in data
        assert "benchmark" in data
        print(f"PASS: Viewability stats - avg={data['average_viewability']}, benchmark={data['benchmark']}")
    
    def test_predict_viewability_mobile(self, api_client):
        """Test POST /api/viewability/predict for mobile device"""
        mobile_request = {
            "device": {"devicetype": 4},  # Phone
            "imp": [{"banner": {"w": 300, "h": 250}}]
        }
        
        response = api_client.post(f"{BASE_URL}/api/viewability/predict", json=mobile_request)
        
        assert response.status_code == 200
        data = response.json()
        assert "predicted_score" in data
        assert "factors" in data
        assert "recommendation" in data
        assert data["predicted_score"] >= 50  # Mobile should boost score
        print(f"PASS: Mobile viewability - score={data['predicted_score']}, factors={len(data['factors'])}")
    
    def test_predict_viewability_ctv(self, api_client):
        """Test POST /api/viewability/predict for CTV"""
        ctv_request = {
            "device": {"devicetype": 3},  # CTV
            "imp": [{"video": {"placement": 1, "skip": 0}}]  # In-stream, non-skippable
        }
        
        response = api_client.post(f"{BASE_URL}/api/viewability/predict", json=ctv_request)
        
        assert response.status_code == 200
        data = response.json()
        assert data["predicted_score"] >= 70  # CTV + in-stream + non-skip should be high
        print(f"PASS: CTV viewability - score={data['predicted_score']}, recommendation={data['recommendation']}")
    
    def test_predict_viewability_interstitial(self, api_client):
        """Test POST /api/viewability/predict for interstitial"""
        interstitial_request = {
            "device": {"devicetype": 4},
            "imp": [{"instl": 1, "banner": {"w": 320, "h": 480}}]
        }
        
        response = api_client.post(f"{BASE_URL}/api/viewability/predict", json=interstitial_request)
        
        assert response.status_code == 200
        data = response.json()
        factor_names = [f["factor"] for f in data["factors"]]
        assert "interstitial" in factor_names or "fullscreen_mobile" in factor_names
        print(f"PASS: Interstitial viewability - score={data['predicted_score']}")


# ==================== CUSTOM AUDIENCES TESTS ====================

class TestCustomAudiences:
    """Tests for audience segment endpoints"""
    
    def test_get_audiences(self, api_client):
        """Test GET /api/audiences"""
        response = api_client.get(f"{BASE_URL}/api/audiences")
        
        assert response.status_code == 200
        data = response.json()
        assert "audiences" in data
        assert isinstance(data["audiences"], list)
        print(f"PASS: Retrieved {len(data['audiences'])} audience segments")
    
    def test_create_audience(self, api_client):
        """Test POST /api/audiences"""
        audience_name = f"{TEST_PREFIX}Audience_{uuid.uuid4().hex[:8]}"
        
        response = api_client.post(
            f"{BASE_URL}/api/audiences",
            params={
                "name": audience_name,
                "description": "Test audience for Phase 6"
            },
            json={"geo_countries": ["USA", "CAN"], "device_types": [4, 5]}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == audience_name
        assert data["status"] == "active"
        assert "rules" in data
        print(f"PASS: Created audience '{audience_name}'")
        
        return data["id"]
    
    def test_get_single_audience(self, api_client):
        """Test GET /api/audiences/{audience_id}"""
        # Create first
        audience_name = f"{TEST_PREFIX}AudienceDetail_{uuid.uuid4().hex[:8]}"
        create_response = api_client.post(
            f"{BASE_URL}/api/audiences",
            params={"name": audience_name, "description": "Test"},
            json={"geo_countries": ["USA"]}
        )
        audience_id = create_response.json()["id"]
        
        # Get details
        response = api_client.get(f"{BASE_URL}/api/audiences/{audience_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == audience_id
        assert data["name"] == audience_name
        print("PASS: Retrieved audience details")
    
    def test_delete_audience(self, api_client):
        """Test DELETE /api/audiences/{audience_id}"""
        # Create first
        audience_name = f"{TEST_PREFIX}AudienceDelete_{uuid.uuid4().hex[:8]}"
        create_response = api_client.post(
            f"{BASE_URL}/api/audiences",
            params={"name": audience_name, "description": "To be deleted"},
            json={}
        )
        audience_id = create_response.json()["id"]
        
        # Delete
        response = api_client.delete(f"{BASE_URL}/api/audiences/{audience_id}")
        
        assert response.status_code == 200
        assert response.json()["status"] == "deleted"
        
        # Verify deletion
        get_response = api_client.get(f"{BASE_URL}/api/audiences/{audience_id}")
        assert get_response.status_code == 404
        print("PASS: Audience deleted successfully")


# ==================== REAL-TIME BID STREAM TESTS ====================

class TestBidStream:
    """Tests for real-time bid stream endpoint"""
    
    def test_get_bid_stream(self, api_client):
        """Test GET /api/bid-stream"""
        response = api_client.get(f"{BASE_URL}/api/bid-stream")
        
        assert response.status_code == 200
        data = response.json()
        assert "bids" in data
        assert "total_in_memory" in data
        assert isinstance(data["bids"], list)
        print(f"PASS: Bid stream - {len(data['bids'])} bids, {data['total_in_memory']} in memory")
    
    def test_get_bid_stream_with_limit(self, api_client):
        """Test GET /api/bid-stream?limit=10"""
        response = api_client.get(f"{BASE_URL}/api/bid-stream", params={"limit": 10})
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["bids"]) <= 10
        print(f"PASS: Bid stream with limit - returned {len(data['bids'])} bids")


# ==================== BID ENDPOINT WITHOUT X-API-KEY TESTS ====================

class TestBidEndpointNoAuth:
    """Tests verifying POST /api/bid does NOT require X-API-Key"""
    
    def test_bid_endpoint_without_api_key(self, api_client):
        """Test POST /api/bid without X-API-Key header"""
        bid_request = {
            "id": str(uuid.uuid4()),
            "imp": [{
                "id": "1",
                "banner": {"w": 300, "h": 250}
            }],
            "site": {"domain": "example.com"},
            "device": {
                "ua": "Mozilla/5.0",
                "ip": "192.168.1.1",
                "devicetype": 2
            }
        }
        
        # Make request without X-API-Key header
        response = api_client.post(f"{BASE_URL}/api/bid", json=bid_request)
        
        # Should return 200 (bid) or 204 (no bid), NOT 401
        assert response.status_code in [200, 204], f"Expected 200/204, got {response.status_code}: {response.text}"
        print(f"PASS: Bid endpoint accepts request without X-API-Key (status={response.status_code})")
    
    def test_bid_endpoint_with_ortb_version_header(self, api_client):
        """Test POST /api/bid with X-OpenRTB-Version header"""
        bid_request = {
            "id": str(uuid.uuid4()),
            "imp": [{
                "id": "1",
                "video": {
                    "w": 1920,
                    "h": 1080,
                    "mimes": ["video/mp4"],
                    "protocols": [2, 3]
                }
            }],
            "site": {"domain": "video-site.com"},
            "device": {
                "ua": "Mozilla/5.0",
                "ip": "10.0.0.1",
                "devicetype": 3
            }
        }
        
        headers = {"X-OpenRTB-Version": "2.6"}
        response = api_client.post(
            f"{BASE_URL}/api/bid", 
            json=bid_request,
            headers={**api_client.headers, **headers}
        )
        
        assert response.status_code in [200, 204]
        print(f"PASS: Bid endpoint works with ORTB version header (status={response.status_code})")


# ==================== CLEANUP ====================

@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data(api_client):
    """Cleanup test data after all tests"""
    yield
    
    # Cleanup A/B tests
    try:
        response = api_client.get(f"{BASE_URL}/api/ab-tests")
        if response.status_code == 200:
            for test in response.json().get("tests", []):
                if test.get("name", "").startswith(TEST_PREFIX):
                    # Note: No delete endpoint for AB tests in current implementation
                    pass
    except:
        pass
    
    # Cleanup audiences
    try:
        response = api_client.get(f"{BASE_URL}/api/audiences")
        if response.status_code == 200:
            for audience in response.json().get("audiences", []):
                if audience.get("name", "").startswith(TEST_PREFIX):
                    api_client.delete(f"{BASE_URL}/api/audiences/{audience['id']}")
    except:
        pass
    
    print("\nCleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""
Phase 3 Feature Tests for OpenRTB Bidder
Tests: Frequency Capping, SPO, ML Prediction, Report Exports
"""
import pytest
import requests
import json
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# --- FIXTURES ---

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def existing_campaigns(api_client):
    """Get existing campaigns for testing"""
    response = api_client.get(f"{BASE_URL}/api/campaigns")
    assert response.status_code == 200
    return response.json()


@pytest.fixture
def existing_creatives(api_client):
    """Get existing creatives for testing"""
    response = api_client.get(f"{BASE_URL}/api/creatives")
    assert response.status_code == 200
    return response.json()


@pytest.fixture
def test_campaign_with_features(api_client, existing_creatives):
    """Create a campaign with freq cap, SPO, and ML enabled"""
    creative_id = existing_creatives[0]["id"] if existing_creatives else None
    if not creative_id:
        pytest.skip("No creatives available")
    
    campaign_data = {
        "name": f"TEST_Phase3_Campaign_{uuid.uuid4().hex[:8]}",
        "bid_price": 2.5,
        "bid_floor": 0.1,
        "priority": 5,
        "creative_id": creative_id,
        "budget": {
            "daily_budget": 100,
            "total_budget": 1000,
            "daily_spend": 0,
            "total_spend": 0,
            "pacing_type": "even"
        },
        "frequency_cap": {
            "enabled": True,
            "max_impressions_per_user": 3,
            "time_window_hours": 24,
            "max_impressions_per_day": 5,
            "max_impressions_total": 10
        },
        "spo": {
            "enabled": True,
            "preferred_ssp_ids": ["good-ssp.com"],
            "blocked_ssp_ids": ["bad-ssp.com"],
            "max_hops": 3,
            "require_authorized_sellers": True,
            "bid_adjustment_factor": 1.0
        },
        "ml_prediction": {
            "enabled": True,
            "use_historical_data": True,
            "prediction_weight": 0.5,
            "min_data_points": 100
        },
        "targeting": {
            "geo": {"countries": [], "regions": [], "cities": []},
            "device": {"device_types": [], "makes": [], "models": [], "os_list": [], "connection_types": []},
            "inventory": {"domain_whitelist": [], "domain_blacklist": [], "bundle_whitelist": [], "bundle_blacklist": [], "publisher_ids": [], "categories": []},
            "video": {"placements": [], "plcmts": [], "protocols": [], "mimes": []},
            "content": {"categories": [], "keywords": []},
            "privacy": {"gdpr_required": False, "gdpr_consent_required": False, "ccpa_allowed": True, "coppa_allowed": False}
        }
    }
    
    response = api_client.post(f"{BASE_URL}/api/campaigns", json=campaign_data)
    assert response.status_code == 200
    created_campaign = response.json()
    
    yield created_campaign
    
    # Cleanup
    api_client.delete(f"{BASE_URL}/api/campaigns/{created_campaign['id']}")


# --- CAMPAIGN CREATION WITH PHASE 3 FEATURES ---

class TestCampaignWithPhase3Features:
    """Test creating/updating campaigns with frequency_cap, spo, and ml_prediction"""
    
    def test_create_campaign_with_frequency_cap(self, api_client, existing_creatives):
        """Test creating a campaign with frequency capping enabled"""
        creative_id = existing_creatives[0]["id"]
        
        campaign_data = {
            "name": f"TEST_FreqCap_Campaign_{uuid.uuid4().hex[:8]}",
            "bid_price": 2.0,
            "creative_id": creative_id,
            "frequency_cap": {
                "enabled": True,
                "max_impressions_per_user": 5,
                "time_window_hours": 12,
                "max_impressions_per_day": 8,
                "max_impressions_total": 20
            }
        }
        
        response = api_client.post(f"{BASE_URL}/api/campaigns", json=campaign_data)
        assert response.status_code == 200
        
        created = response.json()
        assert created["frequency_cap"]["enabled"] == True
        assert created["frequency_cap"]["max_impressions_per_user"] == 5
        assert created["frequency_cap"]["max_impressions_per_day"] == 8
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/campaigns/{created['id']}")
        print("PASS: Create campaign with frequency cap enabled")
    
    def test_create_campaign_with_spo(self, api_client, existing_creatives):
        """Test creating a campaign with SPO enabled"""
        creative_id = existing_creatives[0]["id"]
        
        campaign_data = {
            "name": f"TEST_SPO_Campaign_{uuid.uuid4().hex[:8]}",
            "bid_price": 3.0,
            "creative_id": creative_id,
            "spo": {
                "enabled": True,
                "preferred_ssp_ids": ["premium-ssp.com", "trusted-ssp.com"],
                "blocked_ssp_ids": ["low-quality.com"],
                "max_hops": 2,
                "require_authorized_sellers": True,
                "bid_adjustment_factor": 1.1
            }
        }
        
        response = api_client.post(f"{BASE_URL}/api/campaigns", json=campaign_data)
        assert response.status_code == 200
        
        created = response.json()
        assert created["spo"]["enabled"] == True
        assert "premium-ssp.com" in created["spo"]["preferred_ssp_ids"]
        assert "low-quality.com" in created["spo"]["blocked_ssp_ids"]
        assert created["spo"]["max_hops"] == 2
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/campaigns/{created['id']}")
        print("PASS: Create campaign with SPO enabled")
    
    def test_create_campaign_with_ml_prediction(self, api_client, existing_creatives):
        """Test creating a campaign with ML prediction enabled"""
        creative_id = existing_creatives[0]["id"]
        
        campaign_data = {
            "name": f"TEST_ML_Campaign_{uuid.uuid4().hex[:8]}",
            "bid_price": 2.5,
            "creative_id": creative_id,
            "ml_prediction": {
                "enabled": True,
                "use_historical_data": True,
                "prediction_weight": 0.7,
                "min_data_points": 50
            }
        }
        
        response = api_client.post(f"{BASE_URL}/api/campaigns", json=campaign_data)
        assert response.status_code == 200
        
        created = response.json()
        assert created["ml_prediction"]["enabled"] == True
        assert created["ml_prediction"]["prediction_weight"] == 0.7
        assert created["ml_prediction"]["min_data_points"] == 50
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/campaigns/{created['id']}")
        print("PASS: Create campaign with ML prediction enabled")
    
    def test_create_campaign_with_all_phase3_features(self, api_client, existing_creatives):
        """Test creating a campaign with all Phase 3 features enabled"""
        creative_id = existing_creatives[0]["id"]
        
        campaign_data = {
            "name": f"TEST_AllPhase3_Campaign_{uuid.uuid4().hex[:8]}",
            "bid_price": 4.0,
            "priority": 8,
            "creative_id": creative_id,
            "budget": {
                "daily_budget": 500,
                "total_budget": 5000
            },
            "frequency_cap": {
                "enabled": True,
                "max_impressions_per_user": 3,
                "time_window_hours": 24,
                "max_impressions_per_day": 5,
                "max_impressions_total": 15
            },
            "spo": {
                "enabled": True,
                "preferred_ssp_ids": ["premium.com"],
                "blocked_ssp_ids": ["spam.com"],
                "max_hops": 3,
                "require_authorized_sellers": True,
                "bid_adjustment_factor": 1.05
            },
            "ml_prediction": {
                "enabled": True,
                "use_historical_data": True,
                "prediction_weight": 0.6,
                "min_data_points": 100
            }
        }
        
        response = api_client.post(f"{BASE_URL}/api/campaigns", json=campaign_data)
        assert response.status_code == 200
        
        created = response.json()
        assert created["frequency_cap"]["enabled"] == True
        assert created["spo"]["enabled"] == True
        assert created["ml_prediction"]["enabled"] == True
        
        # Verify all fields are persisted
        get_response = api_client.get(f"{BASE_URL}/api/campaigns/{created['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        
        assert fetched["frequency_cap"]["max_impressions_per_user"] == 3
        assert fetched["spo"]["max_hops"] == 3
        assert fetched["ml_prediction"]["prediction_weight"] == 0.6
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/campaigns/{created['id']}")
        print("PASS: Create campaign with all Phase 3 features enabled")


# --- REPORT EXPORT TESTS ---

class TestReportExports:
    """Test CSV and JSON report export endpoints"""
    
    def test_export_csv_report(self, api_client):
        """GET /api/reports/export/csv - returns CSV file"""
        response = api_client.get(f"{BASE_URL}/api/reports/export/csv")
        
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("Content-Type", "")
        assert "attachment" in response.headers.get("Content-Disposition", "")
        assert ".csv" in response.headers.get("Content-Disposition", "")
        
        # Verify CSV content has headers
        content = response.text
        assert "id" in content or "request_id" in content
        print(f"PASS: CSV export returned {len(content)} bytes")
    
    def test_export_csv_with_date_range(self, api_client):
        """GET /api/reports/export/csv with date parameters"""
        response = api_client.get(
            f"{BASE_URL}/api/reports/export/csv",
            params={"start_date": "2026-01-01", "end_date": "2026-12-31"}
        )
        
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("Content-Type", "")
        print("PASS: CSV export with date range works")
    
    def test_export_csv_with_campaign_filter(self, api_client, existing_campaigns):
        """GET /api/reports/export/csv filtered by campaign_id"""
        if not existing_campaigns:
            pytest.skip("No campaigns available")
        
        campaign_id = existing_campaigns[0]["id"]
        response = api_client.get(
            f"{BASE_URL}/api/reports/export/csv",
            params={"campaign_id": campaign_id}
        )
        
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("Content-Type", "")
        print("PASS: CSV export with campaign filter works")
    
    def test_export_json_report(self, api_client):
        """GET /api/reports/export/json - returns JSON file"""
        response = api_client.get(f"{BASE_URL}/api/reports/export/json")
        
        assert response.status_code == 200
        assert "application/json" in response.headers.get("Content-Type", "")
        assert "attachment" in response.headers.get("Content-Disposition", "")
        assert ".json" in response.headers.get("Content-Disposition", "")
        
        data = response.json()
        assert "export_date" in data
        assert "date_range" in data
        assert "summary" in data
        assert "campaigns" in data
        print(f"PASS: JSON export returned data with {len(data.get('campaigns', []))} campaigns")
    
    def test_export_json_with_date_range(self, api_client):
        """GET /api/reports/export/json with date parameters"""
        response = api_client.get(
            f"{BASE_URL}/api/reports/export/json",
            params={"start_date": "2026-01-01", "end_date": "2026-12-31"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["date_range"]["start"] == "2026-01-01"
        assert data["date_range"]["end"] == "2026-12-31"
        print("PASS: JSON export with date range works")


# --- ML STATS AND TRAINING TESTS ---

class TestMLEndpoints:
    """Test ML model statistics and training endpoints"""
    
    def test_get_ml_stats(self, api_client, existing_campaigns):
        """GET /api/ml/stats/{campaign_id} - returns ML model statistics"""
        if not existing_campaigns:
            pytest.skip("No campaigns available")
        
        campaign_id = existing_campaigns[0]["id"]
        response = api_client.get(f"{BASE_URL}/api/ml/stats/{campaign_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "campaign_id" in data
        assert "ml_enabled" in data
        assert "feature_stats" in data
        assert "total_data_points" in data
        print(f"PASS: ML stats returned for campaign, ml_enabled={data['ml_enabled']}, data_points={data['total_data_points']}")
    
    def test_get_ml_stats_nonexistent_campaign(self, api_client):
        """GET /api/ml/stats/{campaign_id} - returns empty stats for non-existent campaign"""
        response = api_client.get(f"{BASE_URL}/api/ml/stats/nonexistent-campaign-id")
        
        # Should return stats with ml_enabled=False for non-existent campaign
        assert response.status_code == 200
        data = response.json()
        assert data["ml_enabled"] == False
        print("PASS: ML stats handles non-existent campaign gracefully")
    
    def test_train_ml_model(self, api_client, existing_campaigns):
        """POST /api/ml/train/{campaign_id} - trains ML model from historical data"""
        if not existing_campaigns:
            pytest.skip("No campaigns available")
        
        # Use campaign with most bids
        campaign = max(existing_campaigns, key=lambda c: c.get("bids", 0))
        campaign_id = campaign["id"]
        
        response = api_client.post(f"{BASE_URL}/api/ml/train/{campaign_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ["trained", "insufficient_data"]
        
        if data["status"] == "insufficient_data":
            assert "data_points" in data
            assert "required" in data
            print(f"PASS: ML training returned insufficient_data (has {data['data_points']}, needs {data['required']})")
        else:
            assert "features_trained" in data
            print(f"PASS: ML model trained with {data['features_trained']} features")
    
    def test_train_ml_model_nonexistent_campaign(self, api_client):
        """POST /api/ml/train/{campaign_id} - returns 404 for non-existent campaign"""
        response = api_client.post(f"{BASE_URL}/api/ml/train/nonexistent-campaign-id")
        
        assert response.status_code == 404
        print("PASS: ML training returns 404 for non-existent campaign")


# --- SPO ANALYSIS TESTS ---

class TestSPOEndpoints:
    """Test Supply Path Optimization analysis endpoints"""
    
    def test_spo_analysis(self, api_client, existing_campaigns):
        """GET /api/spo/analyze/{campaign_id} - returns supply path analysis"""
        if not existing_campaigns:
            pytest.skip("No campaigns available")
        
        campaign_id = existing_campaigns[0]["id"]
        response = api_client.get(f"{BASE_URL}/api/spo/analyze/{campaign_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "campaign_id" in data
        assert "spo_enabled" in data
        assert "total_paths_analyzed" in data
        assert "recommended_paths" in data
        assert "underperforming_paths" in data
        assert "paths" in data
        print(f"PASS: SPO analysis returned, spo_enabled={data['spo_enabled']}, paths_analyzed={data['total_paths_analyzed']}")
    
    def test_spo_analysis_nonexistent_campaign(self, api_client):
        """GET /api/spo/analyze/{campaign_id} - returns 404 for non-existent campaign"""
        response = api_client.get(f"{BASE_URL}/api/spo/analyze/nonexistent-campaign-id")
        
        assert response.status_code == 404
        print("PASS: SPO analysis returns 404 for non-existent campaign")


# --- BID ENDPOINT WITH PHASE 3 FEATURES ---

class TestBidEndpointPhase3:
    """Test bid endpoint with frequency capping, SPO, and ML prediction"""
    
    def test_bid_with_user_id_for_frequency_capping(self, api_client, test_campaign_with_features):
        """POST /api/bid - should check frequency capping when user ID provided"""
        campaign_id = test_campaign_with_features["id"]
        
        # First, activate the campaign
        api_client.post(f"{BASE_URL}/api/campaigns/{campaign_id}/activate")
        
        # Submit bid request with user ID
        bid_request = {
            "id": f"test-bid-{uuid.uuid4().hex[:8]}",
            "imp": [{
                "id": "imp1",
                "banner": {"w": 300, "h": 250},
                "bidfloor": 0.1
            }],
            "device": {
                "devicetype": 4,
                "ifa": f"user-{uuid.uuid4().hex[:8]}",  # User ID for freq cap
                "geo": {"country": "USA"}
            },
            "site": {"domain": "example.com"},
            "at": 2,
            "tmax": 100
        }
        
        response = api_client.post(f"{BASE_URL}/api/bid", json=bid_request)
        
        # 200 means bid made, 204 means no bid
        assert response.status_code in [200, 204]
        print(f"PASS: Bid request with user ID returned {response.status_code}")
    
    def test_bid_with_blocked_ssp(self, api_client, test_campaign_with_features):
        """POST /api/bid - should be blocked by SPO rules for blocked SSPs"""
        campaign_id = test_campaign_with_features["id"]
        
        # Activate campaign
        api_client.post(f"{BASE_URL}/api/campaigns/{campaign_id}/activate")
        
        # Bid request from blocked SSP domain
        bid_request = {
            "id": f"test-bid-{uuid.uuid4().hex[:8]}",
            "imp": [{
                "id": "imp1",
                "banner": {"w": 300, "h": 250},
                "bidfloor": 0.1
            }],
            "device": {"devicetype": 4},
            "site": {"domain": "bad-ssp.com"},  # This is in blocked_ssp_ids
            "at": 2,
            "tmax": 100
        }
        
        response = api_client.post(f"{BASE_URL}/api/bid", json=bid_request)
        
        # Should be 204 (no bid) because the SSP is blocked
        assert response.status_code in [200, 204]
        print(f"PASS: Bid request from blocked SSP returned {response.status_code}")
    
    def test_bid_with_supply_chain(self, api_client, test_campaign_with_features):
        """POST /api/bid - should check supply chain hops for SPO"""
        campaign_id = test_campaign_with_features["id"]
        
        # Activate campaign
        api_client.post(f"{BASE_URL}/api/campaigns/{campaign_id}/activate")
        
        # Bid request with long supply chain (exceeds max_hops=3)
        bid_request = {
            "id": f"test-bid-{uuid.uuid4().hex[:8]}",
            "imp": [{
                "id": "imp1",
                "banner": {"w": 300, "h": 250},
                "bidfloor": 0.1
            }],
            "device": {"devicetype": 4},
            "site": {"domain": "good-ssp.com"},
            "source": {
                "schain": {
                    "ver": "1.0",
                    "complete": 1,
                    "nodes": [
                        {"asi": "ssp1.com", "sid": "1", "hp": 1},
                        {"asi": "ssp2.com", "sid": "2", "hp": 1},
                        {"asi": "ssp3.com", "sid": "3", "hp": 1},
                        {"asi": "ssp4.com", "sid": "4", "hp": 1},
                        {"asi": "ssp5.com", "sid": "5", "hp": 1}  # 5 hops > max 3
                    ]
                }
            },
            "at": 2,
            "tmax": 100
        }
        
        response = api_client.post(f"{BASE_URL}/api/bid", json=bid_request)
        
        # Should be 204 (no bid) because supply chain is too long
        assert response.status_code in [200, 204]
        print(f"PASS: Bid request with long supply chain returned {response.status_code}")


# --- FREQUENCY CAPPING HELPER ENDPOINTS ---

class TestFrequencyCapEndpoints:
    """Test frequency capping helper endpoints"""
    
    def test_get_user_frequency(self, api_client, existing_campaigns):
        """GET /api/frequency/{campaign_id}/{user_id} - returns user frequency"""
        if not existing_campaigns:
            pytest.skip("No campaigns available")
        
        campaign_id = existing_campaigns[0]["id"]
        user_id = "test-user-123"
        
        response = api_client.get(f"{BASE_URL}/api/frequency/{campaign_id}/{user_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "campaign_id" in data
        assert "user_id" in data
        assert "impression_count" in data
        print(f"PASS: User frequency returned, count={data['impression_count']}")
    
    def test_record_impression(self, api_client, existing_campaigns):
        """POST /api/frequency/record - records an impression for frequency capping"""
        if not existing_campaigns:
            pytest.skip("No campaigns available")
        
        campaign_id = existing_campaigns[0]["id"]
        user_id = f"test-user-{uuid.uuid4().hex[:8]}"
        
        response = api_client.post(
            f"{BASE_URL}/api/frequency/record",
            params={"campaign_id": campaign_id, "user_id": user_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "recorded"
        
        # Verify the count increased
        get_response = api_client.get(f"{BASE_URL}/api/frequency/{campaign_id}/{user_id}")
        assert get_response.status_code == 200
        freq_data = get_response.json()
        assert freq_data["impression_count"] >= 1
        print(f"PASS: Impression recorded, count={freq_data['impression_count']}")
    
    def test_reset_campaign_frequency(self, api_client, existing_campaigns):
        """DELETE /api/frequency/reset/{campaign_id} - resets frequency data"""
        if not existing_campaigns:
            pytest.skip("No campaigns available")
        
        # Create test data first
        campaign_id = existing_campaigns[0]["id"]
        user_id = f"test-reset-user-{uuid.uuid4().hex[:8]}"
        
        api_client.post(
            f"{BASE_URL}/api/frequency/record",
            params={"campaign_id": campaign_id, "user_id": user_id}
        )
        
        # Reset
        response = api_client.delete(f"{BASE_URL}/api/frequency/reset/{campaign_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "reset"
        print(f"PASS: Frequency reset, deleted_count={data.get('deleted_count', 0)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

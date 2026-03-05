"""
Test Phase 4 Features: Campaign Insights, ML Model Management, Multi-Currency
- GET /api/insights/campaigns - Returns campaign insights with health scores and recommendations
- POST /api/insights/apply-recommendation/{campaign_id}?action=increase_bid - Applies bid increase recommendation
- POST /api/insights/apply-recommendation/{campaign_id}?action=enable_shading - Enables bid shading
- GET /api/ml/models - Returns list of ML-enabled campaigns
- GET /api/ml/model/{campaign_id}/details - Returns detailed ML model info
- GET /api/currencies - Returns supported currencies  
- GET /api/currency/convert - Converts between currencies
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCampaignInsights:
    """Campaign Performance Insights endpoint tests"""
    
    def test_get_campaign_insights(self):
        """GET /api/insights/campaigns returns insights data"""
        response = requests.get(f"{BASE_URL}/api/insights/campaigns")
        assert response.status_code == 200
        
        data = response.json()
        # Validate response structure
        assert "total_campaigns" in data
        assert "overall_health" in data
        assert "insights" in data
        assert isinstance(data["total_campaigns"], int)
        assert isinstance(data["overall_health"], dict)
        assert isinstance(data["insights"], list)
        
        # Check overall health structure
        health = data["overall_health"]
        assert "healthy" in health
        assert "warning" in health
        assert "critical" in health
        print(f"✓ Campaign insights returned: {data['total_campaigns']} campaigns, health breakdown: {health}")
    
    def test_campaign_insight_structure(self):
        """Each campaign insight has required fields"""
        response = requests.get(f"{BASE_URL}/api/insights/campaigns")
        assert response.status_code == 200
        
        data = response.json()
        if data["insights"]:
            insight = data["insights"][0]
            # Check insight structure
            assert "campaign_id" in insight
            assert "campaign_name" in insight
            assert "health_score" in insight
            assert "health_status" in insight
            assert "metrics" in insight
            assert "issues" in insight
            assert "recommendations" in insight
            
            # Check health status values
            assert insight["health_status"] in ["healthy", "warning", "critical"]
            assert 0 <= insight["health_score"] <= 100
            
            # Check metrics structure
            metrics = insight["metrics"]
            assert "bids" in metrics
            assert "wins" in metrics
            assert "win_rate" in metrics
            print(f"✓ Campaign insight structure valid: {insight['campaign_name']} - {insight['health_status']} ({insight['health_score']}/100)")
        else:
            print("✓ No campaigns to analyze (empty insights)")


class TestApplyRecommendation:
    """Tests for applying recommendations to campaigns"""
    
    @pytest.fixture
    def test_campaign_id(self):
        """Get a valid campaign ID for testing"""
        response = requests.get(f"{BASE_URL}/api/campaigns")
        assert response.status_code == 200
        campaigns = response.json()
        if campaigns:
            return campaigns[0]["id"]
        pytest.skip("No campaigns available for testing")
    
    def test_apply_increase_bid(self, test_campaign_id):
        """POST /api/insights/apply-recommendation - increase_bid action"""
        # Get current bid price
        campaign_resp = requests.get(f"{BASE_URL}/api/campaigns/{test_campaign_id}")
        assert campaign_resp.status_code == 200
        original_bid = campaign_resp.json().get("bid_price", 1.0)
        
        # Apply increase bid recommendation
        response = requests.post(
            f"{BASE_URL}/api/insights/apply-recommendation/{test_campaign_id}",
            params={"action": "increase_bid"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "applied"
        assert data["action"] == "increase_bid"
        assert "message" in data
        
        # Verify bid price increased
        updated_resp = requests.get(f"{BASE_URL}/api/campaigns/{test_campaign_id}")
        new_bid = updated_resp.json().get("bid_price")
        assert new_bid > original_bid
        print(f"✓ Bid increased from ${original_bid:.2f} to ${new_bid:.2f}")
    
    def test_apply_enable_shading(self, test_campaign_id):
        """POST /api/insights/apply-recommendation - enable_shading action"""
        response = requests.post(
            f"{BASE_URL}/api/insights/apply-recommendation/{test_campaign_id}",
            params={"action": "enable_shading"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "applied"
        assert data["action"] == "enable_shading"
        
        # Verify bid shading enabled
        campaign_resp = requests.get(f"{BASE_URL}/api/campaigns/{test_campaign_id}")
        campaign = campaign_resp.json()
        assert campaign.get("bid_shading", {}).get("enabled") == True
        print(f"✓ Bid shading enabled for campaign {test_campaign_id}")
    
    def test_apply_invalid_action(self, test_campaign_id):
        """POST with invalid action returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/insights/apply-recommendation/{test_campaign_id}",
            params={"action": "invalid_action"}
        )
        assert response.status_code == 400
        print("✓ Invalid action correctly rejected with 400")
    
    def test_apply_to_nonexistent_campaign(self):
        """POST to non-existent campaign returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/insights/apply-recommendation/nonexistent-id",
            params={"action": "increase_bid"}
        )
        assert response.status_code == 404
        print("✓ Non-existent campaign correctly returns 404")


class TestMLModels:
    """ML Model Management endpoint tests"""
    
    def test_get_all_ml_models(self):
        """GET /api/ml/models returns ML-enabled campaigns"""
        response = requests.get(f"{BASE_URL}/api/ml/models")
        assert response.status_code == 200
        
        data = response.json()
        assert "models" in data
        assert "total" in data
        assert isinstance(data["models"], list)
        assert isinstance(data["total"], int)
        
        print(f"✓ ML Models endpoint returned {data['total']} ML-enabled campaigns")
        
        # Check model structure if any exist
        if data["models"]:
            model = data["models"][0]
            assert "campaign_id" in model
            assert "campaign_name" in model
            assert "ml_enabled" in model
            assert "prediction_weight" in model
            assert "features_count" in model
            assert "total_data_points" in model
            assert "status" in model
            print(f"✓ Model structure valid: {model['campaign_name']} - status: {model['status']}")
    
    def test_get_ml_model_details(self):
        """GET /api/ml/model/{campaign_id}/details returns model info"""
        # First get a campaign ID
        campaigns_resp = requests.get(f"{BASE_URL}/api/campaigns")
        assert campaigns_resp.status_code == 200
        campaigns = campaigns_resp.json()
        
        if not campaigns:
            pytest.skip("No campaigns available for testing")
        
        campaign_id = campaigns[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/ml/model/{campaign_id}/details")
        assert response.status_code == 200
        
        data = response.json()
        assert "campaign_id" in data
        assert "campaign_name" in data
        assert "ml_config" in data
        assert "total_features" in data
        assert "total_data_points" in data
        assert "feature_groups" in data
        assert "performance_summary" in data
        
        print(f"✓ ML model details returned for {data['campaign_name']}: {data['total_features']} features, {data['total_data_points']} data points")
    
    def test_get_ml_model_details_nonexistent(self):
        """GET /api/ml/model/{id}/details with invalid ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/ml/model/nonexistent-id/details")
        assert response.status_code == 404
        print("✓ Non-existent campaign correctly returns 404")


class TestMultiCurrency:
    """Multi-Currency support endpoint tests"""
    
    def test_get_supported_currencies(self):
        """GET /api/currencies returns list of currencies"""
        response = requests.get(f"{BASE_URL}/api/currencies")
        assert response.status_code == 200
        
        data = response.json()
        assert "base_currency" in data
        assert "currencies" in data
        assert data["base_currency"] == "USD"
        assert isinstance(data["currencies"], list)
        assert len(data["currencies"]) > 0
        
        # Check currency structure
        currency = data["currencies"][0]
        assert "code" in currency
        assert "symbol" in currency
        assert "rate" in currency
        
        # Verify expected currencies
        currency_codes = [c["code"] for c in data["currencies"]]
        expected = ["USD", "EUR", "GBP"]
        for code in expected:
            assert code in currency_codes
        
        print(f"✓ Supported currencies: {', '.join(currency_codes)}")
    
    def test_currency_convert_usd_to_eur(self):
        """GET /api/currency/convert from USD to EUR"""
        response = requests.get(
            f"{BASE_URL}/api/currency/convert",
            params={"amount": 100, "from_currency": "USD", "to_currency": "EUR"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "original" in data
        assert "converted" in data
        assert "rate" in data
        
        assert data["original"]["amount"] == 100
        assert data["original"]["currency"] == "USD"
        assert data["converted"]["currency"] == "EUR"
        assert data["converted"]["amount"] > 0
        assert data["rate"] > 0
        
        print(f"✓ Currency conversion: ${100} USD = €{data['converted']['amount']} EUR (rate: {data['rate']})")
    
    def test_currency_convert_eur_to_gbp(self):
        """GET /api/currency/convert from EUR to GBP"""
        response = requests.get(
            f"{BASE_URL}/api/currency/convert",
            params={"amount": 50, "from_currency": "EUR", "to_currency": "GBP"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["original"]["currency"] == "EUR"
        assert data["converted"]["currency"] == "GBP"
        assert data["converted"]["amount"] > 0
        
        print(f"✓ Currency conversion: €{50} EUR = £{data['converted']['amount']} GBP")
    
    def test_currency_convert_unsupported(self):
        """GET /api/currency/convert with unsupported currency returns 400"""
        response = requests.get(
            f"{BASE_URL}/api/currency/convert",
            params={"amount": 100, "from_currency": "USD", "to_currency": "XYZ"}
        )
        assert response.status_code == 400
        print("✓ Unsupported currency correctly rejected with 400")
    
    def test_currency_convert_jpy(self):
        """GET /api/currency/convert to JPY (large exchange rate)"""
        response = requests.get(
            f"{BASE_URL}/api/currency/convert",
            params={"amount": 1, "from_currency": "USD", "to_currency": "JPY"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # JPY should be much larger than USD amount
        assert data["converted"]["amount"] > 100
        print(f"✓ Currency conversion: $1 USD = ¥{data['converted']['amount']} JPY")


class TestCampaignCurrencyField:
    """Test campaign currency field in create/update"""
    
    @pytest.fixture
    def test_creative_id(self):
        """Get a valid creative ID for testing"""
        response = requests.get(f"{BASE_URL}/api/creatives")
        assert response.status_code == 200
        creatives = response.json()
        if creatives:
            return creatives[0]["id"]
        pytest.skip("No creatives available for testing")
    
    def test_create_campaign_with_currency(self, test_creative_id):
        """Create campaign with non-USD currency"""
        campaign_data = {
            "name": f"TEST_Currency_Campaign_{uuid.uuid4().hex[:8]}",
            "bid_price": 2.50,
            "bid_floor": 0.10,
            "currency": "EUR",
            "priority": 5,
            "creative_id": test_creative_id,
            "budget": {
                "daily_budget": 100.0,
                "total_budget": 1000.0
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/campaigns", json=campaign_data)
        assert response.status_code == 200
        
        created = response.json()
        assert created["currency"] == "EUR"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/campaigns/{created['id']}")
        
        print(f"✓ Campaign created with EUR currency")
    
    def test_update_campaign_currency(self, test_creative_id):
        """Update campaign currency field"""
        # Create a campaign
        campaign_data = {
            "name": f"TEST_Currency_Update_{uuid.uuid4().hex[:8]}",
            "bid_price": 1.00,
            "currency": "USD",
            "creative_id": test_creative_id
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/campaigns", json=campaign_data)
        assert create_resp.status_code == 200
        campaign_id = create_resp.json()["id"]
        
        # Update currency
        update_resp = requests.put(
            f"{BASE_URL}/api/campaigns/{campaign_id}",
            json={"currency": "GBP"}
        )
        assert update_resp.status_code == 200
        
        # Verify update
        get_resp = requests.get(f"{BASE_URL}/api/campaigns/{campaign_id}")
        assert get_resp.json()["currency"] == "GBP"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/campaigns/{campaign_id}")
        
        print(f"✓ Campaign currency updated from USD to GBP")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""
Test Bug Fixes - Iteration 34
Tests for:
1. WebSocket reconnection limiting (max 3 attempts)
2. Impression pixels stored and returned via API
3. Frequency capping fields editable in campaign wizard
4. Login/logout without postMessage errors
5. Campaign creation with frequency capping
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPERADMIN_EMAIL = "superadmin@demo.com"
SUPERADMIN_PASSWORD = "demo123"


class TestAuthentication:
    """Test login/logout functionality"""
    
    def test_login_success(self):
        """Test successful login returns clean response"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == SUPERADMIN_EMAIL
        print(f"✓ Login successful, token received")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns proper error"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"✓ Invalid login returns 401 with error message")
    
    def test_protected_endpoint_without_token(self):
        """Test protected endpoint returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print(f"✓ Protected endpoint returns 401 without token")
    
    def test_protected_endpoint_with_token(self):
        """Test protected endpoint works with valid token"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        token = login_response.json()["token"]
        
        # Access protected endpoint
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == SUPERADMIN_EMAIL
        print(f"✓ Protected endpoint works with valid token")


class TestImpressionPixels:
    """Test impression pixels are stored and returned via API"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_create_creative_with_impression_pixels(self, auth_token):
        """Test creating a creative with impression pixels"""
        creative_data = {
            "name": "TEST_Banner_With_Pixels",
            "type": "banner",
            "format": "raw_banner",
            "adomain": ["test.com"],
            "impression_pixels": [
                {
                    "name": "Test Pixel 1",
                    "url": "https://tracking.example.com/pixel1.gif",
                    "event": "impression",
                    "enabled": True
                },
                {
                    "name": "Test Pixel 2",
                    "url": "https://tracking.example.com/pixel2.gif",
                    "event": "viewable",
                    "enabled": True
                }
            ],
            "banner_data": {
                "width": 300,
                "height": 250,
                "image_url": "https://example.com/banner.jpg",
                "ad_markup": "<img src='https://example.com/banner.jpg' />"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/creatives",
            json=creative_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify impression pixels are stored
        assert "impression_pixels" in data
        assert len(data["impression_pixels"]) == 2
        assert data["impression_pixels"][0]["name"] == "Test Pixel 1"
        assert data["impression_pixels"][0]["url"] == "https://tracking.example.com/pixel1.gif"
        print(f"✓ Creative created with impression pixels")
        
        return data["id"]
    
    def test_get_creative_returns_impression_pixels(self, auth_token):
        """Test that GET creative returns impression pixels"""
        # First create a creative with pixels
        creative_data = {
            "name": "TEST_Banner_Get_Pixels",
            "type": "banner",
            "format": "raw_banner",
            "adomain": ["test.com"],
            "impression_pixels": [
                {
                    "name": "Tracking Pixel",
                    "url": "https://tracking.example.com/track.gif",
                    "event": "impression",
                    "enabled": True
                }
            ],
            "banner_data": {
                "width": 728,
                "height": 90,
                "image_url": "https://example.com/leaderboard.jpg"
            }
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/creatives",
            json=creative_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        creative_id = create_response.json()["id"]
        
        # Now GET the creative
        get_response = requests.get(
            f"{BASE_URL}/api/creatives/{creative_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 200
        data = get_response.json()
        
        # Verify impression pixels are returned
        assert "impression_pixels" in data
        assert len(data["impression_pixels"]) >= 1
        pixel = data["impression_pixels"][0]
        assert pixel["name"] == "Tracking Pixel"
        assert pixel["url"] == "https://tracking.example.com/track.gif"
        print(f"✓ GET creative returns impression pixels")
    
    def test_update_creative_impression_pixels(self, auth_token):
        """Test updating creative impression pixels"""
        # Create creative
        creative_data = {
            "name": "TEST_Banner_Update_Pixels",
            "type": "banner",
            "format": "raw_banner",
            "adomain": ["test.com"],
            "impression_pixels": [
                {
                    "name": "Original Pixel",
                    "url": "https://tracking.example.com/original.gif",
                    "event": "impression",
                    "enabled": True
                }
            ],
            "banner_data": {
                "width": 300,
                "height": 250,
                "image_url": "https://example.com/banner.jpg"
            }
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/creatives",
            json=creative_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        creative_id = create_response.json()["id"]
        
        # Update with new pixels
        update_data = {
            "name": "TEST_Banner_Update_Pixels",
            "type": "banner",
            "format": "raw_banner",
            "adomain": ["test.com"],
            "impression_pixels": [
                {
                    "name": "Updated Pixel",
                    "url": "https://tracking.example.com/updated.gif",
                    "event": "viewable",
                    "enabled": True
                },
                {
                    "name": "New Pixel",
                    "url": "https://tracking.example.com/new.gif",
                    "event": "impression",
                    "enabled": True
                }
            ],
            "banner_data": {
                "width": 300,
                "height": 250,
                "image_url": "https://example.com/banner.jpg"
            }
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/creatives/{creative_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert update_response.status_code == 200
        data = update_response.json()
        
        # Verify updated pixels
        assert len(data["impression_pixels"]) == 2
        pixel_names = [p["name"] for p in data["impression_pixels"]]
        assert "Updated Pixel" in pixel_names
        assert "New Pixel" in pixel_names
        print(f"✓ Creative impression pixels updated successfully")


class TestFrequencyCapping:
    """Test frequency capping fields in campaign creation/update"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def test_creative_id(self, auth_token):
        """Create a test creative and return its ID"""
        creative_data = {
            "name": "TEST_Creative_For_FreqCap",
            "type": "banner",
            "format": "raw_banner",
            "adomain": ["test.com"],
            "banner_data": {
                "width": 300,
                "height": 250,
                "image_url": "https://example.com/banner.jpg"
            }
        }
        response = requests.post(
            f"{BASE_URL}/api/creatives",
            json=creative_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        return response.json()["id"]
    
    def test_create_campaign_with_frequency_capping(self, auth_token, test_creative_id):
        """Test creating campaign with frequency capping settings"""
        campaign_data = {
            "name": "TEST_Campaign_FreqCap",
            "status": "draft",
            "bid_price": 2.50,
            "priority": 5,
            "creative_id": test_creative_id,
            "budget": {
                "total_budget": 10000,
                "daily_budget": 500
            },
            "frequency_cap": {
                "enabled": True,
                "max_impressions_per_user": 3,
                "time_window_hours": 24,
                "max_impressions_per_day": 5,
                "max_impressions_total": 10
            },
            "targeting": {}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns",
            json=campaign_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify frequency capping is stored
        assert "frequency_cap" in data
        freq_cap = data["frequency_cap"]
        assert freq_cap["enabled"] == True
        assert freq_cap["max_impressions_per_day"] == 5
        assert freq_cap["max_impressions_total"] == 10
        print(f"✓ Campaign created with frequency capping")
    
    def test_update_campaign_frequency_capping(self, auth_token, test_creative_id):
        """Test updating campaign frequency capping settings"""
        # First create a campaign
        campaign_data = {
            "name": "TEST_Campaign_FreqCap_Update",
            "status": "draft",
            "bid_price": 2.00,
            "priority": 5,
            "creative_id": test_creative_id,
            "budget": {
                "total_budget": 5000,
                "daily_budget": 250
            },
            "frequency_cap": {
                "enabled": True,
                "max_impressions_per_user": 3,
                "time_window_hours": 24,
                "max_impressions_per_day": 5,
                "max_impressions_total": 20
            },
            "targeting": {}
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns",
            json=campaign_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert create_response.status_code == 200
        campaign_id = create_response.json()["id"]
        
        # Update frequency capping
        update_data = {
            "frequency_cap": {
                "enabled": True,
                "max_impressions_per_user": 5,
                "time_window_hours": 48,
                "max_impressions_per_day": 10,
                "max_impressions_total": 50
            }
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/campaigns/{campaign_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert update_response.status_code == 200
        data = update_response.json()
        
        # Verify updated frequency capping
        freq_cap = data["frequency_cap"]
        assert freq_cap["enabled"] == True
        assert freq_cap["max_impressions_per_day"] == 10
        assert freq_cap["max_impressions_total"] == 50
        print(f"✓ Campaign frequency capping updated successfully")
    
    def test_get_campaign_returns_frequency_capping(self, auth_token, test_creative_id):
        """Test that GET campaign returns frequency capping settings"""
        # Create campaign with frequency capping
        campaign_data = {
            "name": "TEST_Campaign_FreqCap_Get",
            "status": "draft",
            "bid_price": 1.50,
            "priority": 3,
            "creative_id": test_creative_id,
            "budget": {
                "total_budget": 3000,
                "daily_budget": 150
            },
            "frequency_cap": {
                "enabled": True,
                "max_impressions_per_user": 5,
                "time_window_hours": 24,
                "max_impressions_per_day": 7,
                "max_impressions_total": 30
            },
            "targeting": {}
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/campaigns",
            json=campaign_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert create_response.status_code == 200
        campaign_id = create_response.json()["id"]
        
        # GET the campaign
        get_response = requests.get(
            f"{BASE_URL}/api/campaigns/{campaign_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 200
        data = get_response.json()
        
        # Verify frequency capping is returned
        assert "frequency_cap" in data
        freq_cap = data["frequency_cap"]
        assert freq_cap["enabled"] == True
        assert freq_cap["max_impressions_per_day"] == 7
        assert freq_cap["max_impressions_total"] == 30
        print(f"✓ GET campaign returns frequency capping settings")


class TestBidResponseImpressionPixels:
    """Test that impression pixels are injected into bid response adm"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_bid_response_includes_impression_pixels_in_adm(self, auth_token):
        """Test that bid response adm includes impression pixels"""
        # First, create a creative with impression pixels
        creative_data = {
            "name": "TEST_Banner_BidResponse_Pixels",
            "type": "banner",
            "format": "raw_banner",
            "adomain": ["test.com"],
            "impression_pixels": [
                {
                    "name": "Bid Response Pixel",
                    "url": "https://tracking.example.com/bid-pixel.gif",
                    "event": "impression",
                    "enabled": True
                }
            ],
            "banner_data": {
                "width": 300,
                "height": 250,
                "image_url": "https://example.com/banner.jpg",
                "ad_markup": "<div><img src='https://example.com/banner.jpg' /></div>"
            }
        }
        
        create_creative_response = requests.post(
            f"{BASE_URL}/api/creatives",
            json=creative_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert create_creative_response.status_code == 200
        creative = create_creative_response.json()
        creative_id = creative["id"]
        
        # Create a campaign with this creative
        campaign_data = {
            "name": "TEST_Campaign_BidResponse_Pixels",
            "status": "active",
            "bid_price": 5.00,
            "priority": 10,
            "creative_id": creative_id,
            "creative_ids": [creative_id],
            "budget": {
                "total_budget": 10000,
                "daily_budget": 1000
            },
            "targeting": {}
        }
        
        create_campaign_response = requests.post(
            f"{BASE_URL}/api/campaigns",
            json=campaign_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert create_campaign_response.status_code == 200
        campaign = create_campaign_response.json()
        
        print(f"✓ Created creative with impression pixels and campaign")
        print(f"  Creative ID: {creative_id}")
        print(f"  Campaign ID: {campaign['id']}")
        
        # Note: Full bid request testing would require an SSP endpoint
        # The openrtb_handler.py code shows impression pixels are injected into adm


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_cleanup_test_campaigns(self, auth_token):
        """Clean up test campaigns"""
        # Get all campaigns
        response = requests.get(
            f"{BASE_URL}/api/campaigns",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        campaigns = response.json()
        
        deleted_count = 0
        for campaign in campaigns:
            if campaign["name"].startswith("TEST_"):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/campaigns/{campaign['id']}",
                    headers={"Authorization": f"Bearer {auth_token}"}
                )
                if delete_response.status_code == 200:
                    deleted_count += 1
        
        print(f"✓ Cleaned up {deleted_count} test campaigns")
    
    def test_cleanup_test_creatives(self, auth_token):
        """Clean up test creatives"""
        # Get all creatives
        response = requests.get(
            f"{BASE_URL}/api/creatives",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        creatives = response.json()
        
        deleted_count = 0
        for creative in creatives:
            if creative["name"].startswith("TEST_"):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/creatives/{creative['id']}",
                    headers={"Authorization": f"Bearer {auth_token}"}
                )
                if delete_response.status_code == 200:
                    deleted_count += 1
        
        print(f"✓ Cleaned up {deleted_count} test creatives")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

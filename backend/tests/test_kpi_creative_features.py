"""
Test KPI fields saving in campaigns and creative dropdown functionality
Tests for iteration 20 fixes:
1. Campaign KPI type and KPI target saving/retrieval
2. Creative creation for all types (banner, video, native, audio)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCampaignKPIFields:
    """Test that KPI type and KPI target are saved and retrieved correctly"""
    
    test_creative_id = None
    test_campaign_id = None
    
    @classmethod
    def setup_class(cls):
        """Create a test creative for campaign creation"""
        # First create a creative to use in campaigns
        creative_payload = {
            "name": f"TEST_KPI_Banner_{uuid.uuid4().hex[:8]}",
            "type": "banner",
            "adomain": ["example.com"],
            "banner_data": {
                "width": 300,
                "height": 250,
                "mimes": ["image/jpeg", "image/png"],
                "ad_markup": "<img src='test.jpg'/>"
            }
        }
        response = requests.post(f"{BASE_URL}/api/creatives", json=creative_payload)
        assert response.status_code == 200, f"Failed to create test creative: {response.text}"
        cls.test_creative_id = response.json()["id"]
        print(f"Created test creative: {cls.test_creative_id}")
    
    def test_create_campaign_with_kpi_cpm(self):
        """Test creating campaign with KPI type=cpm and target=5.50"""
        campaign_payload = {
            "name": f"TEST_Campaign_KPI_CPM_{uuid.uuid4().hex[:8]}",
            "bid_price": 2.5,
            "creative_id": self.test_creative_id,
            "kpi_type": "cpm",
            "kpi_target": 5.50,
            "budget": {"daily_budget": 100, "total_budget": 1000}
        }
        
        response = requests.post(f"{BASE_URL}/api/campaigns", json=campaign_payload)
        assert response.status_code == 200, f"Failed to create campaign: {response.text}"
        
        data = response.json()
        TestCampaignKPIFields.test_campaign_id = data["id"]
        
        # Verify KPI fields in response
        assert data.get("kpi_type") == "cpm", f"Expected kpi_type='cpm', got '{data.get('kpi_type')}'"
        assert data.get("kpi_target") == 5.50, f"Expected kpi_target=5.50, got {data.get('kpi_target')}"
        print(f"✓ Campaign created with kpi_type={data.get('kpi_type')}, kpi_target={data.get('kpi_target')}")
    
    def test_get_campaign_returns_kpi_fields(self):
        """Test that GET /api/campaigns/{id} returns KPI fields"""
        assert self.test_campaign_id, "No campaign ID from previous test"
        
        response = requests.get(f"{BASE_URL}/api/campaigns/{self.test_campaign_id}")
        assert response.status_code == 200, f"Failed to get campaign: {response.text}"
        
        data = response.json()
        assert data.get("kpi_type") == "cpm", f"Expected kpi_type='cpm', got '{data.get('kpi_type')}'"
        assert data.get("kpi_target") == 5.50, f"Expected kpi_target=5.50, got {data.get('kpi_target')}"
        print(f"✓ GET campaign returns kpi_type={data.get('kpi_type')}, kpi_target={data.get('kpi_target')}")
    
    def test_get_campaigns_list_returns_kpi_fields(self):
        """Test that GET /api/campaigns returns KPI fields for all campaigns"""
        response = requests.get(f"{BASE_URL}/api/campaigns")
        assert response.status_code == 200, f"Failed to get campaigns: {response.text}"
        
        campaigns = response.json()
        assert isinstance(campaigns, list), "Expected list of campaigns"
        
        # Find our test campaign
        test_campaign = next((c for c in campaigns if c.get("id") == self.test_campaign_id), None)
        assert test_campaign, f"Test campaign {self.test_campaign_id} not found in list"
        
        assert test_campaign.get("kpi_type") == "cpm", f"Expected kpi_type='cpm' in list"
        assert test_campaign.get("kpi_target") == 5.50, f"Expected kpi_target=5.50 in list"
        print(f"✓ Campaign list includes KPI fields")
    
    def test_create_campaign_with_kpi_cpc(self):
        """Test creating campaign with KPI type=cpc"""
        campaign_payload = {
            "name": f"TEST_Campaign_KPI_CPC_{uuid.uuid4().hex[:8]}",
            "bid_price": 1.5,
            "creative_id": self.test_creative_id,
            "kpi_type": "cpc",
            "kpi_target": 0.75,
            "budget": {"daily_budget": 50, "total_budget": 500}
        }
        
        response = requests.post(f"{BASE_URL}/api/campaigns", json=campaign_payload)
        assert response.status_code == 200, f"Failed to create campaign: {response.text}"
        
        data = response.json()
        assert data.get("kpi_type") == "cpc", f"Expected kpi_type='cpc'"
        assert data.get("kpi_target") == 0.75, f"Expected kpi_target=0.75"
        print(f"✓ Campaign with kpi_type=cpc created successfully")
    
    def test_create_campaign_with_kpi_cpa(self):
        """Test creating campaign with KPI type=cpa"""
        campaign_payload = {
            "name": f"TEST_Campaign_KPI_CPA_{uuid.uuid4().hex[:8]}",
            "bid_price": 3.0,
            "creative_id": self.test_creative_id,
            "kpi_type": "cpa",
            "kpi_target": 25.00,
            "budget": {"daily_budget": 200, "total_budget": 2000}
        }
        
        response = requests.post(f"{BASE_URL}/api/campaigns", json=campaign_payload)
        assert response.status_code == 200, f"Failed to create campaign: {response.text}"
        
        data = response.json()
        assert data.get("kpi_type") == "cpa", f"Expected kpi_type='cpa'"
        assert data.get("kpi_target") == 25.00, f"Expected kpi_target=25.00"
        print(f"✓ Campaign with kpi_type=cpa created successfully")
    
    def test_update_campaign_kpi_fields(self):
        """Test updating campaign KPI fields"""
        assert self.test_campaign_id, "No campaign ID from previous test"
        
        update_payload = {
            "kpi_type": "vcpm",
            "kpi_target": 8.00
        }
        
        response = requests.put(f"{BASE_URL}/api/campaigns/{self.test_campaign_id}", json=update_payload)
        assert response.status_code == 200, f"Failed to update campaign: {response.text}"
        
        data = response.json()
        assert data.get("kpi_type") == "vcpm", f"Expected kpi_type='vcpm' after update"
        assert data.get("kpi_target") == 8.00, f"Expected kpi_target=8.00 after update"
        print(f"✓ Campaign KPI fields updated successfully")
    
    def test_verify_kpi_persisted_after_update(self):
        """Verify KPI fields persist after update by doing GET"""
        assert self.test_campaign_id, "No campaign ID from previous test"
        
        response = requests.get(f"{BASE_URL}/api/campaigns/{self.test_campaign_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("kpi_type") == "vcpm", "KPI type not persisted after update"
        assert data.get("kpi_target") == 8.00, "KPI target not persisted after update"
        print(f"✓ KPI fields persisted correctly after update")


class TestCreativeTypes:
    """Test creation of all creative types (banner, video, native, audio)"""
    
    def test_create_banner_creative(self):
        """Test creating a banner creative"""
        payload = {
            "name": f"TEST_Banner_{uuid.uuid4().hex[:8]}",
            "type": "banner",
            "adomain": ["test.com"],
            "banner_data": {
                "width": 728,
                "height": 90,
                "mimes": ["image/jpeg", "image/png", "image/gif"],
                "ad_markup": '<a href="${CLICK_URL}"><img src="https://example.com/banner.jpg"/></a>'
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/creatives", json=payload)
        assert response.status_code == 200, f"Failed to create banner: {response.text}"
        
        data = response.json()
        assert data["type"] == "banner"
        assert data["banner_data"]["width"] == 728
        assert data["banner_data"]["height"] == 90
        print(f"✓ Banner creative created: {data['id']}")
    
    def test_create_video_creative_vast_url(self):
        """Test creating a video creative with VAST URL"""
        payload = {
            "name": f"TEST_Video_VAST_{uuid.uuid4().hex[:8]}",
            "type": "video",
            "adomain": ["test.com"],
            "video_data": {
                "duration": 15,
                "width": 1920,
                "height": 1080,
                "mimes": ["video/mp4", "video/webm"],
                "protocols": [2, 3, 5, 6],
                "vast_url": "https://example.com/vast.xml"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/creatives", json=payload)
        assert response.status_code == 200, f"Failed to create video: {response.text}"
        
        data = response.json()
        assert data["type"] == "video"
        assert data["video_data"]["duration"] == 15
        assert data["video_data"]["vast_url"] == "https://example.com/vast.xml"
        print(f"✓ Video creative with VAST URL created: {data['id']}")
    
    def test_create_video_creative_vast_xml(self):
        """Test creating a video creative with VAST XML"""
        vast_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<VAST version="3.0">
  <Ad id="test">
    <InLine>
      <AdTitle>Test Ad</AdTitle>
      <Creatives>
        <Creative>
          <Linear>
            <Duration>00:00:30</Duration>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>'''
        
        payload = {
            "name": f"TEST_Video_VAST_XML_{uuid.uuid4().hex[:8]}",
            "type": "video",
            "adomain": ["test.com"],
            "video_data": {
                "duration": 30,
                "width": 1280,
                "height": 720,
                "mimes": ["video/mp4"],
                "protocols": [2, 3],
                "vast_xml": vast_xml
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/creatives", json=payload)
        assert response.status_code == 200, f"Failed to create video with XML: {response.text}"
        
        data = response.json()
        assert data["type"] == "video"
        assert data["video_data"]["vast_xml"] is not None
        print(f"✓ Video creative with VAST XML created: {data['id']}")
    
    def test_create_native_creative(self):
        """Test creating a native creative with all fields"""
        payload = {
            "name": f"TEST_Native_{uuid.uuid4().hex[:8]}",
            "type": "native",
            "adomain": ["test.com"],
            "native_data": {
                "title": "Amazing Product",
                "description": "Check out our amazing new product!",
                "icon_url": "https://example.com/icon.png",
                "image_url": "https://example.com/image.jpg",
                "cta_text": "Shop Now",
                "click_url": "https://example.com/landing",
                "sponsored_by": "Test Brand",
                "rating": 4.5,
                "price": "$9.99"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/creatives", json=payload)
        assert response.status_code == 200, f"Failed to create native: {response.text}"
        
        data = response.json()
        assert data["type"] == "native"
        assert data["native_data"]["title"] == "Amazing Product"
        assert data["native_data"]["rating"] == 4.5
        assert data["native_data"]["price"] == "$9.99"
        print(f"✓ Native creative created with rating and price: {data['id']}")
    
    def test_create_audio_creative_vast_url(self):
        """Test creating an audio creative with VAST URL"""
        payload = {
            "name": f"TEST_Audio_VAST_{uuid.uuid4().hex[:8]}",
            "type": "audio",
            "adomain": ["test.com"],
            "audio_data": {
                "duration": 30,
                "mimes": ["audio/mpeg", "audio/mp3"],
                "protocols": [2, 3, 5, 6],
                "vast_url": "https://example.com/audio-vast.xml"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/creatives", json=payload)
        assert response.status_code == 200, f"Failed to create audio: {response.text}"
        
        data = response.json()
        assert data["type"] == "audio"
        assert data["audio_data"]["duration"] == 30
        assert data["audio_data"]["vast_url"] == "https://example.com/audio-vast.xml"
        print(f"✓ Audio creative with VAST URL created: {data['id']}")
    
    def test_create_audio_creative_with_companion(self):
        """Test creating an audio creative with companion banner"""
        payload = {
            "name": f"TEST_Audio_Companion_{uuid.uuid4().hex[:8]}",
            "type": "audio",
            "adomain": ["test.com"],
            "audio_data": {
                "duration": 15,
                "mimes": ["audio/mpeg"],
                "audio_url": "https://example.com/audio.mp3",
                "companion_banner_url": "https://example.com/companion.jpg",
                "companion_width": 300,
                "companion_height": 250
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/creatives", json=payload)
        assert response.status_code == 200, f"Failed to create audio with companion: {response.text}"
        
        data = response.json()
        assert data["type"] == "audio"
        assert data["audio_data"]["companion_banner_url"] == "https://example.com/companion.jpg"
        assert data["audio_data"]["companion_width"] == 300
        print(f"✓ Audio creative with companion banner created: {data['id']}")
    
    def test_get_creatives_returns_all_types(self):
        """Test that GET /api/creatives returns all creative types"""
        response = requests.get(f"{BASE_URL}/api/creatives")
        assert response.status_code == 200
        
        creatives = response.json()
        types = set(c["type"] for c in creatives)
        
        print(f"Creative types in database: {types}")
        assert "banner" in types, "Banner creatives not found"
        assert "video" in types, "Video creatives not found"
        assert "native" in types, "Native creatives not found"
        assert "audio" in types, "Audio creatives not found"
        print(f"✓ All creative types present in GET response")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_campaigns(self):
        """Remove TEST_ prefixed campaigns"""
        response = requests.get(f"{BASE_URL}/api/campaigns")
        if response.status_code == 200:
            campaigns = response.json()
            deleted = 0
            for c in campaigns:
                if c.get("name", "").startswith("TEST_"):
                    del_resp = requests.delete(f"{BASE_URL}/api/campaigns/{c['id']}")
                    if del_resp.status_code == 200:
                        deleted += 1
            print(f"✓ Cleaned up {deleted} test campaigns")
    
    def test_cleanup_test_creatives(self):
        """Remove TEST_ prefixed creatives"""
        response = requests.get(f"{BASE_URL}/api/creatives")
        if response.status_code == 200:
            creatives = response.json()
            deleted = 0
            for c in creatives:
                if c.get("name", "").startswith("TEST_"):
                    del_resp = requests.delete(f"{BASE_URL}/api/creatives/{c['id']}")
                    if del_resp.status_code == 200:
                        deleted += 1
            print(f"✓ Cleaned up {deleted} test creatives")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

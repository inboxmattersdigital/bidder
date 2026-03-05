"""
OpenRTB 2.5/2.6 Bidder Test Suite
Tests all backend APIs and OpenRTB bidding functionality
"""
import requests
import sys
import json
import time
from datetime import datetime

class OpenRTBBidderTester:
    def __init__(self, base_url="https://openrtb-campaign-hub.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.api_key = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            "creatives": [],
            "campaigns": [],
            "ssp_endpoints": []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.text[:200]}")
                except:
                    pass
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)
        if success:
            required_fields = ['total_campaigns', 'active_campaigns', 'total_creatives']
            for field in required_fields:
                if field not in response:
                    print(f"   ⚠️  Missing field: {field}")
        return success, response

    def test_chart_data(self):
        """Test chart data endpoint"""
        success, response = self.run_test("Chart Data", "GET", "dashboard/chart-data", 200)
        if success and isinstance(response, list):
            print(f"   📊 Got {len(response)} data points")
        return success, response

    def test_seed_data(self):
        """Seed sample data for testing"""
        success, response = self.run_test("Seed Sample Data", "POST", "seed-data", 200)
        if success:
            print(f"   📝 Created: {response.get('campaigns', 0)} campaigns, {response.get('creatives', 0)} creatives")
        return success, response

    def test_campaigns_crud(self):
        """Test campaign CRUD operations"""
        print("\n📋 Testing Campaign Operations:")
        
        # Get campaigns
        success, campaigns = self.run_test("Get Campaigns", "GET", "campaigns", 200)
        if not success:
            return False
        
        print(f"   Found {len(campaigns)} existing campaigns")
        
        # Get creatives for campaign creation
        success, creatives = self.run_test("Get Creatives for Campaign", "GET", "creatives", 200)
        if not success or not creatives:
            print("   ❌ No creatives found - cannot create campaign")
            return False
        
        # Create campaign
        creative_id = creatives[0]['id']
        campaign_data = {
            "name": "Test Campaign API",
            "bid_price": 2.0,
            "bid_floor": 0.1,
            "priority": 5,
            "creative_id": creative_id,
            "budget": {
                "daily_budget": 100.0,
                "total_budget": 1000.0,
                "daily_spend": 0.0,
                "total_spend": 0.0
            },
            "targeting": {
                "geo": {"countries": ["USA"], "regions": [], "cities": []},
                "device": {"device_types": [4], "makes": [], "models": [], "os_list": [], "connection_types": []},
                "inventory": {"domain_whitelist": [], "domain_blacklist": [], "bundle_whitelist": [], "bundle_blacklist": [], "publisher_ids": [], "categories": []},
                "video": {"placements": [], "plcmts": [], "protocols": [], "mimes": []},
                "content": {"categories": [], "keywords": []},
                "privacy": {"gdpr_required": False, "gdpr_consent_required": False, "ccpa_allowed": True, "coppa_allowed": False}
            }
        }
        
        success, campaign = self.run_test("Create Campaign", "POST", "campaigns", 200, campaign_data)
        if success:
            campaign_id = campaign.get('id')
            self.created_resources["campaigns"].append(campaign_id)
            
            # Test campaign activation
            success, _ = self.run_test("Activate Campaign", "POST", f"campaigns/{campaign_id}/activate", 200)
            
            # Test campaign pause
            success, _ = self.run_test("Pause Campaign", "POST", f"campaigns/{campaign_id}/pause", 200)
            
            # Test get single campaign
            success, _ = self.run_test("Get Single Campaign", "GET", f"campaigns/{campaign_id}", 200)
            
            return True
        
        return False

    def test_creatives_crud(self):
        """Test creative CRUD operations"""
        print("\n🎨 Testing Creative Operations:")
        
        # Get creatives
        success, creatives = self.run_test("Get Creatives", "GET", "creatives", 200)
        if not success:
            return False
        
        print(f"   Found {len(creatives)} existing creatives")
        
        # Create banner creative
        banner_data = {
            "name": "Test Banner Creative",
            "type": "banner",
            "adomain": ["testcorp.com"],
            "cat": ["IAB19"],
            "banner_data": {
                "width": 300,
                "height": 250,
                "mimes": ["image/jpeg", "image/png"],
                "ad_markup": "<div style='width:300px;height:250px;background:#1a1a2e;color:#fff;display:flex;align-items:center;justify-content:center;'>Test Ad</div>"
            }
        }
        
        success, creative = self.run_test("Create Banner Creative", "POST", "creatives", 200, banner_data)
        if success:
            creative_id = creative.get('id')
            self.created_resources["creatives"].append(creative_id)
            
            # Test get single creative
            success, _ = self.run_test("Get Single Creative", "GET", f"creatives/{creative_id}", 200)
            
        # Create video creative
        video_data = {
            "name": "Test Video Creative",
            "type": "video",
            "adomain": ["videocorp.com"],
            "cat": ["IAB3"],
            "video_data": {
                "duration": 30,
                "width": 640,
                "height": 480,
                "mimes": ["video/mp4"],
                "protocols": [2, 3, 5, 6],
                "vast_xml": '<?xml version="1.0"?><VAST version="3.0"><Ad><InLine><AdTitle>Test Video Ad</AdTitle></InLine></Ad></VAST>'
            }
        }
        
        success, video_creative = self.run_test("Create Video Creative", "POST", "creatives", 200, video_data)
        if success:
            creative_id = video_creative.get('id')
            self.created_resources["creatives"].append(creative_id)
        
        return True

    def test_ssp_endpoints(self):
        """Test SSP endpoint management"""
        print("\n🔗 Testing SSP Endpoint Operations:")
        
        # Get SSP endpoints
        success, endpoints = self.run_test("Get SSP Endpoints", "GET", "ssp-endpoints", 200)
        if not success:
            return False
        
        print(f"   Found {len(endpoints)} existing endpoints")
        
        # Create SSP endpoint
        endpoint_data = {
            "name": "Test SSP Partner",
            "description": "Test SSP for API validation"
        }
        
        success, endpoint = self.run_test("Create SSP Endpoint", "POST", "ssp-endpoints", 200, endpoint_data)
        if success:
            endpoint_id = endpoint.get('id')
            self.api_key = endpoint.get('api_key')
            self.created_resources["ssp_endpoints"].append(endpoint_id)
            
            print(f"   🔑 Generated API Key: {self.api_key[:20]}...")
            
            # Test regenerate API key
            success, new_key_response = self.run_test("Regenerate API Key", "POST", f"ssp-endpoints/{endpoint_id}/regenerate-key", 200)
            if success:
                self.api_key = new_key_response.get('api_key')
                print(f"   🔄 New API Key: {self.api_key[:20]}...")
            
            # Test status update
            success, _ = self.run_test("Update SSP Status", "PUT", f"ssp-endpoints/{endpoint_id}/status?status=inactive", 200)
            success, _ = self.run_test("Reactivate SSP", "PUT", f"ssp-endpoints/{endpoint_id}/status?status=active", 200)
            
        return True

    def test_bid_logs(self):
        """Test bid logs endpoint"""
        print("\n📝 Testing Bid Logs:")
        
        success, logs_response = self.run_test("Get Bid Logs", "GET", "bid-logs?limit=10", 200)
        if success:
            logs = logs_response.get('logs', [])
            total = logs_response.get('total', 0)
            print(f"   📊 Found {len(logs)} logs, {total} total")
        
        return success

    def test_migration_matrix(self):
        """Test OpenRTB migration matrix"""
        print("\n🔄 Testing Migration Matrix:")
        
        success, matrix = self.run_test("Get Migration Matrix", "GET", "migration-matrix", 200)
        if success:
            print(f"   📋 Matrix has {len(matrix)} field mappings")
            # Check key mappings exist
            key_mappings = ['video.placement', 'user.consent', 'bid.mtype']
            for mapping in key_mappings:
                if mapping in matrix:
                    print(f"   ✅ Found mapping: {mapping}")
                else:
                    print(f"   ⚠️  Missing mapping: {mapping}")
        
        return success

    def test_win_notification_endpoint(self):
        """Test win notification callback endpoint"""
        print("\n🎯 Testing Win Notification Endpoint:")
        
        # Create a test bid ID
        bid_id = "test-bid-12345"
        price = 2.5
        
        success, response = self.run_test("Win Notification", "POST", f"notify/win/{bid_id}?price={price}", [200, 404])
        if success and response.get('status') in ['success', 'already_notified']:
            print(f"   💰 Win notification processed for bid {bid_id}")
        elif response.get('status') == 'already_notified':
            print(f"   ⚠️  Bid {bid_id} already notified")
        else:
            print(f"   ℹ️  Bid {bid_id} not found (expected for test)")
        
        return True

    def test_billing_notification_endpoint(self):
        """Test billing notification callback endpoint"""
        print("\n💳 Testing Billing Notification Endpoint:")
        
        # Create a test bid ID
        bid_id = "test-bid-12345"
        price = 2.5
        
        success, response = self.run_test("Billing Notification", "POST", f"notify/billing/{bid_id}?price={price}", [200, 404])
        if success and response.get('status') in ['success', 'already_notified']:
            print(f"   💳 Billing notification processed for bid {bid_id}")
        elif response.get('status') == 'already_notified':
            print(f"   ⚠️  Bid {bid_id} already billed")
        else:
            print(f"   ℹ️  Bid {bid_id} not found (expected for test)")
        
        return True

    def test_reports_endpoints(self):
        """Test campaign performance reporting endpoints"""
        print("\n📊 Testing Reports Endpoints:")
        
        # Test report summary
        success, response = self.run_test("Report Summary", "GET", "reports/summary", 200)
        if success:
            summary = response.get('summary', {})
            print(f"   📈 Total Bids: {summary.get('total_bids', 0)}")
            print(f"   📈 Total Wins: {summary.get('total_wins', 0)}")
            print(f"   📈 Win Rate: {summary.get('win_rate', 0):.2f}%")
            print(f"   💰 Total Spend: ${summary.get('total_spend', 0):.2f}")
        
        # Test campaign report (with existing campaign if any)
        campaigns_success, campaigns = self.run_test("Get Campaigns for Report", "GET", "campaigns?status=active", 200)
        if campaigns_success and campaigns:
            campaign_id = campaigns[0]['id']
            success, response = self.run_test("Campaign Report", "GET", f"reports/campaign/{campaign_id}", 200)
            if success:
                print(f"   📊 Campaign '{response.get('campaign_name')}' report generated")
                bid_shading = response.get('bid_shading', {})
                print(f"   🎯 Bid Shading: {'Enabled' if bid_shading.get('enabled') else 'Disabled'}")
                if bid_shading.get('enabled'):
                    print(f"   📉 Current Factor: {bid_shading.get('current_factor', 1.0):.2f}")
        
        return True

    def test_pacing_endpoints(self):
        """Test budget pacing endpoints"""
        print("\n⏱️ Testing Budget Pacing Endpoints:")
        
        # Test pacing status
        success, response = self.run_test("Pacing Status", "GET", "pacing/status", 200)
        if success:
            campaigns = response.get('campaigns', [])
            print(f"   📊 Found {len(campaigns)} campaigns in pacing status")
            current_hour = response.get('current_hour', 0)
            print(f"   🕐 Current hour: {current_hour}")
            
            # Show pacing status breakdown
            on_track = len([c for c in campaigns if c.get('pacing_status') == 'on_track'])
            overpacing = len([c for c in campaigns if c.get('pacing_status') == 'overpacing'])
            underpacing = len([c for c in campaigns if c.get('pacing_status') == 'underpacing'])
            print(f"   ✅ On Track: {on_track}, 🔴 Overpacing: {overpacing}, 🟡 Underpacing: {underpacing}")
        
        # Test reset all daily spend
        success, response = self.run_test("Reset All Daily Spend", "POST", "pacing/reset-all", 200)
        if success:
            campaigns_updated = response.get('campaigns_updated', 0)
            print(f"   🔄 Reset daily spend for {campaigns_updated} campaigns")
        
        return True

    def test_openrtb_bid_endpoint(self):
        """Test OpenRTB 2.5/2.6 bid endpoint with nurl/burl callbacks"""
        print("\n🎯 Testing OpenRTB Bid Endpoint:")
        
        if not self.api_key:
            print("   ❌ No API key available for testing")
            return False
        
        # Test OpenRTB 2.5 bid request
        bid_request_25 = {
            "id": "test-request-25",
            "at": 2,
            "tmax": 100,
            "imp": [
                {
                    "id": "1",
                    "bidfloor": 0.1,
                    "bidfloorcur": "USD",
                    "banner": {
                        "w": 300,
                        "h": 250,
                        "mimes": ["image/jpeg", "image/png"],
                        "pos": 1
                    }
                }
            ],
            "site": {
                "id": "test-site",
                "domain": "testsite.com",
                "cat": ["IAB19"],
                "page": "https://testsite.com/page1"
            },
            "device": {
                "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "devicetype": 2,
                "ip": "192.168.1.1",
                "make": "Generic",
                "os": "Windows",
                "osv": "10",
                "connectiontype": 1
            },
            "user": {
                "id": "test-user-123"
            }
        }
        
        headers = {
            "X-API-Key": self.api_key,
            "X-OpenRTB-Version": "2.5"
        }
        
        success, response = self.run_test("OpenRTB 2.5 Bid Request", "POST", "bid", [200, 204], bid_request_25, headers)
        
        if success:
            if response:
                print("   💰 Bid response received")
                if 'seatbid' in response and response['seatbid']:
                    bid = response['seatbid'][0]['bid'][0]
                    print(f"   📊 Bid ID: {bid.get('id')}")
                    print(f"   💵 Bid Price: ${bid.get('price', 0):.2f}")
                    # Check for nurl and burl callbacks
                    nurl = bid.get('nurl')
                    burl = bid.get('burl')
                    if nurl:
                        print(f"   📞 Win Notification URL (nurl): {nurl[:50]}...")
                    if burl:
                        print(f"   💳 Billing URL (burl): {burl[:50]}...")
            else:
                print("   🚫 No bid (204 response)")
        
        # Test OpenRTB 2.6 bid request with video
        bid_request_26 = {
            "id": "test-request-26",
            "at": 2,
            "tmax": 100,
            "imp": [
                {
                    "id": "1",
                    "bidfloor": 0.5,
                    "bidfloorcur": "USD",
                    "video": {
                        "mimes": ["video/mp4"],
                        "minduration": 5,
                        "maxduration": 30,
                        "protocols": [2, 3, 5, 6],
                        "w": 640,
                        "h": 480,
                        "plcmt": 1,  # 2.6 field
                        "linearity": 1
                    }
                }
            ],
            "app": {
                "id": "test-app",
                "name": "Test App",
                "bundle": "com.test.app",
                "cat": ["IAB9"]
            },
            "device": {
                "ua": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
                "devicetype": 4,
                "ip": "10.0.0.1",
                "make": "Apple",
                "model": "iPhone12,1",
                "os": "iOS",
                "osv": "14.0",
                "connectiontype": 2,
                "ifa": "AEBE52E7-03EE-455A-B3C4-E57283966239"
            },
            "user": {
                "id": "test-user-456",
                "consent": "BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA"  # 2.6 location
            },
            "regs": {
                "gdpr": 1,  # 2.6 location
                "coppa": 0
            }
        }
        
        headers["X-OpenRTB-Version"] = "2.6"
        
        success, response = self.run_test("OpenRTB 2.6 Bid Request", "POST", "bid", [200, 204], bid_request_26, headers)
        
        if success:
            if response:
                print("   💰 2.6 Bid response received")
                if 'seatbid' in response and response['seatbid']:
                    bid = response['seatbid'][0]['bid'][0]
                    print(f"   📊 Bid ID: {bid.get('id')}")
                    print(f"   💵 Bid Price: ${bid.get('price', 0):.2f}")
                    # Check for 2.6 specific fields
                    if 'mtype' in bid:
                        print(f"   🔧 Media Type (2.6): {bid['mtype']}")
                    # Check for nurl and burl callbacks
                    nurl = bid.get('nurl')
                    burl = bid.get('burl')
                    if nurl:
                        print(f"   📞 Win Notification URL (nurl): {nurl[:50]}...")
                    if burl:
                        print(f"   💳 Billing URL (burl): {burl[:50]}...")
            else:
                print("   🚫 No bid (204 response)")
        
        # Test invalid API key
        invalid_headers = {"X-API-Key": "invalid-key-12345"}
        success, _ = self.run_test("Invalid API Key", "POST", "bid", 401, bid_request_25, invalid_headers)
        
        return True

    def cleanup_resources(self):
        """Clean up created test resources"""
        print("\n🧹 Cleaning up test resources...")
        
        # Delete campaigns
        for campaign_id in self.created_resources["campaigns"]:
            try:
                self.run_test(f"Delete Campaign {campaign_id[:8]}", "DELETE", f"campaigns/{campaign_id}", 200)
            except:
                pass
        
        # Delete creatives
        for creative_id in self.created_resources["creatives"]:
            try:
                self.run_test(f"Delete Creative {creative_id[:8]}", "DELETE", f"creatives/{creative_id}", 200)
            except:
                pass
        
        # Delete SSP endpoints
        for endpoint_id in self.created_resources["ssp_endpoints"]:
            try:
                self.run_test(f"Delete SSP Endpoint {endpoint_id[:8]}", "DELETE", f"ssp-endpoints/{endpoint_id}", 200)
            except:
                pass

def main():
    print("🚀 OpenRTB 2.5/2.6 Bidder Test Suite")
    print("=" * 50)
    
    tester = OpenRTBBidderTester()
    
    try:
        # Basic API tests
        tester.test_root_endpoint()
        tester.test_dashboard_stats()
        tester.test_chart_data()
        
        # Seed data for testing
        tester.test_seed_data()
        
        # CRUD operations
        tester.test_creatives_crud()
        tester.test_campaigns_crud()
        tester.test_ssp_endpoints()
        
        # Bid logs and migration
        tester.test_bid_logs()
        tester.test_migration_matrix()
        
        # Core OpenRTB bidding functionality
        tester.test_openrtb_bid_endpoint()
        
        # Advanced features
        tester.test_win_notification_endpoint()
        tester.test_billing_notification_endpoint()
        tester.test_reports_endpoints()
        tester.test_pacing_endpoints()
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n\n💥 Unexpected error: {str(e)}")
    finally:
        # Cleanup
        tester.cleanup_resources()
    
    # Results
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS")
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100) if tester.tests_run > 0 else 0:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
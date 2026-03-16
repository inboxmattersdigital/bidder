"""
Test Bug Fixes for Iteration 19:
1. Bid Stream Total Requests showing incorrect count (was stuck at ~50) - FIXED
2. SSP Analytics spend calculation showing wrong value ($561.25 instead of ~$0.59) - FIXED
3. Ad Performance Report data accuracy for source, domain, bundle, app_name, IP, device_ifa fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://openrtb-campaign-hub.preview.emergentagent.com')


class TestBidStreamStatsFix:
    """Tests for Bid Stream stats fix - should show correct counts from DB"""
    
    def test_bid_stream_stats_endpoint_returns_correct_structure(self):
        """Test /api/bid-stream/stats returns expected fields"""
        response = requests.get(f"{BASE_URL}/api/bid-stream/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "total_requests" in data
        assert "total_bids" in data
        assert "total_no_bids" in data
        
        print(f"✅ Bid Stream Stats: requests={data['total_requests']}, bids={data['total_bids']}, no_bids={data['total_no_bids']}")
    
    def test_bid_stream_stats_shows_correct_count(self):
        """Test that Total Requests shows ~47,588 (not stuck at ~50)"""
        response = requests.get(f"{BASE_URL}/api/bid-stream/stats?force_refresh=true")
        assert response.status_code == 200
        data = response.json()
        
        # Should be around 47,588 based on the bug description
        # Allow some tolerance for new requests
        assert data["total_requests"] >= 47000, f"Total requests {data['total_requests']} should be >= 47000"
        assert data["total_bids"] >= 27000, f"Total bids {data['total_bids']} should be >= 27000"
        
        # Verify no_bids = total_requests - total_bids
        expected_no_bids = data["total_requests"] - data["total_bids"]
        assert data["total_no_bids"] == expected_no_bids
        
        print(f"✅ Bid Stream Stats showing correct counts: {data['total_requests']} total requests")
    
    def test_bid_stream_stats_bid_rate_calculation(self):
        """Test bid rate calculation is correct"""
        response = requests.get(f"{BASE_URL}/api/bid-stream/stats?force_refresh=true")
        assert response.status_code == 200
        data = response.json()
        
        # Calculate bid rate
        if data["total_requests"] > 0:
            bid_rate = (data["total_bids"] / data["total_requests"]) * 100
            # Based on bug description, bid rate should be around 57.3%
            assert 50 < bid_rate < 70, f"Bid rate {bid_rate}% seems off (expected ~57%)"
            print(f"✅ Bid Rate: {bid_rate:.1f}%")
    
    def test_force_refresh_syncs_from_db(self):
        """Test force_refresh parameter syncs stats from ssp_endpoints collection"""
        response = requests.get(f"{BASE_URL}/api/bid-stream/stats?force_refresh=true")
        assert response.status_code == 200
        data = response.json()
        
        # Get SSP overview for comparison
        ssp_response = requests.get(f"{BASE_URL}/api/ssp-analytics/overview")
        assert ssp_response.status_code == 200
        ssp_data = ssp_response.json()
        
        # Stats should match SSP endpoint totals
        assert data["total_requests"] == ssp_data["overview"]["total_requests"]
        assert data["total_bids"] == ssp_data["overview"]["total_bids"]
        
        print(f"✅ Stats synced correctly from SSP endpoints")


class TestSSPAnalyticsSpendFix:
    """Tests for SSP Analytics spend calculation fix - should show ~$0.59 not $561.25"""
    
    def test_ssp_overview_returns_correct_spend(self):
        """Test /api/ssp-analytics/overview returns correct spend value"""
        response = requests.get(f"{BASE_URL}/api/ssp-analytics/overview")
        assert response.status_code == 200
        data = response.json()
        
        overview = data["overview"]
        
        # Spend should be around $0.59 (not $561.25 which was the bug)
        # Allow some tolerance for rounding
        assert overview["total_spend"] < 5, f"Total spend ${overview['total_spend']} is too high (was buggy at $561.25)"
        assert overview["total_spend"] >= 0, "Total spend should not be negative"
        
        print(f"✅ SSP Overview Total Spend: ${overview['total_spend']}")
    
    def test_ssp_ranking_spend_is_accurate(self):
        """Test individual SSP spend values are accurate"""
        response = requests.get(f"{BASE_URL}/api/ssp-analytics/overview")
        assert response.status_code == 200
        data = response.json()
        
        for ssp in data["ssp_rankings"]:
            # Each SSP's spend should be reasonable (CPM/1000 per impression)
            if ssp["wins"] > 0:
                avg_win_cost = ssp["spend"] / ssp["wins"]
                # Average CPM is typically $0.10 - $5.00, so avg_win_cost should be CPM/1000
                assert avg_win_cost < 0.01, f"SSP {ssp['name']} avg win cost ${avg_win_cost:.4f} seems too high"
                print(f"✅ SSP {ssp['name']}: {ssp['wins']} wins, ${ssp['spend']:.4f} spend, ${avg_win_cost:.6f} avg/win")
    
    def test_recalculate_stats_endpoint(self):
        """Test POST /api/ssp-analytics/recalculate-stats endpoint works"""
        response = requests.post(f"{BASE_URL}/api/ssp-analytics/recalculate-stats")
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "recalculated"
        assert "endpoints_updated" in data
        assert "details" in data
        
        # Verify note about spend calculation
        assert "CPM / 1000" in data.get("note", "")
        
        print(f"✅ Recalculate Stats: {data['endpoints_updated']} endpoints updated")
    
    def test_recalculate_stats_shows_changes(self):
        """Test recalculate-stats shows old_stats, new_stats and changes"""
        response = requests.post(f"{BASE_URL}/api/ssp-analytics/recalculate-stats")
        assert response.status_code == 200
        data = response.json()
        
        for detail in data["details"]:
            assert "ssp_id" in detail
            assert "name" in detail
            assert "old_stats" in detail
            assert "new_stats" in detail
            assert "changes" in detail
            
            # Verify structure of old_stats and new_stats
            for stats in [detail["old_stats"], detail["new_stats"]]:
                assert "total_requests" in stats
                assert "total_bids" in stats
                assert "total_wins" in stats
                assert "total_spend" in stats
            
            print(f"✅ SSP {detail['name']}: spend=${detail['new_stats']['total_spend']}")


class TestAdPerformanceReportDimensions:
    """Tests for Ad Performance Report data accuracy for new dimensions"""
    
    def test_source_dimension_returns_real_data(self):
        """Test source dimension returns SSP names from bid_logs"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance?dimensions=source&metrics=impressions&num_rows=10"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["report_metadata"]["is_real_data"] == True
        assert len(data["data"]) > 0
        
        # Verify source field exists in data
        for row in data["data"]:
            assert "source" in row
            print(f"✅ Source: {row['source']}, Impressions: {row.get('impressions', 0)}")
    
    def test_domain_dimension_returns_data(self):
        """Test domain dimension from request_summary"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance?dimensions=domain&metrics=impressions&num_rows=10"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["data"]) > 0
        for row in data["data"]:
            assert "domain" in row
    
    def test_bundle_dimension_returns_app_bundles(self):
        """Test bundle dimension returns app bundle IDs"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance?dimensions=bundle&metrics=impressions&num_rows=10"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["data"]) > 0
        for row in data["data"]:
            assert "bundle" in row
            # Bundle should be like com.xxx.xxx format
            print(f"✅ Bundle: {row['bundle']}")
    
    def test_app_name_dimension_returns_app_names(self):
        """Test app_name dimension returns human-readable app names"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance?dimensions=app_name&metrics=impressions&num_rows=10"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["data"]) > 0
        for row in data["data"]:
            assert "app_name" in row
            print(f"✅ App Name: {row['app_name']}")
    
    def test_ip_dimension_returns_ip_addresses(self):
        """Test ip dimension returns IP addresses"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance?dimensions=ip&metrics=impressions&num_rows=10"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["data"]) > 0
        for row in data["data"]:
            assert "ip" in row
            # IP should be like xxx.xxx.xxx.xxx format or 'Unknown'
            print(f"✅ IP: {row['ip']}")
    
    def test_device_ifa_dimension_returns_device_ids(self):
        """Test device_ifa dimension returns device IFA/advertising IDs"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance?dimensions=device_ifa&metrics=impressions&num_rows=10"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["data"]) > 0
        for row in data["data"]:
            assert "device_ifa" in row
            # Device IFA should be UUID format or 'Unknown'
            print(f"✅ Device IFA: {row['device_ifa']}")
    
    def test_all_new_dimensions_combined(self):
        """Test all new dimensions: source, domain, bundle, app_name, ip, device_ifa"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance?dimensions=source,domain,bundle,app_name,ip,device_ifa&metrics=impressions,spend,win_rate&num_rows=5"
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify report metadata
        metadata = data["report_metadata"]
        assert metadata["is_real_data"] == True
        assert metadata["data_source"] == "REAL DATA (From Bid Logs)"
        assert set(metadata["dimensions"]) == {"source", "domain", "bundle", "app_name", "ip", "device_ifa"}
        
        # Verify data structure
        assert len(data["data"]) > 0
        for row in data["data"]:
            assert "source" in row
            assert "domain" in row
            assert "bundle" in row
            assert "app_name" in row
            assert "ip" in row
            assert "device_ifa" in row
            
            # Verify metrics are present
            assert "impressions" in row
            assert "spend" in row
            assert "win_rate" in row
        
        print(f"✅ All 6 dimensions returning data correctly, {len(data['data'])} rows")


class TestWebSocketBidStream:
    """Tests for WebSocket bid stream stats - verifying stats object structure"""
    
    def test_bid_stream_endpoint_exists(self):
        """Test /api/bid-stream endpoint returns recent bids"""
        response = requests.get(f"{BASE_URL}/api/bid-stream?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        # Data should be a list of recent bids
        assert isinstance(data, list)
        print(f"✅ Bid stream endpoint returns {len(data)} recent bids")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

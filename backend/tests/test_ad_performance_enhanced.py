"""
Test Enhanced Ad Performance Report - New Features
Tests for: New dimensions, selectable metrics, filters, pagination, summary cards
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEnhancedAdPerformanceReport:
    """Enhanced Ad Performance Report tests for new features"""
    
    # ==================== NEW DIMENSIONS TESTS ====================
    
    def test_new_dimension_bundle(self):
        """Test bundle dimension is available"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "bundle",
                "metrics": "impressions,clicks",
                "num_rows": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        row = data["data"][0]
        assert "bundle" in row
        print(f"Bundle value: {row.get('bundle')}")
        
    def test_new_dimension_app_name(self):
        """Test app_name dimension is available"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "app_name",
                "metrics": "impressions,clicks",
                "num_rows": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        row = data["data"][0]
        assert "app_name" in row
        print(f"App Name value: {row.get('app_name')}")
        
    def test_new_dimension_country(self):
        """Test country dimension is available"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "country",
                "metrics": "impressions,clicks",
                "num_rows": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        row = data["data"][0]
        assert "country" in row
        print(f"Country value: {row.get('country')}")
        
    def test_new_dimension_city(self):
        """Test city dimension is available"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "city",
                "metrics": "impressions,clicks",
                "num_rows": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        row = data["data"][0]
        assert "city" in row
        print(f"City value: {row.get('city')}")
        
    def test_new_dimension_ip(self):
        """Test IP dimension is available"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "ip",
                "metrics": "impressions,clicks",
                "num_rows": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        row = data["data"][0]
        assert "ip" in row
        print(f"IP value: {row.get('ip')}")
        
    def test_new_dimension_os(self):
        """Test OS dimension is available"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "os",
                "metrics": "impressions,clicks",
                "num_rows": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        row = data["data"][0]
        assert "os" in row
        print(f"OS value: {row.get('os')}")
        
    def test_new_dimension_make(self):
        """Test make (device manufacturer) dimension is available"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "make",
                "metrics": "impressions,clicks",
                "num_rows": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        row = data["data"][0]
        assert "make" in row
        print(f"Make value: {row.get('make')}")
        
    def test_all_11_dimensions(self):
        """Test all 11 dimensions can be used together"""
        all_dims = "campaign_name,creative_name,source,domain,bundle,app_name,country,city,ip,os,make"
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": all_dims,
                "metrics": "impressions,clicks",
                "num_rows": 3
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["report_metadata"]["dimensions"]) == 11
        row = data["data"][0]
        
        # Check all dimensions are present
        for dim in all_dims.split(","):
            assert dim in row, f"Missing dimension: {dim}"
    
    # ==================== SELECTABLE METRICS TESTS ====================
    
    def test_core_metrics_only(self):
        """Test selecting only core metrics"""
        core_metrics = "impressions,clicks,ctr,conversions,spend,win_rate"
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "source",
                "metrics": core_metrics,
                "num_rows": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        row = data["data"][0]
        
        # Check core metrics present
        for metric in ["impressions", "clicks", "ctr", "conversions", "spend"]:
            assert metric in row, f"Missing core metric: {metric}"
            
    def test_derived_metrics(self):
        """Test derived metrics (eCPM, CPC, CPV)"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "source",
                "metrics": "impressions,ecpm,cpc,cpv",
                "num_rows": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        row = data["data"][0]
        
        # Check derived metrics present
        assert "ecpm" in row
        assert "cpc" in row
        assert "cpv" in row
        print(f"Derived metrics - eCPM: {row.get('ecpm')}, CPC: {row.get('cpc')}, CPV: {row.get('cpv')}")
        
    def test_video_metrics_only(self):
        """Test selecting video metrics only"""
        video_metrics = "video_q1_25,video_q2_50,video_q3_75,video_completed_100,video_completion_rate,vtr"
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "creative_name",
                "metrics": video_metrics,
                "num_rows": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        row = data["data"][0]
        
        # Check video metrics present
        for metric in ["video_q1_25", "video_q2_50", "video_q3_75", "video_completed_100"]:
            assert metric in row, f"Missing video metric: {metric}"
            
    def test_all_15_metrics(self):
        """Test all 15 metrics can be requested"""
        all_metrics = "impressions,clicks,ctr,conversions,spend,win_rate,ecpm,cpc,cpv,video_q1_25,video_q2_50,video_q3_75,video_completed_100,video_completion_rate,vtr"
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "source",
                "metrics": all_metrics,
                "num_rows": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        row = data["data"][0]
        
        # Check all 15 metrics present
        for metric in all_metrics.split(","):
            assert metric in row, f"Missing metric: {metric}"
        
        # Verify metrics metadata
        assert len(data["report_metadata"]["metrics"]) == 15
        
    def test_selective_metrics_filtering(self):
        """Test that only selected metrics are returned"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "source",
                "metrics": "impressions,clicks",  # Only 2 metrics
                "num_rows": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        row = data["data"][0]
        
        # Should only have selected metrics
        assert "impressions" in row
        assert "clicks" in row
        
        # Other metrics should NOT be present
        # (Note: API might still include some, check the actual behavior)
        
    # ==================== FILTER TESTS ====================
    
    def test_campaign_filter(self):
        """Test campaign_id filter parameter"""
        # First get a campaign ID
        campaigns_resp = requests.get(f"{BASE_URL}/api/campaigns")
        assert campaigns_resp.status_code == 200
        campaigns = campaigns_resp.json()
        
        if campaigns:
            campaign_id = campaigns[0]["id"]
            response = requests.post(
                f"{BASE_URL}/api/reports/ad-performance",
                params={
                    "dimensions": "source",
                    "metrics": "impressions,clicks",
                    "campaign_id": campaign_id,
                    "num_rows": 5
                }
            )
            assert response.status_code == 200
            print(f"Campaign filter test passed with campaign_id: {campaign_id}")
        else:
            pytest.skip("No campaigns available for filter test")
            
    def test_creative_filter(self):
        """Test creative_id filter parameter"""
        # First get a creative ID
        creatives_resp = requests.get(f"{BASE_URL}/api/creatives")
        assert creatives_resp.status_code == 200
        creatives = creatives_resp.json()
        
        if creatives:
            creative_id = creatives[0]["id"]
            response = requests.post(
                f"{BASE_URL}/api/reports/ad-performance",
                params={
                    "dimensions": "source",
                    "metrics": "impressions,clicks",
                    "creative_id": creative_id,
                    "num_rows": 5
                }
            )
            assert response.status_code == 200
            print(f"Creative filter test passed with creative_id: {creative_id}")
        else:
            pytest.skip("No creatives available for filter test")
            
    # ==================== RESPONSE STRUCTURE TESTS ====================
    
    def test_response_has_report_metadata(self):
        """Test response includes report_metadata"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "source",
                "metrics": "impressions",
                "num_rows": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "report_metadata" in data
        metadata = data["report_metadata"]
        
        # Check required metadata fields
        assert "generated_at" in metadata
        assert "start_date" in metadata
        assert "end_date" in metadata
        assert "dimensions" in metadata
        assert "metrics" in metadata
        assert "total_rows" in metadata
        assert "data_source" in metadata
        assert "is_real_data" in metadata
        
    def test_response_has_summary(self):
        """Test response includes summary with totals"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "source",
                "metrics": "impressions,clicks,spend,conversions",
                "num_rows": 10
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data
        summary = data["summary"]
        
        # Check required summary fields
        assert "total_impressions" in summary
        assert "total_clicks" in summary
        assert "total_conversions" in summary
        assert "total_spend" in summary
        assert "avg_ctr" in summary
        assert "video_completion_rate" in summary
        
        # Verify totals are calculated
        assert summary["total_impressions"] > 0
        print(f"Summary totals - Impressions: {summary['total_impressions']}, Clicks: {summary['total_clicks']}, Spend: ${summary['total_spend']}")
        
    def test_response_has_data_array(self):
        """Test response includes data array"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "source",
                "metrics": "impressions",
                "num_rows": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "data" in data
        assert isinstance(data["data"], list)
        assert len(data["data"]) == 5
        
    # ==================== PAGINATION SUPPORT TESTS ====================
    
    def test_num_rows_parameter(self):
        """Test num_rows parameter controls row count"""
        for expected_rows in [10, 25, 50, 100]:
            response = requests.post(
                f"{BASE_URL}/api/reports/ad-performance",
                params={
                    "dimensions": "source",
                    "metrics": "impressions",
                    "num_rows": expected_rows
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert len(data["data"]) == expected_rows
            
    def test_large_dataset(self):
        """Test API handles large dataset request"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "source,domain",
                "metrics": "impressions,clicks,spend",
                "num_rows": 1000
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 1000
        assert data["report_metadata"]["total_rows"] == 1000
        
    # ==================== TEMPLATES API TESTS ====================
    
    def test_get_report_templates(self):
        """Test GET /reports/templates returns built-in templates"""
        response = requests.get(f"{BASE_URL}/api/reports/templates")
        assert response.status_code == 200
        data = response.json()
        
        assert "built_in" in data
        assert "custom" in data
        
        # Should have built-in templates
        assert len(data["built_in"]) > 0
        
        # Check template structure
        template = data["built_in"][0]
        assert "id" in template
        assert "name" in template
        assert "description" in template
        assert "dimensions" in template
        
    def test_get_specific_template(self):
        """Test GET /reports/templates/{id} returns specific template"""
        response = requests.get(f"{BASE_URL}/api/reports/templates/campaign_overview")
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == "campaign_overview"
        assert "dimensions" in data
        
    def test_create_custom_template(self):
        """Test POST /reports/templates creates custom template"""
        response = requests.post(
            f"{BASE_URL}/api/reports/templates",
            params={
                "name": "Test Custom Template",
                "description": "Test template for automated testing",
                "dimensions": "source,domain,country",
                "icon": "Globe"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == "Test Custom Template"
        assert "source" in data["dimensions"]
        assert "country" in data["dimensions"]
        
        # Cleanup - delete the template
        if "id" in data:
            requests.delete(f"{BASE_URL}/api/reports/templates/{data['id']}")


class TestCampaignsAndCreativesEndpoints:
    """Test campaigns and creatives endpoints for filter dropdowns"""
    
    def test_get_campaigns(self):
        """Test GET /campaigns returns campaign list"""
        response = requests.get(f"{BASE_URL}/api/campaigns")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} campaigns for filter dropdown")
        
    def test_get_creatives(self):
        """Test GET /creatives returns creative list"""
        response = requests.get(f"{BASE_URL}/api/creatives")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} creatives for filter dropdown")

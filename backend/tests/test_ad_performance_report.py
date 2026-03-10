"""
Test Ad Performance Report endpoints
- POST /reports/ad-performance - Generate report with mock data
- GET /reports/ad-performance/export/csv - Export CSV
- GET /reports/ad-performance/export/excel - Export Excel
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdPerformanceReport:
    """Ad Performance Report endpoint tests"""
    
    def test_generate_report_default_params(self):
        """Test report generation with default parameters"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "source,domain,creative_name",
                "num_rows": 10
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Check report metadata
        assert "report_metadata" in data
        assert data["report_metadata"]["data_source"] == "MOCK DATA (Demonstration)"
        assert data["report_metadata"]["total_rows"] == 10
        assert "source" in data["report_metadata"]["dimensions"]
        assert "domain" in data["report_metadata"]["dimensions"]
        assert "creative_name" in data["report_metadata"]["dimensions"]
        
        # Check summary
        assert "summary" in data
        summary = data["summary"]
        assert "total_impressions" in summary
        assert "total_reach" in summary
        assert "total_clicks" in summary
        assert "total_conversions" in summary
        assert "avg_ctr" in summary
        assert "video_completion_rate" in summary
        
        # Check data rows
        assert "data" in data
        assert len(data["data"]) == 10
        
    def test_generate_report_all_dimensions(self):
        """Test report generation with all 5 dimensions"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "source,domain,insertion_order,line_item,creative_name",
                "num_rows": 5
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Check all dimensions are included
        row = data["data"][0]
        assert "source" in row
        assert "domain" in row
        assert "insertion_order" in row
        assert "line_item" in row
        assert "creative_name" in row
        
    def test_generate_report_single_dimension(self):
        """Test report generation with single dimension"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "source",
                "num_rows": 5
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        row = data["data"][0]
        assert "source" in row
        # Other dimensions should not be present
        assert "domain" not in row
        
    def test_generate_report_performance_metrics(self):
        """Test report includes all performance metrics"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "source",
                "num_rows": 5
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        row = data["data"][0]
        
        # Performance metrics
        assert "impressions" in row
        assert "reach" in row
        assert "clicks" in row
        assert "ctr" in row
        assert "conversions" in row
        
    def test_generate_report_video_metrics(self):
        """Test report includes all video metrics"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "creative_name",
                "num_rows": 20
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        row = data["data"][0]
        
        # Video metrics
        assert "video_q1_25" in row
        assert "video_q2_50" in row
        assert "video_q3_75" in row
        assert "video_completed_100" in row
        assert "video_completion_rate" in row
        
    def test_generate_report_date_range(self):
        """Test report generation with custom date range"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "source",
                "start_date": "2026-01-01",
                "end_date": "2026-01-31",
                "num_rows": 5
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["report_metadata"]["start_date"] == "2026-01-01"
        assert data["report_metadata"]["end_date"] == "2026-01-31"
        
    def test_export_csv(self):
        """Test CSV export endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/reports/ad-performance/export/csv",
            params={
                "dimensions": "source,domain",
                "num_rows": 5
            }
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "text/csv; charset=utf-8"
        
        # Check CSV content
        content = response.text
        lines = content.strip().split('\n')
        
        # Check header
        header = lines[0]
        assert "Source" in header
        assert "Domain" in header
        assert "Impressions" in header
        assert "Reach" in header
        assert "Clicks" in header
        assert "CTR" in header
        assert "Conversions" in header
        assert "Video Q1 (25%)" in header
        assert "Video Q2 (50%)" in header
        assert "Video Q3 (75%)" in header
        assert "Video Completed (100%)" in header
        assert "Video Completion Rate" in header
        
        # Check data rows
        assert len(lines) == 6  # 1 header + 5 data rows
        
    def test_export_csv_all_dimensions(self):
        """Test CSV export with all dimensions"""
        response = requests.get(
            f"{BASE_URL}/api/reports/ad-performance/export/csv",
            params={
                "dimensions": "source,domain,insertion_order,line_item,creative_name",
                "num_rows": 3
            }
        )
        assert response.status_code == 200
        
        content = response.text
        header = content.strip().split('\n')[0]
        assert "Source" in header
        assert "Domain" in header
        assert "Insertion Order" in header
        assert "Line Item" in header
        assert "Creative Name" in header
        
    def test_export_excel(self):
        """Test Excel export endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/reports/ad-performance/export/excel",
            params={
                "dimensions": "source,domain",
                "num_rows": 5
            }
        )
        assert response.status_code == 200
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in response.headers.get("content-type")
        
        # Check file is not empty
        assert len(response.content) > 0
        
        # Check Content-Disposition header for filename
        content_disposition = response.headers.get("content-disposition")
        assert "ad_performance_report" in content_disposition
        assert ".xlsx" in content_disposition
        
    def test_export_excel_file_content(self):
        """Test Excel export produces valid xlsx file"""
        response = requests.get(
            f"{BASE_URL}/api/reports/ad-performance/export/excel",
            params={
                "dimensions": "source,domain,creative_name",
                "num_rows": 10
            }
        )
        assert response.status_code == 200
        
        # Check XLSX file signature (magic bytes)
        content = response.content
        # XLSX files start with PK (zip signature)
        assert content[:2] == b'PK'
        
    def test_report_max_rows_limit(self):
        """Test that num_rows is capped at 1000"""
        response = requests.post(
            f"{BASE_URL}/api/reports/ad-performance",
            params={
                "dimensions": "source",
                "num_rows": 2000  # Request more than limit
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        # Should be capped at 1000
        assert data["report_metadata"]["total_rows"] <= 1000

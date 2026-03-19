"""
Test Role-Based Dashboard Templates
Tests GET /api/dashboard/role-data endpoint for different user roles:
- Advertiser: Campaign performance focus
- Admin: Team overview with aggregated metrics
- Super Admin: Platform health and all users activity
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
SUPER_ADMIN_CREDS = {"email": "superadmin@demo.com", "password": "demo123"}
ADMIN_CREDS = {"email": "admin@demo.com", "password": "demo123"}
ADVERTISER_CREDS = {"email": "advertiser@demo.com", "password": "demo123"}


@pytest.fixture(scope="module")
def super_admin_token():
    """Get Super Admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Super Admin login failed")


@pytest.fixture(scope="module")
def admin_token():
    """Get Admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin login failed")


@pytest.fixture(scope="module")
def advertiser_token():
    """Get Advertiser auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADVERTISER_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Advertiser login failed")


class TestSuperAdminDashboard:
    """Test Super Admin role-based dashboard data"""

    def test_super_admin_dashboard_returns_correct_role(self, super_admin_token):
        """Verify Super Admin gets role='super_admin'"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("role") == "super_admin", f"Expected 'super_admin' but got '{data.get('role')}'"

    def test_super_admin_welcome_message(self, super_admin_token):
        """Verify Super Admin gets 'Platform Overview' welcome message"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("welcome_message") == "Platform Overview", f"Expected 'Platform Overview' but got '{data.get('welcome_message')}'"

    def test_super_admin_stats_has_total_admins(self, super_admin_token):
        """Verify Super Admin stats includes total_admins"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        stats = data.get("stats", {})
        assert "total_admins" in stats, "Super Admin stats should include 'total_admins'"
        assert isinstance(stats["total_admins"], int), "total_admins should be an integer"

    def test_super_admin_platform_health(self, super_admin_token):
        """Verify Super Admin gets platform_health with logins_24h"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "platform_health" in data, "Super Admin should have 'platform_health'"
        health = data.get("platform_health", {})
        assert "logins_24h" in health, "platform_health should include 'logins_24h'"

    def test_super_admin_has_top_admins_list(self, super_admin_token):
        """Verify Super Admin gets top_admins list"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "top_admins" in data, "Super Admin should have 'top_admins'"
        assert isinstance(data["top_admins"], list), "top_admins should be a list"

    def test_super_admin_all_required_fields(self, super_admin_token):
        """Verify Super Admin gets all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Required top-level fields
        required_fields = ["role", "welcome_message", "stats", "top_admins", "platform_health", "recent_activity"]
        for field in required_fields:
            assert field in data, f"Super Admin response missing '{field}'"
        
        # Required stats fields
        stats = data.get("stats", {})
        required_stats = ["total_admins", "active_admins", "total_advertisers", "total_campaigns", "win_rate", "total_spend"]
        for stat in required_stats:
            assert stat in stats, f"Super Admin stats missing '{stat}'"
        
        # Required platform_health fields
        health = data.get("platform_health", {})
        required_health = ["logins_24h", "failed_logins_24h", "campaigns_by_status"]
        for h in required_health:
            assert h in health, f"platform_health missing '{h}'"


class TestAdminDashboard:
    """Test Admin role-based dashboard data"""

    def test_admin_dashboard_returns_correct_role(self, admin_token):
        """Verify Admin gets role='admin'"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("role") == "admin", f"Expected 'admin' but got '{data.get('role')}'"

    def test_admin_welcome_message(self, admin_token):
        """Verify Admin gets 'Team Overview' welcome message"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("welcome_message") == "Team Overview", f"Expected 'Team Overview' but got '{data.get('welcome_message')}'"

    def test_admin_stats_has_total_advertisers(self, admin_token):
        """Verify Admin stats includes total_advertisers"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        stats = data.get("stats", {})
        assert "total_advertisers" in stats, "Admin stats should include 'total_advertisers'"
        assert isinstance(stats["total_advertisers"], int), "total_advertisers should be an integer"

    def test_admin_has_top_advertisers_list(self, admin_token):
        """Verify Admin gets top_advertisers list"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "top_advertisers" in data, "Admin should have 'top_advertisers'"
        assert isinstance(data["top_advertisers"], list), "top_advertisers should be a list"

    def test_admin_has_campaigns_by_status(self, admin_token):
        """Verify Admin gets campaigns_by_status breakdown"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "campaigns_by_status" in data, "Admin should have 'campaigns_by_status'"
        status = data.get("campaigns_by_status", {})
        # Check status keys exist
        for key in ["active", "paused", "draft", "completed"]:
            assert key in status, f"campaigns_by_status missing '{key}'"

    def test_admin_all_required_fields(self, admin_token):
        """Verify Admin gets all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Required top-level fields
        required_fields = ["role", "welcome_message", "stats", "top_advertisers", "campaigns_by_status", "recent_activity"]
        for field in required_fields:
            assert field in data, f"Admin response missing '{field}'"
        
        # Required stats fields
        stats = data.get("stats", {})
        required_stats = ["total_advertisers", "active_advertisers", "total_campaigns", "active_campaigns", "total_bids", "win_rate", "total_spend"]
        for stat in required_stats:
            assert stat in stats, f"Admin stats missing '{stat}'"


class TestAdvertiserDashboard:
    """Test Advertiser role-based dashboard data"""

    def test_advertiser_dashboard_returns_correct_role(self, advertiser_token):
        """Verify Advertiser gets role='advertiser'"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {advertiser_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("role") == "advertiser", f"Expected 'advertiser' but got '{data.get('role')}'"

    def test_advertiser_welcome_message(self, advertiser_token):
        """Verify Advertiser gets 'Your Campaign Performance' welcome message"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {advertiser_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("welcome_message") == "Your Campaign Performance", f"Expected 'Your Campaign Performance' but got '{data.get('welcome_message')}'"

    def test_advertiser_stats_has_ctr(self, advertiser_token):
        """Verify Advertiser stats includes ctr (click-through rate)"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {advertiser_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        stats = data.get("stats", {})
        assert "ctr" in stats, "Advertiser stats should include 'ctr'"
        assert isinstance(stats["ctr"], (int, float)), "ctr should be a number"

    def test_advertiser_has_top_campaigns(self, advertiser_token):
        """Verify Advertiser gets top_campaigns list"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {advertiser_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "top_campaigns" in data, "Advertiser should have 'top_campaigns'"
        assert isinstance(data["top_campaigns"], list), "top_campaigns should be a list"

    def test_advertiser_has_recent_creatives(self, advertiser_token):
        """Verify Advertiser gets recent_creatives list"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {advertiser_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "recent_creatives" in data, "Advertiser should have 'recent_creatives'"
        assert isinstance(data["recent_creatives"], list), "recent_creatives should be a list"

    def test_advertiser_all_required_fields(self, advertiser_token):
        """Verify Advertiser gets all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {advertiser_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Required top-level fields
        required_fields = ["role", "welcome_message", "stats", "top_campaigns", "recent_creatives", "recent_activity"]
        for field in required_fields:
            assert field in data, f"Advertiser response missing '{field}'"
        
        # Required stats fields
        stats = data.get("stats", {})
        required_stats = ["total_campaigns", "active_campaigns", "total_bids", "total_wins", "win_rate", "total_spend", "ctr"]
        for stat in required_stats:
            assert stat in stats, f"Advertiser stats missing '{stat}'"


class TestDashboardAuthentication:
    """Test dashboard authentication requirements"""

    def test_dashboard_role_data_requires_auth(self):
        """Verify endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/dashboard/role-data")
        assert response.status_code == 401, "Should return 401 without authentication"

    def test_dashboard_role_data_invalid_token(self):
        """Verify endpoint rejects invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        assert response.status_code == 401, "Should return 401 with invalid token"


class TestRoleSpecificData:
    """Test that each role gets appropriate data specific to their role"""

    def test_super_admin_does_not_have_top_campaigns(self, super_admin_token):
        """Super Admin should have top_admins, not top_campaigns"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "top_admins" in data, "Super Admin should have top_admins"
        # top_campaigns is not expected for super_admin

    def test_admin_does_not_have_platform_health(self, admin_token):
        """Admin should NOT have platform_health (Super Admin only)"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "platform_health" not in data, "Admin should NOT have platform_health"

    def test_advertiser_does_not_have_top_advertisers(self, advertiser_token):
        """Advertiser should NOT have top_advertisers (Admin/Super Admin only)"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {advertiser_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "top_advertisers" not in data, "Advertiser should NOT have top_advertisers"

    def test_super_admin_has_total_endpoints(self, super_admin_token):
        """Super Admin should have total_endpoints in stats"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/role-data",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        stats = data.get("stats", {})
        assert "total_endpoints" in stats, "Super Admin stats should include 'total_endpoints'"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

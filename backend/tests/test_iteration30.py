"""
Test Suite: Iteration 30
Features Tested:
1. Access restriction / Access Not Allocated for restricted routes
2. Bulk delete users API (Super Admin only)
3. WebSocket notifications status endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_CREDS = {"email": "superadmin@demo.com", "password": "demo123"}
ADMIN_CREDS = {"email": "admin@demo.com", "password": "demo123"}
ADVERTISER_CREDS = {"email": "advertiser@demo.com", "password": "demo123"}


@pytest.fixture(scope="module")
def super_admin_token():
    """Get Super Admin JWT token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Super Admin authentication failed")


@pytest.fixture(scope="module")
def admin_token():
    """Get Admin JWT token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def advertiser_token():
    """Get Advertiser JWT token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADVERTISER_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Advertiser authentication failed")


class TestAuthentication:
    """Verify authentication for all three user types"""
    
    def test_super_admin_login(self):
        """Super Admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "super_admin"
        print(f"✓ Super Admin login successful, role: {data['user']['role']}")
    
    def test_admin_login(self):
        """Admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful, role: {data['user']['role']}")
    
    def test_advertiser_login(self):
        """Advertiser can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADVERTISER_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "advertiser"
        print(f"✓ Advertiser login successful, role: {data['user']['role']}")


class TestAccessRestrictions:
    """Test access restrictions based on roles"""
    
    def test_super_admin_has_admin_panel_access(self, super_admin_token):
        """Super Admin should have access to admin panel endpoints"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        print("✓ Super Admin can access /api/admin/users")
    
    def test_admin_has_admin_panel_access(self, admin_token):
        """Admin should have access to admin panel endpoints"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        print("✓ Admin can access /api/admin/users")
    
    def test_advertiser_cannot_access_admin_users(self, advertiser_token):
        """Advertiser should NOT have access to admin user list"""
        headers = {"Authorization": f"Bearer {advertiser_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 403
        print("✓ Advertiser correctly denied access to /api/admin/users (403)")
    
    def test_advertiser_cannot_access_role_configs(self, advertiser_token):
        """Advertiser should NOT have access to role configurations"""
        headers = {"Authorization": f"Bearer {advertiser_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/roles/config", headers=headers)
        assert response.status_code == 403
        print("✓ Advertiser correctly denied access to /api/admin/roles/config (403)")
    
    def test_admin_cannot_access_super_admin_only_endpoints(self, admin_token):
        """Admin should NOT have access to Super Admin only endpoints like role configs"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/roles/config", headers=headers)
        assert response.status_code == 403
        print("✓ Admin correctly denied access to /api/admin/roles/config (Super Admin only)")
    
    def test_user_sidebar_access_field(self, super_admin_token, admin_token, advertiser_token):
        """Verify all users have sidebar_access field in /api/auth/me"""
        for name, tok in [("Super Admin", super_admin_token), ("Admin", admin_token), ("Advertiser", advertiser_token)]:
            headers = {"Authorization": f"Bearer {tok}"}
            response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert "sidebar_access" in data, f"{name} missing sidebar_access"
            assert isinstance(data["sidebar_access"], list), f"{name} sidebar_access should be a list"
            print(f"✓ {name} has sidebar_access: {data['sidebar_access'][:5]}...")


class TestBulkDeleteAPI:
    """Test Bulk Delete Users API - POST /api/admin/users/bulk-delete"""
    
    def test_bulk_delete_requires_super_admin(self, admin_token):
        """Bulk delete should require Super Admin role"""
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        response = requests.post(
            f"{BASE_URL}/api/admin/users/bulk-delete",
            headers=headers,
            json={"user_ids": ["fake-id"]}
        )
        assert response.status_code == 403
        print("✓ Bulk delete correctly requires Super Admin (Admin got 403)")
    
    def test_bulk_delete_requires_user_ids(self, super_admin_token):
        """Bulk delete should require user_ids in request body"""
        headers = {"Authorization": f"Bearer {super_admin_token}", "Content-Type": "application/json"}
        response = requests.post(
            f"{BASE_URL}/api/admin/users/bulk-delete",
            headers=headers,
            json={"user_ids": []}
        )
        assert response.status_code == 400
        print("✓ Bulk delete correctly returns 400 for empty user_ids")
    
    def test_bulk_delete_cannot_delete_self(self, super_admin_token):
        """Super Admin cannot delete themselves via bulk delete"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        # Get current user's ID
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        my_id = me_response.json()["id"]
        
        # Try to bulk delete self
        headers["Content-Type"] = "application/json"
        response = requests.post(
            f"{BASE_URL}/api/admin/users/bulk-delete",
            headers=headers,
            json={"user_ids": [my_id]}
        )
        # Should return 400 because can't delete yourself
        assert response.status_code == 400
        print("✓ Bulk delete correctly prevents self-deletion (400)")
    
    def test_bulk_delete_returns_deleted_count(self, super_admin_token):
        """Bulk delete should return deleted_count in response"""
        headers = {"Authorization": f"Bearer {super_admin_token}", "Content-Type": "application/json"}
        
        # Create a test user first
        create_response = requests.post(
            f"{BASE_URL}/api/admin/users",
            headers=headers,
            json={
                "name": "TEST_BulkDelete",
                "email": "test_bulk_delete_user@test.com",
                "password": "testpass123",
                "role": "admin"
            }
        )
        
        if create_response.status_code == 201:
            test_user_id = create_response.json()["id"]
            print(f"  Created test user: {test_user_id}")
            
            # Now bulk delete
            response = requests.post(
                f"{BASE_URL}/api/admin/users/bulk-delete",
                headers=headers,
                json={"user_ids": [test_user_id]}
            )
            assert response.status_code == 200
            data = response.json()
            assert "deleted_count" in data
            assert data["deleted_count"] >= 1
            print(f"✓ Bulk delete returned deleted_count: {data['deleted_count']}")
        else:
            # User might already exist, skip
            print(f"  Test user creation returned {create_response.status_code}, skipping actual delete test")
            pytest.skip("Could not create test user for bulk delete test")


class TestWebSocketNotifications:
    """Test WebSocket Notification endpoints"""
    
    def test_notification_status_endpoint_exists(self, super_admin_token):
        """GET /api/notifications/status should return connected_users count"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/status", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "connected_users" in data
        assert isinstance(data["connected_users"], int)
        print(f"✓ Notification status endpoint works, connected_users: {data['connected_users']}")
    
    def test_notification_status_returns_users_for_super_admin(self, super_admin_token):
        """Super Admin should see users list in notification status"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/status", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert isinstance(data["users"], list)
        print(f"✓ Super Admin can see connected users list (length: {len(data['users'])})")
    
    def test_notification_status_admin_access(self, admin_token):
        """Admin should be able to access notification status"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/status", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "connected_users" in data
        print(f"✓ Admin can access notification status, connected_users: {data['connected_users']}")
    
    def test_notification_status_advertiser_denied(self, advertiser_token):
        """Advertiser should NOT have access to notification status"""
        headers = {"Authorization": f"Bearer {advertiser_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/status", headers=headers)
        assert response.status_code == 403
        print("✓ Advertiser correctly denied access to notification status (403)")
    
    def test_broadcast_endpoint_super_admin_only(self, admin_token, super_admin_token):
        """POST /api/notifications/broadcast should be Super Admin only"""
        # Admin should be denied
        admin_headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        response = requests.post(
            f"{BASE_URL}/api/notifications/broadcast",
            headers=admin_headers,
            params={"message": "Test", "notification_type": "system_message"}
        )
        assert response.status_code == 403
        print("✓ Broadcast correctly requires Super Admin (Admin got 403)")
        
        # Super Admin should be allowed
        sa_headers = {"Authorization": f"Bearer {super_admin_token}", "Content-Type": "application/json"}
        response = requests.post(
            f"{BASE_URL}/api/notifications/broadcast",
            headers=sa_headers,
            params={"message": "Test broadcast", "notification_type": "system_message"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "sent"
        print(f"✓ Super Admin can broadcast notifications")


class TestSidebarAccessEndpoints:
    """Test sidebar access related endpoints"""
    
    def test_sidebar_items_endpoint(self, super_admin_token):
        """Super Admin can fetch sidebar items list"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/sidebar-items", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
        assert len(data["items"]) > 0
        print(f"✓ Sidebar items endpoint returns {len(data['items'])} items")
        # Verify expected items
        item_ids = [item["id"] for item in data["items"]]
        expected_items = ["dashboard", "campaigns", "admin_panel"]
        for expected in expected_items:
            assert expected in item_ids, f"Missing sidebar item: {expected}"
        print(f"✓ Expected sidebar items present: {expected_items}")
    
    def test_permissions_endpoint(self, super_admin_token):
        """Super Admin can fetch permissions list"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/permissions", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "permissions" in data
        assert isinstance(data["permissions"], list)
        print(f"✓ Permissions endpoint returns {len(data['permissions'])} permissions")


class TestUserManagementHierarchy:
    """Test user management follows 3-tier hierarchy"""
    
    def test_super_admin_can_see_all_users(self, super_admin_token):
        """Super Admin can see all users in the system"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        print(f"✓ Super Admin can see all users (count: {len(users)})")
        
        # Should see users of all roles
        roles = set(u["role"] for u in users)
        print(f"  Roles visible: {roles}")
    
    def test_admin_can_only_see_their_advertisers(self, admin_token):
        """Admin can only see their own advertisers"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        users = response.json()
        
        # Admin should only see advertisers (their children)
        for u in users:
            assert u["role"] == "advertiser", f"Admin should only see advertisers, found {u['role']}"
        print(f"✓ Admin only sees advertisers (count: {len(users)})")
    
    def test_hierarchy_endpoint(self, super_admin_token):
        """Super Admin can access hierarchy endpoint"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users/hierarchy", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "admins" in data
        assert isinstance(data["admins"], list)
        print(f"✓ Hierarchy endpoint returns {len(data['admins'])} admins")
        
        # Each admin should have children field
        for admin in data["admins"]:
            assert "children" in admin or "children_count" in admin
        print("✓ Hierarchy includes children information for admins")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";
import { toast } from "sonner";
import { 
  Users, Shield, Plus, Trash2, Eye, EyeOff, 
  LayoutDashboard, ChevronDown, ChevronRight, ChevronLeft,
  UserPlus, LogIn, Save, RefreshCw, FileText,
  Key, Lock, Smartphone, Copy, CheckCircle2, Search,
  Download, Activity, TrendingUp, Building2, Target,
  ArrowRight, Home, BarChart3
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminPanel() {
  const { user, token, hasRole, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // View state for breadcrumb navigation
  const [viewMode, setViewMode] = useState("overview"); // overview, admin, advertiser
  const [viewingAdmin, setViewingAdmin] = useState(null);
  const [viewingAdvertiser, setViewingAdvertiser] = useState(null);
  
  // Core data
  const [users, setUsers] = useState([]);
  const [hierarchy, setHierarchy] = useState(null);
  const [roleConfigs, setRoleConfigs] = useState({});
  const [sidebarItems, setSidebarItems] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [activityTimeline, setActivityTimeline] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "advertiser" });
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  
  // Bulk selection state
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  // Audit logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  
  // 2FA
  const [twoFAStatus, setTwoFAStatus] = useState({ enabled: false, can_enable: false });
  const [twoFASetup, setTwoFASetup] = useState(null);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  
  // Access control
  const [selectedRole, setSelectedRole] = useState("advertiser");
  const [expandedAdmins, setExpandedAdmins] = useState({});
  const [editedSidebarAccess, setEditedSidebarAccess] = useState([]);
  const [editedPermissions, setEditedPermissions] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isSuperAdmin = hasRole("super_admin");
  const isAdmin = hasRole("admin");

  // Get allowed roles for user creation - 3 tier hierarchy
  const getAllowedRoles = () => {
    if (isSuperAdmin) {
      return ["admin"]; // Super Admin can ONLY create Admins
    } else if (isAdmin) {
      return ["advertiser"]; // Admin can ONLY create Advertisers
    }
    return [];
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (roleConfigs[selectedRole]) {
      setEditedSidebarAccess(roleConfigs[selectedRole].sidebar_access || []);
      setEditedPermissions(roleConfigs[selectedRole].permissions || []);
      setHasUnsavedChanges(false);
    }
  }, [selectedRole, roleConfigs]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch users
      const usersRes = await fetch(`${API_URL}/api/admin/users`, { headers });
      if (usersRes.ok) setUsers(await usersRes.json());
      
      // Fetch 2FA status
      const twoFARes = await fetch(`${API_URL}/api/auth/2fa/status`, { headers });
      if (twoFARes.ok) setTwoFAStatus(await twoFARes.json());
      
      // Fetch stats
      const statsRes = await fetch(`${API_URL}/api/admin/stats`, { headers });
      if (statsRes.ok) setStats(await statsRes.json());
      
      // Fetch activity timeline
      const activityRes = await fetch(`${API_URL}/api/admin/activity-timeline?limit=10`, { headers });
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivityTimeline(data.activities || []);
      }
      
      // Super Admin only data
      if (isSuperAdmin) {
        const hierarchyRes = await fetch(`${API_URL}/api/admin/users/hierarchy`, { headers });
        if (hierarchyRes.ok) setHierarchy(await hierarchyRes.json());
        
        const configsRes = await fetch(`${API_URL}/api/admin/roles/config`, { headers });
        if (configsRes.ok) setRoleConfigs(await configsRes.json());
        
        const itemsRes = await fetch(`${API_URL}/api/admin/sidebar-items`, { headers });
        if (itemsRes.ok) {
          const data = await itemsRes.json();
          setSidebarItems(data.items);
        }
        
        const permsRes = await fetch(`${API_URL}/api/admin/permissions`, { headers });
        if (permsRes.ok) {
          const data = await permsRes.json();
          setPermissions(data.permissions);
        }
      }
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/audit-logs?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
      }
    } catch (error) {
      toast.error("Failed to load audit logs");
    } finally {
      setAuditLoading(false);
    }
  };

  const searchUsers = async () => {
    try {
      let url = `${API_URL}/api/admin/users/search?q=${encodeURIComponent(searchQuery)}`;
      if (roleFilter) url += `&role=${roleFilter}`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setUsers(await response.json());
      }
    } catch (error) {
      toast.error("Search failed");
    }
  };

  const exportUsersCSV = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "users_export.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success("Users exported successfully");
      }
    } catch (error) {
      toast.error("Export failed");
    }
  };

  const viewAdminDashboard = async (adminId) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/admin/${adminId}/dashboard-data`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setViewingAdmin(data);
        setViewMode("admin");
      }
    } catch (error) {
      toast.error("Failed to load admin dashboard");
    }
  };

  const viewAdvertiserDashboard = async (advertiserId) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/advertiser/${advertiserId}/dashboard-data`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setViewingAdvertiser(data);
        setViewMode("advertiser");
      }
    } catch (error) {
      toast.error("Failed to load advertiser dashboard");
    }
  };

  const setup2FA = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/2fa/setup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail);
      }
      const data = await response.json();
      setTwoFASetup(data);
      setShow2FASetup(true);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const enable2FA = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/2fa/enable`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: verificationCode }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail);
      }
      toast.success("2FA enabled successfully!");
      setShow2FASetup(false);
      setTwoFASetup(null);
      setVerificationCode("");
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const disable2FA = async () => {
    const code = prompt("Enter your 2FA code to disable:");
    if (!code) return;
    
    try {
      const response = await fetch(`${API_URL}/api/auth/2fa/disable`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail);
      }
      toast.success("2FA disabled successfully");
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
    toast.success("Copied to clipboard");
  };

  const createUser = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail);
      }

      toast.success("User created successfully");
      setShowCreateUser(false);
      setNewUser({ name: "", email: "", password: "", role: getAllowedRoles()[0] || "advertiser" });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/status?is_active=${!currentStatus}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail);
      }

      toast.success(`User ${!currentStatus ? "activated" : "deactivated"}`);
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/role?new_role=${newRole}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail);
      }

      toast.success("User role updated");
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail);
      }

      toast.success("User deleted");
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Bulk selection handlers
  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    const selectableUsers = users.filter(u => u.id !== user?.id);
    if (selectedUsers.length === selectableUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(selectableUsers.map(u => u.id));
    }
  };

  const bulkDeleteUsers = async () => {
    if (selectedUsers.length === 0) return;
    
    try {
      const response = await fetch(`${API_URL}/api/admin/users/bulk-delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_ids: selectedUsers }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail);
      }

      const result = await response.json();
      toast.success(`Successfully deleted ${result.deleted_count} user(s)`);
      setSelectedUsers([]);
      setShowBulkDeleteConfirm(false);
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const toggleSidebarItem = (itemId) => {
    setEditedSidebarAccess(prev => {
      const newItems = prev.includes(itemId)
        ? prev.filter(i => i !== itemId)
        : [...prev, itemId];
      setHasUnsavedChanges(true);
      return newItems;
    });
  };

  const togglePermission = (permId) => {
    setEditedPermissions(prev => {
      const newPerms = prev.includes(permId)
        ? prev.filter(p => p !== permId)
        : [...prev, permId];
      setHasUnsavedChanges(true);
      return newPerms;
    });
  };

  const saveAccessChanges = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/roles/bulk-update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: selectedRole,
          sidebar_access: editedSidebarAccess,
          permissions: editedPermissions,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail);
      }

      const data = await response.json();
      toast.success(`Access updated for ${selectedRole} role (${data.users_updated} users updated)`);
      setHasUnsavedChanges(false);
      fetchData();
      refreshUser();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "super_admin": return "bg-[#F59E0B]/20 text-[#F59E0B]";
      case "admin": return "bg-[#10B981]/20 text-[#10B981]";
      case "advertiser": return "bg-[#3B82F6]/20 text-[#3B82F6]";
      default: return "bg-[#64748B]/20 text-[#64748B]";
    }
  };

  const toggleAdminExpand = (adminId) => {
    setExpandedAdmins(prev => ({
      ...prev,
      [adminId]: !prev[adminId]
    }));
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000);
    
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Breadcrumb Navigation Component
  const Breadcrumb = () => (
    <div className="flex items-center gap-2 text-sm mb-4" data-testid="breadcrumb-nav">
      <button 
        onClick={() => { setViewMode("overview"); setViewingAdmin(null); setViewingAdvertiser(null); }}
        className={`flex items-center gap-1 ${viewMode === "overview" ? "text-[#3B82F6]" : "text-[#64748B] hover:text-[#F8FAFC]"}`}
      >
        <Home className="w-4 h-4" />
        Admin Panel
      </button>
      
      {viewMode === "admin" && viewingAdmin && (
        <>
          <ChevronRight className="w-4 h-4 text-[#64748B]" />
          <span className="text-[#3B82F6] flex items-center gap-1">
            <Building2 className="w-4 h-4" />
            {viewingAdmin.admin.name}
          </span>
        </>
      )}
      
      {viewMode === "advertiser" && viewingAdvertiser && (
        <>
          <ChevronRight className="w-4 h-4 text-[#64748B]" />
          {viewingAdmin && (
            <>
              <button 
                onClick={() => { setViewMode("admin"); setViewingAdvertiser(null); }}
                className="text-[#64748B] hover:text-[#F8FAFC] flex items-center gap-1"
              >
                <Building2 className="w-4 h-4" />
                {viewingAdmin.admin.name}
              </button>
              <ChevronRight className="w-4 h-4 text-[#64748B]" />
            </>
          )}
          <span className="text-[#3B82F6] flex items-center gap-1">
            <Target className="w-4 h-4" />
            {viewingAdvertiser.advertiser.name}
          </span>
        </>
      )}
    </div>
  );

  // Quick Stats Cards Component
  const QuickStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6" data-testid="quick-stats">
      {isSuperAdmin && (
        <Card className="surface-secondary border-panel">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#10B981]/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#F8FAFC]">{stats?.total_admins || 0}</p>
                <p className="text-xs text-[#64748B]">Total Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="surface-secondary border-panel">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#F8FAFC]">{stats?.total_advertisers || 0}</p>
              <p className="text-xs text-[#64748B]">Advertisers</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="surface-secondary border-panel">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#F8FAFC]">{stats?.total_campaigns || 0}</p>
              <p className="text-xs text-[#64748B]">Campaigns</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="surface-secondary border-panel">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#F8FAFC]">{stats?.active_campaigns || 0}</p>
              <p className="text-xs text-[#64748B]">Active</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="surface-secondary border-panel">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EC4899]/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[#EC4899]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#F8FAFC]">{stats?.total_creatives || 0}</p>
              <p className="text-xs text-[#64748B]">Creatives</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Activity Timeline Component
  const ActivityTimeline = () => (
    <Card className="surface-primary border-panel" data-testid="activity-timeline">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-[#F8FAFC] text-base">Recent Activity</CardTitle>
          <CardDescription className="text-[#64748B]">Latest actions across the platform</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchData} className="text-[#64748B]">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[280px] overflow-y-auto">
          {activityTimeline.length === 0 ? (
            <p className="text-[#64748B] text-sm text-center py-4">No recent activity</p>
          ) : (
            activityTimeline.map((activity, idx) => (
              <div key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#0B1221]">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  activity.action.includes('login') ? 'bg-[#3B82F6]/20' :
                  activity.action.includes('2fa') ? 'bg-[#F59E0B]/20' :
                  activity.action.includes('user') ? 'bg-[#10B981]/20' :
                  'bg-[#64748B]/20'
                }`}>
                  <Activity className={`w-4 h-4 ${
                    activity.action.includes('login') ? 'text-[#3B82F6]' :
                    activity.action.includes('2fa') ? 'text-[#F59E0B]' :
                    activity.action.includes('user') ? 'text-[#10B981]' :
                    'text-[#64748B]'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#F8FAFC] truncate">
                    <span className="font-medium">{activity.actor_name}</span>
                    <span className="text-[#64748B]"> {activity.action.replace(/\./g, ' ')}</span>
                  </p>
                  {activity.target_name && (
                    <p className="text-xs text-[#64748B]">{activity.target_type}: {activity.target_name}</p>
                  )}
                </div>
                <span className="text-xs text-[#64748B] flex-shrink-0">{formatTimeAgo(activity.timestamp)}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Admin Dashboard View (when viewing specific admin)
  const AdminDashboardView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#F8FAFC]">{viewingAdmin.admin.name}'s Dashboard</h2>
          <p className="text-[#64748B]">{viewingAdmin.admin.email}</p>
        </div>
        <Badge className={viewingAdmin.admin.is_active ? "bg-[#10B981]/20 text-[#10B981]" : "bg-[#EF4444]/20 text-[#EF4444]"}>
          {viewingAdmin.admin.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>
      
      {/* Admin Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="surface-secondary border-panel">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-[#F8FAFC]">{viewingAdmin.stats.total_advertisers}</p>
            <p className="text-sm text-[#64748B]">Advertisers</p>
          </CardContent>
        </Card>
        <Card className="surface-secondary border-panel">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-[#F8FAFC]">{viewingAdmin.stats.total_campaigns}</p>
            <p className="text-sm text-[#64748B]">Campaigns</p>
          </CardContent>
        </Card>
        <Card className="surface-secondary border-panel">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-[#F8FAFC]">{viewingAdmin.stats.active_campaigns}</p>
            <p className="text-sm text-[#64748B]">Active</p>
          </CardContent>
        </Card>
        <Card className="surface-secondary border-panel">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-[#F8FAFC]">${viewingAdmin.stats.total_spend?.toFixed(2) || '0.00'}</p>
            <p className="text-sm text-[#64748B]">Total Spend</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Admin's Advertisers */}
      <Card className="surface-primary border-panel">
        <CardHeader>
          <CardTitle className="text-[#F8FAFC]">Advertisers</CardTitle>
        </CardHeader>
        <CardContent>
          {viewingAdmin.advertisers.length === 0 ? (
            <p className="text-[#64748B] text-center py-4">No advertisers yet</p>
          ) : (
            <div className="space-y-2">
              {viewingAdmin.advertisers.map((adv) => (
                <div 
                  key={adv.id} 
                  className="flex items-center justify-between p-3 rounded-lg border border-[#2D3B55] hover:border-[#3B82F6]/50 cursor-pointer"
                  onClick={() => viewAdvertiserDashboard(adv.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#3B82F6]/20 flex items-center justify-center">
                      <span className="text-[#3B82F6] font-medium">{adv.name?.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-[#F8FAFC] font-medium">{adv.name}</p>
                      <p className="text-sm text-[#64748B]">{adv.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={adv.is_active ? "bg-[#10B981]/20 text-[#10B981]" : "bg-[#EF4444]/20 text-[#EF4444]"}>
                      {adv.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-[#64748B]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Advertiser Dashboard View
  const AdvertiserDashboardView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#F8FAFC]">{viewingAdvertiser.advertiser.name}'s Dashboard</h2>
          <p className="text-[#64748B]">{viewingAdvertiser.advertiser.email}</p>
        </div>
        <Badge className={viewingAdvertiser.advertiser.is_active ? "bg-[#10B981]/20 text-[#10B981]" : "bg-[#EF4444]/20 text-[#EF4444]"}>
          {viewingAdvertiser.advertiser.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>
      
      {/* Advertiser Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="surface-secondary border-panel">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-[#F8FAFC]">{viewingAdvertiser.stats.total_campaigns}</p>
            <p className="text-sm text-[#64748B]">Campaigns</p>
          </CardContent>
        </Card>
        <Card className="surface-secondary border-panel">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-[#F8FAFC]">{viewingAdvertiser.stats.active_campaigns}</p>
            <p className="text-sm text-[#64748B]">Active</p>
          </CardContent>
        </Card>
        <Card className="surface-secondary border-panel">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-[#F8FAFC]">{viewingAdvertiser.stats.total_creatives}</p>
            <p className="text-sm text-[#64748B]">Creatives</p>
          </CardContent>
        </Card>
        <Card className="surface-secondary border-panel">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-[#F8FAFC]">${viewingAdvertiser.stats.total_spend?.toFixed(2) || '0.00'}</p>
            <p className="text-sm text-[#64748B]">Spend</p>
          </CardContent>
        </Card>
        <Card className="surface-secondary border-panel">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-[#F8FAFC]">{viewingAdvertiser.stats.total_impressions?.toLocaleString() || 0}</p>
            <p className="text-sm text-[#64748B]">Impressions</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Campaigns */}
      <Card className="surface-primary border-panel">
        <CardHeader>
          <CardTitle className="text-[#F8FAFC]">Recent Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {viewingAdvertiser.campaigns.length === 0 ? (
            <p className="text-[#64748B] text-center py-4">No campaigns yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#2D3B55]">
                  <TableHead className="text-[#94A3B8]">Name</TableHead>
                  <TableHead className="text-[#94A3B8]">Status</TableHead>
                  <TableHead className="text-[#94A3B8]">Bids</TableHead>
                  <TableHead className="text-[#94A3B8]">Wins</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewingAdvertiser.campaigns.map((c) => (
                  <TableRow key={c.id} className="border-[#2D3B55]">
                    <TableCell className="text-[#F8FAFC]">{c.name}</TableCell>
                    <TableCell>
                      <Badge className={
                        c.status === 'active' ? 'bg-[#10B981]/20 text-[#10B981]' :
                        c.status === 'paused' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                        'bg-[#64748B]/20 text-[#64748B]'
                      }>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-[#64748B]">{c.bids || 0}</TableCell>
                    <TableCell className="text-[#64748B]">{c.wins || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]"></div>
      </div>
    );
  }

  // Render different views based on viewMode
  if (viewMode === "admin" && viewingAdmin) {
    return (
      <div className="p-6">
        <Breadcrumb />
        <AdminDashboardView />
      </div>
    );
  }

  if (viewMode === "advertiser" && viewingAdvertiser) {
    return (
      <div className="p-6">
        <Breadcrumb />
        <AdvertiserDashboardView />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="admin-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Admin Panel</h1>
          <p className="text-[#64748B]">
            {isSuperAdmin 
              ? "Manage admins, advertisers, and platform settings"
              : "Manage your advertisers"}
          </p>
        </div>
        <Badge className={getRoleBadgeColor(user?.role)}>
          {user?.role?.replace("_", " ").toUpperCase()}
        </Badge>
      </div>

      {/* Quick Stats */}
      <QuickStats />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="users" className="space-y-4">
            <TabsList className="surface-secondary border border-[#2D3B55]">
              <TabsTrigger value="users" className="data-[state=active]:bg-[#3B82F6]" data-testid="tab-users">
                <Users className="w-4 h-4 mr-2" /> {isSuperAdmin ? "All Users" : "Advertisers"}
              </TabsTrigger>
              {isSuperAdmin && (
                <>
                  <TabsTrigger value="hierarchy" className="data-[state=active]:bg-[#3B82F6]" data-testid="tab-hierarchy">
                    <Building2 className="w-4 h-4 mr-2" /> Hierarchy
                  </TabsTrigger>
                  <TabsTrigger value="access" className="data-[state=active]:bg-[#3B82F6]" data-testid="tab-access">
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Access
                  </TabsTrigger>
                  <TabsTrigger value="audit" className="data-[state=active]:bg-[#3B82F6]" onClick={fetchAuditLogs} data-testid="tab-audit">
                    <FileText className="w-4 h-4 mr-2" /> Audit
                  </TabsTrigger>
                </>
              )}
              {(isAdmin || isSuperAdmin) && (
                <TabsTrigger value="security" className="data-[state=active]:bg-[#3B82F6]" data-testid="tab-security">
                  <Lock className="w-4 h-4 mr-2" /> Security
                </TabsTrigger>
              )}
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card className="surface-primary border-panel">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-[#F8FAFC]">
                        {isSuperAdmin ? "All Users" : "My Advertisers"}
                      </CardTitle>
                      <CardDescription className="text-[#64748B]">
                        {users.length} total
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                        <Input
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                          className="pl-9 w-40 surface-secondary border-[#2D3B55]"
                          data-testid="search-users-input"
                        />
                      </div>
                      {/* Role Filter */}
                      {isSuperAdmin && (
                        <Select value={roleFilter || "all"} onValueChange={(v) => { setRoleFilter(v === "all" ? "" : v); }}>
                          <SelectTrigger className="w-32 surface-secondary border-[#2D3B55]">
                            <SelectValue placeholder="All Roles" />
                          </SelectTrigger>
                          <SelectContent className="surface-primary border-[#2D3B55]">
                            <SelectItem value="all">All Roles</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="advertiser">Advertiser</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {/* Export */}
                      <Button variant="outline" size="sm" onClick={exportUsersCSV} className="border-[#2D3B55]" data-testid="export-csv-btn">
                        <Download className="w-4 h-4" />
                      </Button>
                      {/* Bulk Delete (Super Admin only) */}
                      {isSuperAdmin && selectedUsers.length > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowBulkDeleteConfirm(true)} 
                          className="border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10"
                          data-testid="bulk-delete-btn"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete ({selectedUsers.length})
                        </Button>
                      )}
                      {/* Create */}
                      <Button onClick={() => setShowCreateUser(true)} className="bg-[#3B82F6]" data-testid="create-user-btn">
                        <Plus className="w-4 h-4 mr-2" /> Add {isSuperAdmin ? "Admin" : "Advertiser"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#2D3B55]">
                        {isSuperAdmin && (
                          <TableHead className="w-10">
                            <Checkbox 
                              checked={selectedUsers.length > 0 && selectedUsers.length === users.filter(u => u.id !== user?.id).length}
                              onCheckedChange={toggleSelectAll}
                              className="data-[state=checked]:bg-[#3B82F6]"
                              data-testid="select-all-checkbox"
                            />
                          </TableHead>
                        )}
                        <TableHead className="text-[#94A3B8]">User</TableHead>
                        <TableHead className="text-[#94A3B8]">Role</TableHead>
                        <TableHead className="text-[#94A3B8]">Status</TableHead>
                        <TableHead className="text-[#94A3B8]">Created</TableHead>
                        <TableHead className="text-[#94A3B8]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id} className={`border-[#2D3B55] ${selectedUsers.includes(u.id) ? 'bg-[#3B82F6]/5' : ''}`}>
                          {isSuperAdmin && (
                            <TableCell>
                              {u.id !== user?.id && (
                                <Checkbox 
                                  checked={selectedUsers.includes(u.id)}
                                  onCheckedChange={() => toggleUserSelection(u.id)}
                                  className="data-[state=checked]:bg-[#3B82F6]"
                                  data-testid={`select-user-${u.id}`}
                                />
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getRoleBadgeColor(u.role)}`}>
                                <span className="text-sm font-medium">{u.name?.charAt(0)}</span>
                              </div>
                              <div>
                                <p className="text-[#F8FAFC] font-medium">{u.name}</p>
                                <p className="text-[#64748B] text-sm">{u.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getRoleBadgeColor(u.role)}>
                              {u.role?.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={u.is_active ? "bg-[#10B981]/20 text-[#10B981]" : "bg-[#EF4444]/20 text-[#EF4444]"}>
                              {u.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#64748B]">
                            {new Date(u.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {u.id !== user?.id && (
                              <div className="flex gap-1">
                                {/* View Dashboard - for admins viewing advertisers or super admin viewing anyone */}
                                {((isSuperAdmin && u.role === "admin") || (u.role === "advertiser")) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => u.role === "admin" ? viewAdminDashboard(u.id) : viewAdvertiserDashboard(u.id)}
                                    className="text-[#3B82F6] hover:text-[#3B82F6] hover:bg-[#3B82F6]/10"
                                    title="View Dashboard"
                                    data-testid={`view-dashboard-${u.id}`}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleUserStatus(u.id, u.is_active)}
                                  className="text-[#64748B] hover:text-[#F8FAFC]"
                                  title={u.is_active ? "Deactivate" : "Activate"}
                                >
                                  {u.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                                {isSuperAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteUser(u.id)}
                                    className="text-[#EF4444] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                                    title="Delete user"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Hierarchy Tab */}
            {isSuperAdmin && (
              <TabsContent value="hierarchy">
                <Card className="surface-primary border-panel">
                  <CardHeader>
                    <CardTitle className="text-[#F8FAFC]">Organization Hierarchy</CardTitle>
                    <CardDescription className="text-[#64748B]">
                      Super Admin → Admins → Advertisers
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {hierarchy?.admins?.map((admin) => (
                      <Collapsible
                        key={admin.id}
                        open={expandedAdmins[admin.id]}
                        onOpenChange={() => toggleAdminExpand(admin.id)}
                      >
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-4 rounded-lg border border-[#2D3B55] hover:border-[#3B82F6]/50 cursor-pointer transition-colors">
                            <div className="flex items-center gap-4">
                              {expandedAdmins[admin.id] ? (
                                <ChevronDown className="w-5 h-5 text-[#64748B]" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-[#64748B]" />
                              )}
                              <div className="w-10 h-10 rounded-full bg-[#10B981]/20 flex items-center justify-center">
                                <span className="text-[#10B981] font-medium">{admin.name?.charAt(0)}</span>
                              </div>
                              <div>
                                <p className="text-[#F8FAFC] font-medium">{admin.name}</p>
                                <p className="text-[#64748B] text-sm">{admin.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge className="bg-[#10B981]/20 text-[#10B981]">Admin</Badge>
                              <Badge variant="outline" className="border-[#2D3B55] text-[#94A3B8]">
                                {admin.children_count} advertisers
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); viewAdminDashboard(admin.id); }}
                                className="text-[#3B82F6]"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="ml-14 mt-2 space-y-2">
                          {admin.children?.map((child) => (
                            <div 
                              key={child.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-[#0B1221] border border-[#2D3B55]/50 cursor-pointer hover:border-[#3B82F6]/30"
                              onClick={() => viewAdvertiserDashboard(child.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#3B82F6]/20 flex items-center justify-center">
                                  <span className="text-[#3B82F6] text-sm">{child.name?.charAt(0)}</span>
                                </div>
                                <div>
                                  <p className="text-[#F8FAFC] text-sm">{child.name}</p>
                                  <p className="text-[#64748B] text-xs">{child.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-[#3B82F6]/20 text-[#3B82F6]">Advertiser</Badge>
                                <ArrowRight className="w-4 h-4 text-[#64748B]" />
                              </div>
                            </div>
                          ))}
                          {admin.children?.length === 0 && (
                            <p className="text-[#64748B] text-sm p-3">No advertisers yet</p>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                    
                    {hierarchy?.admins?.length === 0 && (
                      <p className="text-[#64748B] text-center py-8">No admins created yet</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Access Control Tab */}
            {isSuperAdmin && (
              <TabsContent value="access">
                <Card className="surface-primary border-panel">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-[#F8FAFC]">Access Control</CardTitle>
                      <CardDescription className="text-[#64748B]">
                        Configure sidebar and permissions by role
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger className="w-40 surface-secondary border-[#2D3B55]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="surface-primary border-[#2D3B55]">
                          <SelectItem value="advertiser">Advertiser</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={saveAccessChanges}
                        disabled={!hasUnsavedChanges || saving}
                        className={hasUnsavedChanges ? "bg-[#10B981] hover:bg-[#10B981]/90" : "bg-[#3B82F6] opacity-50"}
                      >
                        {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="text-[#F8FAFC] font-medium mb-3 flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4 text-[#3B82F6]" />
                        Sidebar Access
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {sidebarItems.map((item) => {
                          const isChecked = editedSidebarAccess.includes(item.id);
                          return (
                            <div
                              key={item.id}
                              onClick={() => toggleSidebarItem(item.id)}
                              className={`flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-all ${
                                isChecked ? "border-[#3B82F6] bg-[#3B82F6]/10" : "border-[#2D3B55] hover:border-[#3B82F6]/50 bg-[#0B1221]"
                              }`}
                            >
                              <Checkbox checked={isChecked} className="pointer-events-none data-[state=checked]:bg-[#3B82F6]" />
                              <span className="text-sm text-[#F8FAFC] truncate">{item.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#2D3B55]">
                      <h3 className="text-[#F8FAFC] font-medium mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#10B981]" />
                        Permissions
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {permissions.map((perm) => {
                          const isChecked = editedPermissions.includes(perm.id);
                          return (
                            <div
                              key={perm.id}
                              onClick={() => togglePermission(perm.id)}
                              className={`flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-all ${
                                isChecked ? "border-[#10B981] bg-[#10B981]/10" : "border-[#2D3B55] hover:border-[#10B981]/50 bg-[#0B1221]"
                              }`}
                            >
                              <Checkbox checked={isChecked} className="pointer-events-none data-[state=checked]:bg-[#10B981]" />
                              <span className="text-sm text-[#F8FAFC] truncate">{perm.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {hasUnsavedChanges && (
                      <div className="p-3 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30">
                        <p className="text-sm text-[#F59E0B]">Unsaved changes - click Save to apply</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Audit Logs Tab */}
            {isSuperAdmin && (
              <TabsContent value="audit">
                <Card className="surface-primary border-panel">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-[#F8FAFC]">Audit Logs</CardTitle>
                      <CardDescription className="text-[#64748B]">Track all actions</CardDescription>
                    </div>
                    <Button onClick={fetchAuditLogs} variant="outline" className="border-[#2D3B55]">
                      <RefreshCw className={`w-4 h-4 mr-2 ${auditLoading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {auditLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]"></div>
                      </div>
                    ) : auditLogs.length === 0 ? (
                      <p className="text-[#64748B] text-center py-8">No audit logs</p>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {auditLogs.map((log, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-[#0B1221] border border-[#2D3B55]">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <Badge className={
                                  log.action.includes('login') ? 'bg-[#3B82F6]/20 text-[#3B82F6]' :
                                  log.action.includes('2fa') ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                                  log.action.includes('user') ? 'bg-[#10B981]/20 text-[#10B981]' :
                                  'bg-[#64748B]/20 text-[#64748B]'
                                }>
                                  {log.action}
                                </Badge>
                                <span className="text-sm text-[#F8FAFC]">{log.actor?.email}</span>
                              </div>
                              <span className="text-xs text-[#64748B]">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {log.target?.name && (
                              <p className="text-xs text-[#94A3B8] mt-1">Target: {log.target.type} - {log.target.name}</p>
                            )}
                            {!log.success && (
                              <p className="text-xs text-[#EF4444] mt-1">{log.error_message}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Security Tab */}
            {(isAdmin || isSuperAdmin) && (
              <TabsContent value="security">
                <Card className="surface-primary border-panel">
                  <CardHeader>
                    <CardTitle className="text-[#F8FAFC]">Security Settings</CardTitle>
                    <CardDescription className="text-[#64748B]">Two-factor authentication</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 rounded-lg border border-[#2D3B55] bg-[#0B1221]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${twoFAStatus.enabled ? 'bg-[#10B981]/20' : 'bg-[#64748B]/20'}`}>
                            <Smartphone className={`w-5 h-5 ${twoFAStatus.enabled ? 'text-[#10B981]' : 'text-[#64748B]'}`} />
                          </div>
                          <div>
                            <h3 className="text-[#F8FAFC] font-medium">Two-Factor Authentication</h3>
                            <p className="text-sm text-[#64748B]">
                              {twoFAStatus.enabled ? "2FA is enabled" : "Add extra security"}
                            </p>
                          </div>
                        </div>
                        {twoFAStatus.enabled ? (
                          <Button onClick={disable2FA} variant="outline" className="border-[#EF4444] text-[#EF4444]">
                            Disable
                          </Button>
                        ) : (
                          <Button onClick={setup2FA} className="bg-[#10B981]" data-testid="enable-2fa-btn">
                            Enable
                          </Button>
                        )}
                      </div>
                      {twoFAStatus.enabled && (
                        <div className="mt-3 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                          <span className="text-sm text-[#10B981]">Protected with 2FA</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Activity Timeline Sidebar */}
        <div className="lg:col-span-1">
          <ActivityTimeline />
        </div>
      </div>

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FASetup} onOpenChange={setShow2FASetup}>
        <DialogContent className="surface-primary border-panel max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#F8FAFC]">Setup 2FA</DialogTitle>
          </DialogHeader>
          {twoFASetup && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#0B1221] border border-[#2D3B55]">
                <p className="text-sm text-[#94A3B8] mb-3">Scan with authenticator app:</p>
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(twoFASetup.qr_code_url)}`}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>
              <div className="p-4 rounded-lg bg-[#0B1221] border border-[#2D3B55]">
                <p className="text-sm text-[#94A3B8] mb-2">Or enter manually:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-[#020408] rounded text-[#F8FAFC] text-sm font-mono">{twoFASetup.secret}</code>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(twoFASetup.secret)} className="text-[#3B82F6]">
                    {copiedSecret ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30">
                <p className="text-sm text-[#F59E0B] font-medium mb-2">Backup codes:</p>
                <div className="grid grid-cols-2 gap-2">
                  {twoFASetup.backup_codes.map((code, idx) => (
                    <code key={idx} className="p-1 bg-[#020408] rounded text-center text-sm text-[#F8FAFC] font-mono">{code}</code>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Enter 6-digit code:</Label>
                <Input
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC] text-center text-lg tracking-widest"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShow2FASetup(false)} className="border-[#2D3B55]">Cancel</Button>
            <Button onClick={enable2FA} disabled={verificationCode.length !== 6} className="bg-[#10B981]">Verify & Enable</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent className="surface-primary border-panel">
          <DialogHeader>
            <DialogTitle className="text-[#F8FAFC]">
              Create New {isSuperAdmin ? "Admin" : "Advertiser"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Name</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Full name"
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Email</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="email@example.com"
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Password</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Min 6 characters"
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
              />
            </div>
            {getAllowedRoles().length > 1 && (
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Role</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger className="surface-secondary border-[#2D3B55]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="surface-primary border-[#2D3B55]">
                    {getAllowedRoles().map(role => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1).replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <p className="text-xs text-[#64748B]">
              {isSuperAdmin ? "As Super Admin, you can create Admin accounts" : "As Admin, you can create Advertiser accounts"}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateUser(false)} className="border-[#2D3B55]">Cancel</Button>
            <Button onClick={createUser} className="bg-[#3B82F6]">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent className="surface-primary border-panel">
          <DialogHeader>
            <DialogTitle className="text-[#F8FAFC]">Confirm Bulk Delete</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30">
              <p className="text-sm text-[#EF4444]">
                You are about to delete <strong>{selectedUsers.length} user(s)</strong>. This action cannot be undone.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-[#94A3B8]">Selected users:</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {users.filter(u => selectedUsers.includes(u.id)).map(u => (
                  <div key={u.id} className="flex items-center gap-2 p-2 rounded bg-[#0B1221]">
                    <span className="text-sm text-[#F8FAFC]">{u.name}</span>
                    <Badge className={getRoleBadgeColor(u.role)} size="sm">{u.role}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowBulkDeleteConfirm(false)} 
              className="border-[#2D3B55]"
            >
              Cancel
            </Button>
            <Button 
              onClick={bulkDeleteUsers} 
              className="bg-[#EF4444] hover:bg-[#EF4444]/90"
              data-testid="confirm-bulk-delete-btn"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {selectedUsers.length} User(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

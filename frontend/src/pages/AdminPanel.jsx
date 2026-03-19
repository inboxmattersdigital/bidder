import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
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
  LayoutDashboard, ChevronDown, ChevronRight, 
  UserPlus, LogIn, Save, RefreshCw, FileText,
  Key, Lock, Smartphone, Copy, CheckCircle2
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminPanel() {
  const { user, token, hasRole, refreshUser, login } = useAuth();
  const [users, setUsers] = useState([]);
  const [hierarchy, setHierarchy] = useState(null);
  const [roleConfigs, setRoleConfigs] = useState({});
  const [sidebarItems, setSidebarItems] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "advertiser" });
  
  // Audit logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  
  // 2FA
  const [twoFAStatus, setTwoFAStatus] = useState({ enabled: false, can_enable: false });
  const [twoFASetup, setTwoFASetup] = useState(null);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [selectedRole, setSelectedRole] = useState("user");
  const [expandedAdmins, setExpandedAdmins] = useState({});
  
  // Local state for editing (multi-select with save)
  const [editedSidebarAccess, setEditedSidebarAccess] = useState([]);
  const [editedPermissions, setEditedPermissions] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isSuperAdmin = hasRole("super_admin");
  const isAdmin = hasRole("admin");

  // Determine allowed roles for user creation based on current user's role
  const getAllowedRoles = () => {
    if (isSuperAdmin) {
      return ["admin", "advertiser", "user"];
    } else if (isAdmin) {
      return ["advertiser", "user"];
    }
    return [];
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update local state when role selection changes
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
      
      // Fetch hierarchy (super admin only)
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
      setNewUser({ name: "", email: "", password: "", role: "advertiser" });
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

  const impersonateUser = async (userId, userName) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/impersonate/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail);
      }

      const data = await response.json();
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('impersonating', 'true');
      localStorage.setItem('original_user', user?.name || 'Super Admin');
      toast.success(`Now viewing as ${userName}`);
      window.location.href = '/dashboard';
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Toggle sidebar access item in local state
  const toggleSidebarItem = (itemId) => {
    setEditedSidebarAccess(prev => {
      const newItems = prev.includes(itemId)
        ? prev.filter(i => i !== itemId)
        : [...prev, itemId];
      setHasUnsavedChanges(true);
      return newItems;
    });
  };

  // Toggle permission in local state
  const togglePermission = (permId) => {
    setEditedPermissions(prev => {
      const newPerms = prev.includes(permId)
        ? prev.filter(p => p !== permId)
        : [...prev, permId];
      setHasUnsavedChanges(true);
      return newPerms;
    });
  };

  // Save all changes (bulk update)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Admin Panel</h1>
          <p className="text-[#64748B]">
            {isSuperAdmin 
              ? "Manage users, roles, and permissions across the platform"
              : "Manage your team members"}
          </p>
        </div>
        <Badge className={getRoleBadgeColor(user?.role)}>
          {user?.role?.replace("_", " ").toUpperCase()}
        </Badge>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="surface-secondary border border-[#2D3B55]">
          <TabsTrigger value="users" className="data-[state=active]:bg-[#3B82F6]">
            <Users className="w-4 h-4 mr-2" /> Users
          </TabsTrigger>
          {isSuperAdmin && (
            <>
              <TabsTrigger value="hierarchy" className="data-[state=active]:bg-[#3B82F6]">
                <UserPlus className="w-4 h-4 mr-2" /> Hierarchy
              </TabsTrigger>
              <TabsTrigger value="access" className="data-[state=active]:bg-[#3B82F6]">
                <LayoutDashboard className="w-4 h-4 mr-2" /> Access Control
              </TabsTrigger>
              <TabsTrigger value="audit" className="data-[state=active]:bg-[#3B82F6]" onClick={fetchAuditLogs}>
                <FileText className="w-4 h-4 mr-2" /> Audit Logs
              </TabsTrigger>
            </>
          )}
          {(isAdmin || isSuperAdmin) && (
            <TabsTrigger value="security" className="data-[state=active]:bg-[#3B82F6]">
              <Lock className="w-4 h-4 mr-2" /> Security
            </TabsTrigger>
          )}
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card className="surface-primary border-panel">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[#F8FAFC]">
                  {isSuperAdmin ? "All Users" : "My Team"}
                </CardTitle>
                <CardDescription className="text-[#64748B]">
                  {users.length} total users
                </CardDescription>
              </div>
              <Button onClick={() => setShowCreateUser(true)} className="bg-[#3B82F6]">
                <Plus className="w-4 h-4 mr-2" /> Add {isSuperAdmin ? "User" : "Team Member"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2D3B55]">
                    <TableHead className="text-[#94A3B8]">User</TableHead>
                    <TableHead className="text-[#94A3B8]">Role</TableHead>
                    <TableHead className="text-[#94A3B8]">Created By</TableHead>
                    <TableHead className="text-[#94A3B8]">Status</TableHead>
                    <TableHead className="text-[#94A3B8]">Created</TableHead>
                    <TableHead className="text-[#94A3B8]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="border-[#2D3B55]">
                      <TableCell>
                        <div>
                          <p className="text-[#F8FAFC] font-medium">{u.name}</p>
                          <p className="text-[#64748B] text-sm">{u.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isSuperAdmin && u.id !== user?.id ? (
                          <Select
                            value={u.role}
                            onValueChange={(value) => updateUserRole(u.id, value)}
                          >
                            <SelectTrigger className="w-32 h-8 surface-secondary border-[#2D3B55]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="surface-primary border-[#2D3B55]">
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="advertiser">Advertiser</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={getRoleBadgeColor(u.role)}>
                            {u.role?.replace("_", " ")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-[#64748B] text-sm">
                        {u.created_by ? (
                          users.find(x => x.id === u.created_by)?.name || "System"
                        ) : "System"}
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
                            {isSuperAdmin && u.role !== "super_admin" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => impersonateUser(u.id, u.name)}
                                className="text-[#3B82F6] hover:text-[#3B82F6] hover:bg-[#3B82F6]/10"
                                title="View as this user"
                              >
                                <LogIn className="w-4 h-4" />
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

        {/* Hierarchy Tab (Super Admin only) */}
        {isSuperAdmin && (
          <TabsContent value="hierarchy">
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-[#F8FAFC]">User Hierarchy</CardTitle>
                <CardDescription className="text-[#64748B]">
                  View admins and their team members. Click on an admin to expand/collapse.
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
                            {admin.children_count} team members
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); impersonateUser(admin.id, admin.name); }}
                            className="text-[#3B82F6]"
                          >
                            <LogIn className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-14 mt-2 space-y-2">
                      {admin.children?.map((child) => (
                        <div 
                          key={child.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-[#0B1221] border border-[#2D3B55]/50"
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
                            <Badge className={getRoleBadgeColor(child.role)} variant="outline">
                              {child.role}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => impersonateUser(child.id, child.name)}
                              className="text-[#3B82F6] h-7"
                            >
                              <LogIn className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {admin.children?.length === 0 && (
                        <p className="text-[#64748B] text-sm p-3">No team members yet</p>
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

        {/* Access Control Tab (Super Admin only) */}
        {isSuperAdmin && (
          <TabsContent value="access">
            <Card className="surface-primary border-panel">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[#F8FAFC]">Access Control</CardTitle>
                  <CardDescription className="text-[#64748B]">
                    Configure sidebar access and permissions for each role
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-40 surface-secondary border-[#2D3B55]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="surface-primary border-[#2D3B55]">
                      <SelectItem value="user">User</SelectItem>
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
                    {saving ? (
                      <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="w-4 h-4 mr-2" /> Save Changes</>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sidebar Access */}
                <div>
                  <h3 className="text-[#F8FAFC] font-medium mb-3 flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4 text-[#3B82F6]" />
                    Sidebar Menu Access
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    {sidebarItems.map((item) => {
                      const isChecked = editedSidebarAccess.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleSidebarItem(item.id)}
                          className={`flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-all ${
                            isChecked 
                              ? "border-[#3B82F6] bg-[#3B82F6]/10" 
                              : "border-[#2D3B55] hover:border-[#3B82F6]/50 bg-[#0B1221]"
                          }`}
                        >
                          <Checkbox 
                            checked={isChecked} 
                            className="pointer-events-none data-[state=checked]:bg-[#3B82F6]" 
                          />
                          <span className="text-sm text-[#F8FAFC] truncate">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Permissions */}
                <div className="pt-4 border-t border-[#2D3B55]">
                  <h3 className="text-[#F8FAFC] font-medium mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#10B981]" />
                    Permissions
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    {permissions.map((perm) => {
                      const isChecked = editedPermissions.includes(perm.id);
                      return (
                        <div
                          key={perm.id}
                          onClick={() => togglePermission(perm.id)}
                          className={`flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-all ${
                            isChecked 
                              ? "border-[#10B981] bg-[#10B981]/10" 
                              : "border-[#2D3B55] hover:border-[#10B981]/50 bg-[#0B1221]"
                          }`}
                        >
                          <Checkbox 
                            checked={isChecked} 
                            className="pointer-events-none data-[state=checked]:bg-[#10B981]" 
                          />
                          <div className="min-w-0">
                            <span className="text-sm text-[#F8FAFC] truncate block">{perm.label}</span>
                            <span className="text-xs text-[#64748B]">{perm.category}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {hasUnsavedChanges && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30">
                    <p className="text-sm text-[#F59E0B]">
                      You have unsaved changes. Click "Save Changes" to apply them to all users with this role.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Audit Logs Tab (Super Admin only) */}
        {isSuperAdmin && (
          <TabsContent value="audit">
            <Card className="surface-primary border-panel">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[#F8FAFC]">Audit Logs</CardTitle>
                  <CardDescription className="text-[#64748B]">
                    Track all administrative actions
                  </CardDescription>
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
                  <p className="text-[#64748B] text-center py-8">No audit logs yet</p>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
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
                        {log.target && log.target.name && (
                          <p className="text-xs text-[#94A3B8] mt-1">
                            Target: {log.target.type} - {log.target.name}
                          </p>
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

        {/* Security Tab (Admin/Super Admin) */}
        {(isAdmin || isSuperAdmin) && (
          <TabsContent value="security">
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-[#F8FAFC]">Security Settings</CardTitle>
                <CardDescription className="text-[#64748B]">
                  Manage two-factor authentication and password settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 2FA Section */}
                <div className="p-4 rounded-lg border border-[#2D3B55] bg-[#0B1221]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        twoFAStatus.enabled ? 'bg-[#10B981]/20' : 'bg-[#64748B]/20'
                      }`}>
                        <Smartphone className={`w-5 h-5 ${twoFAStatus.enabled ? 'text-[#10B981]' : 'text-[#64748B]'}`} />
                      </div>
                      <div>
                        <h3 className="text-[#F8FAFC] font-medium">Two-Factor Authentication (2FA)</h3>
                        <p className="text-sm text-[#64748B]">
                          {twoFAStatus.enabled 
                            ? "2FA is enabled for your account" 
                            : "Add an extra layer of security to your account"}
                        </p>
                      </div>
                    </div>
                    {twoFAStatus.enabled ? (
                      <Button onClick={disable2FA} variant="outline" className="border-[#EF4444] text-[#EF4444]">
                        Disable 2FA
                      </Button>
                    ) : (
                      <Button onClick={setup2FA} className="bg-[#10B981]">
                        Enable 2FA
                      </Button>
                    )}
                  </div>
                  {twoFAStatus.enabled && (
                    <div className="mt-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                      <span className="text-sm text-[#10B981]">Your account is protected with 2FA</span>
                    </div>
                  )}
                </div>

                {/* Password Section */}
                <div className="p-4 rounded-lg border border-[#2D3B55] bg-[#0B1221]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/20 flex items-center justify-center">
                      <Key className="w-5 h-5 text-[#3B82F6]" />
                    </div>
                    <div>
                      <h3 className="text-[#F8FAFC] font-medium">Password</h3>
                      <p className="text-sm text-[#64748B]">Change your account password</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FASetup} onOpenChange={setShow2FASetup}>
        <DialogContent className="surface-primary border-panel max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#F8FAFC]">Set Up Two-Factor Authentication</DialogTitle>
          </DialogHeader>
          {twoFASetup && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#0B1221] border border-[#2D3B55]">
                <p className="text-sm text-[#94A3B8] mb-3">
                  1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(twoFASetup.qr_code_url)}`}
                    alt="2FA QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#0B1221] border border-[#2D3B55]">
                <p className="text-sm text-[#94A3B8] mb-2">Or enter this secret manually:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-[#020408] rounded text-[#F8FAFC] text-sm font-mono">
                    {twoFASetup.secret}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(twoFASetup.secret)}
                    className="text-[#3B82F6]"
                  >
                    {copiedSecret ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30">
                <p className="text-sm text-[#F59E0B] font-medium mb-2">Save these backup codes:</p>
                <div className="grid grid-cols-2 gap-2">
                  {twoFASetup.backup_codes.map((code, idx) => (
                    <code key={idx} className="p-1 bg-[#020408] rounded text-center text-sm text-[#F8FAFC] font-mono">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#94A3B8]">2. Enter the 6-digit code from your app</Label>
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
            <Button variant="outline" onClick={() => setShow2FASetup(false)} className="border-[#2D3B55]">
              Cancel
            </Button>
            <Button 
              onClick={enable2FA} 
              disabled={verificationCode.length !== 6}
              className="bg-[#10B981]"
            >
              Verify & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent className="surface-primary border-panel">
          <DialogHeader>
            <DialogTitle className="text-[#F8FAFC]">
              Create {isSuperAdmin ? "New User" : "New Team Member"}
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
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
              >
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
              <p className="text-xs text-[#64748B]">
                {isSuperAdmin 
                  ? "As Super Admin, you can create Admin, Advertiser, or User accounts"
                  : "As Admin, you can create Advertiser or User accounts"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateUser(false)} className="border-[#2D3B55]">
              Cancel
            </Button>
            <Button onClick={createUser} className="bg-[#3B82F6]">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

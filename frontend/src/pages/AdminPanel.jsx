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
import { toast } from "sonner";
import { 
  Users, Shield, Settings, Plus, Trash2, UserCog, 
  Check, X, Eye, EyeOff, LayoutDashboard
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminPanel() {
  const { user, token, hasRole, refreshUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roleConfigs, setRoleConfigs] = useState({});
  const [sidebarItems, setSidebarItems] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "user" });
  const [selectedRole, setSelectedRole] = useState("user");

  const isSuperAdmin = hasRole("super_admin");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch users
      const usersRes = await fetch(`${API_URL}/api/admin/users`, { headers });
      if (usersRes.ok) setUsers(await usersRes.json());
      
      // Fetch role configs (super admin only)
      if (isSuperAdmin) {
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
      setNewUser({ name: "", email: "", password: "", role: "user" });
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

  const updateRoleSidebar = async (role, items) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/roles/${role}/sidebar`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role, allowed_items: items }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail);
      }

      toast.success("Sidebar access updated");
      fetchData();
      refreshUser(); // Refresh current user if their role was updated
    } catch (error) {
      toast.error(error.message);
    }
  };

  const updateRolePermissions = async (role, perms) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/roles/${role}/permissions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role, permissions: perms }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail);
      }

      toast.success("Permissions updated");
      fetchData();
      refreshUser();
    } catch (error) {
      toast.error(error.message);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Admin Panel</h1>
          <p className="text-[#64748B]">Manage users, roles, and permissions</p>
        </div>
        <Badge className={getRoleBadgeColor(user?.role)}>
          {user?.role?.replace("_", " ").toUpperCase()}
        </Badge>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="surface-secondary">
          <TabsTrigger value="users" className="data-[state=active]:bg-[#3B82F6]">
            <Users className="w-4 h-4 mr-2" /> Users
          </TabsTrigger>
          {isSuperAdmin && (
            <>
              <TabsTrigger value="sidebar" className="data-[state=active]:bg-[#3B82F6]">
                <LayoutDashboard className="w-4 h-4 mr-2" /> Sidebar Access
              </TabsTrigger>
              <TabsTrigger value="permissions" className="data-[state=active]:bg-[#3B82F6]">
                <Shield className="w-4 h-4 mr-2" /> Permissions
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card className="surface-primary border-panel">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[#F8FAFC]">User Management</CardTitle>
                <CardDescription className="text-[#64748B]">
                  {users.length} total users
                </CardDescription>
              </div>
              <Button onClick={() => setShowCreateUser(true)} className="bg-[#3B82F6]">
                <Plus className="w-4 h-4 mr-2" /> Add User
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2D3B55]">
                    <TableHead className="text-[#94A3B8]">User</TableHead>
                    <TableHead className="text-[#94A3B8]">Role</TableHead>
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
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleUserStatus(u.id, u.is_active)}
                              className="text-[#64748B] hover:text-[#F8FAFC]"
                            >
                              {u.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            {isSuperAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteUser(u.id)}
                                className="text-[#EF4444] hover:text-[#EF4444]"
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

        {/* Sidebar Access Tab (Super Admin only) */}
        {isSuperAdmin && (
          <TabsContent value="sidebar">
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-[#F8FAFC]">Sidebar Access Control</CardTitle>
                <CardDescription className="text-[#64748B]">
                  Configure which menu items each role can access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Label className="text-[#94A3B8]">Select Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-48 mt-2 surface-secondary border-[#2D3B55]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="surface-primary border-[#2D3B55]">
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="advertiser">Advertiser</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
                  {sidebarItems.map((item) => {
                    const isChecked = roleConfigs[selectedRole]?.sidebar_access?.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isChecked 
                            ? "border-[#3B82F6] bg-[#3B82F6]/10" 
                            : "border-[#2D3B55] hover:border-[#3B82F6]/50"
                        }`}
                        onClick={() => {
                          const currentItems = roleConfigs[selectedRole]?.sidebar_access || [];
                          const newItems = isChecked
                            ? currentItems.filter((i) => i !== item.id)
                            : [...currentItems, item.id];
                          updateRoleSidebar(selectedRole, newItems);
                        }}
                      >
                        <Checkbox checked={isChecked} className="pointer-events-none" />
                        <span className="text-sm text-[#F8FAFC]">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Permissions Tab (Super Admin only) */}
        {isSuperAdmin && (
          <TabsContent value="permissions">
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-[#F8FAFC]">Role Permissions</CardTitle>
                <CardDescription className="text-[#64748B]">
                  Configure permissions for each role
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Label className="text-[#94A3B8]">Select Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-48 mt-2 surface-secondary border-[#2D3B55]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="surface-primary border-[#2D3B55]">
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="advertiser">Advertiser</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                  {permissions.map((perm) => {
                    const isChecked = roleConfigs[selectedRole]?.permissions?.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isChecked 
                            ? "border-[#10B981] bg-[#10B981]/10" 
                            : "border-[#2D3B55] hover:border-[#10B981]/50"
                        }`}
                        onClick={() => {
                          const currentPerms = roleConfigs[selectedRole]?.permissions || [];
                          const newPerms = isChecked
                            ? currentPerms.filter((p) => p !== perm.id)
                            : [...currentPerms, perm.id];
                          updateRolePermissions(selectedRole, newPerms);
                        }}
                      >
                        <Checkbox checked={isChecked} className="pointer-events-none" />
                        <div>
                          <span className="text-sm text-[#F8FAFC]">{perm.label}</span>
                          <p className="text-xs text-[#64748B]">{perm.category}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent className="surface-primary border-panel">
          <DialogHeader>
            <DialogTitle className="text-[#F8FAFC]">Create New User</DialogTitle>
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
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="advertiser">Advertiser</SelectItem>
                  {isSuperAdmin && (
                    <>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateUser(false)} className="border-[#2D3B55]">
              Cancel
            </Button>
            <Button onClick={createUser} className="bg-[#3B82F6]">
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

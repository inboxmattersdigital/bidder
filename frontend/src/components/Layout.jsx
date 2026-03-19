import { Outlet, NavLink, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";
import { 
  LayoutDashboard, 
  Megaphone, 
  Image, 
  Server, 
  ScrollText, 
  ArrowRightLeft,
  Zap,
  BarChart3,
  Gauge,
  Lightbulb,
  Brain,
  Sun,
  Moon,
  Scale,
  FlaskConical,
  ShieldAlert,
  Users,
  Activity,
  TrendingUp,
  GitBranch,
  PieChart,
  Target,
  FileSpreadsheet,
  Settings,
  LogOut,
  ChevronDown
} from "lucide-react";
import { cn } from "../lib/utils";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

// Map sidebar item IDs to nav items
const navItemsConfig = [
  { id: "dashboard", to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "campaigns", to: "/campaigns", icon: Megaphone, label: "Campaigns", end: true },
  { id: "compare", to: "/campaigns/compare", icon: Scale, label: "Compare" },
  { id: "media_planner", to: "/media-planner", icon: Target, label: "Media Planner" },
  { id: "creatives", to: "/creatives", icon: Image, label: "Creatives" },
  { id: "ssp_endpoints", to: "/ssp-endpoints", icon: Server, label: "SSP Endpoints" },
  { id: "ssp_analytics", to: "/ssp-analytics", icon: PieChart, label: "SSP Analytics" },
  { id: "bid_logs", to: "/bid-logs", icon: ScrollText, label: "Bid Logs" },
  { id: "bid_stream", to: "/bid-stream", icon: Activity, label: "Bid Stream" },
  { id: "reports", to: "/reports", icon: BarChart3, label: "Reports", end: true },
  { id: "ad_performance", to: "/reports/ad-performance", icon: FileSpreadsheet, label: "Ad Performance" },
  { id: "budget_pacing", to: "/pacing", icon: Gauge, label: "Budget Pacing" },
  { id: "insights", to: "/insights", icon: Lightbulb, label: "Insights" },
  { id: "ml_models", to: "/ml-models", icon: Brain, label: "ML Models" },
  { id: "bid_optimizer", to: "/bid-optimization", icon: TrendingUp, label: "Bid Optimizer" },
  { id: "ab_testing", to: "/ab-testing", icon: FlaskConical, label: "A/B Testing" },
  { id: "fraud", to: "/fraud-detection", icon: ShieldAlert, label: "Fraud" },
  { id: "audiences", to: "/audiences", icon: Users, label: "Audiences" },
  { id: "attribution", to: "/attribution", icon: GitBranch, label: "Attribution" },
  { id: "migration", to: "/migration-matrix", icon: ArrowRightLeft, label: "Migration" },
  { id: "admin_panel", to: "/admin", icon: Settings, label: "Admin Panel" },
];

export default function Layout() {
  const { user, isAuthenticated, loading, logout, hasSidebarAccess } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Default to dark
  });

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('light-theme', !isDarkMode);
  }, [isDarkMode]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020408] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Filter nav items based on user's sidebar access
  const visibleNavItems = navItemsConfig.filter(item => hasSidebarAccess(item.id));

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "super_admin": return "bg-[#F59E0B]/20 text-[#F59E0B]";
      case "admin": return "bg-[#10B981]/20 text-[#10B981]";
      case "advertiser": return "bg-[#3B82F6]/20 text-[#3B82F6]";
      default: return "bg-[#64748B]/20 text-[#64748B]";
    }
  };

  return (
    <div className={cn("min-h-screen flex", isDarkMode ? "bg-[#020408]" : "bg-slate-100")} data-testid="app-layout">
      {/* Sidebar */}
      <aside className={cn(
        "w-56 flex flex-col border-r",
        isDarkMode ? "surface-primary border-[#2D3B55]" : "bg-white border-slate-200"
      )} data-testid="sidebar">
        {/* Logo */}
        <div className={cn("p-4 border-b", isDarkMode ? "border-[#2D3B55]" : "border-slate-200")}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm bg-[#3B82F6] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={cn("text-sm font-semibold", isDarkMode ? "text-[#F8FAFC]" : "text-slate-900")}>OpenRTB</h1>
              <p className={cn("text-[10px] uppercase tracking-wider", isDarkMode ? "text-[#64748B]" : "text-slate-500")}>Bidder</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto" data-testid="nav-menu">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150",
                  isActive
                    ? isDarkMode 
                      ? "nav-active text-[#F8FAFC] bg-[#151F32]"
                      : "text-[#3B82F6] bg-blue-50 font-medium"
                    : isDarkMode
                      ? "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151F32]/50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        
        {/* User Profile & Theme Toggle */}
        <div className={cn("p-4 border-t", isDarkMode ? "border-[#2D3B55]" : "border-slate-200")}>
          {/* Notification Bell */}
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs", isDarkMode ? "text-[#64748B]" : "text-slate-500")}>Notifications</span>
            <NotificationBell />
          </div>
          
          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start gap-2 mb-3 px-2",
                  isDarkMode ? "hover:bg-[#151F32]" : "hover:bg-slate-100"
                )}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 text-left">
                  <p className={cn("text-sm font-medium truncate", isDarkMode ? "text-[#F8FAFC]" : "text-slate-900")}>
                    {user?.name || "User"}
                  </p>
                  <Badge className={cn("text-[10px] px-1.5 py-0", getRoleBadgeColor(user?.role))}>
                    {user?.role?.replace("_", " ")}
                  </Badge>
                </div>
                <ChevronDown className="w-4 h-4 text-[#64748B]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 surface-primary border-[#2D3B55]">
              <DropdownMenuItem className="text-[#94A3B8]" disabled>
                {user?.email}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#2D3B55]" />
              <DropdownMenuItem 
                onClick={logout}
                className="text-[#EF4444] focus:text-[#EF4444] cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isDarkMode ? <Moon className="w-4 h-4 text-[#94A3B8]" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span className={cn("text-xs", isDarkMode ? "text-[#94A3B8]" : "text-slate-600")}>
                {isDarkMode ? "Dark" : "Light"}
              </span>
            </div>
            <Switch 
              checked={isDarkMode} 
              onCheckedChange={setIsDarkMode}
              data-testid="theme-toggle"
            />
          </div>
          <div className={cn("text-xs", isDarkMode ? "text-[#64748B]" : "text-slate-500")}>
            <p>OpenRTB 2.5/2.6</p>
            <p className="mt-1">DSP Bidder v1.0</p>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className={cn("flex-1 overflow-auto", !isDarkMode && "bg-slate-50")} data-testid="main-content">
        <Outlet />
      </main>
    </div>
  );
}

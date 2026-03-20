import { Outlet, NavLink, Navigate } from "react-router-dom";
import { useEffect } from "react";
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
  // Permanently light theme
  const isDarkMode = false;

  useEffect(() => {
    // Always apply light theme
    document.documentElement.classList.add('light-theme');
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
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
    <div className="min-h-screen flex bg-slate-50" data-testid="app-layout">
      {/* Sidebar */}
      <aside className="w-56 flex flex-col border-r bg-white border-slate-200" data-testid="sidebar">
        {/* Logo */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900">Innoviedge</h1>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">DSP Platform</p>
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
                    ? "text-[#3B82F6] bg-blue-50 font-medium border-l-2 border-[#3B82F6]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        
        {/* User Profile */}
        <div className="p-4 border-t border-slate-200">
          {/* Notification Bell */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500">Notifications</span>
            <NotificationBell />
          </div>
          
          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 mb-3 px-2 hover:bg-slate-100"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium truncate text-slate-900">
                    {user?.name || "User"}
                  </p>
                  <Badge className={cn("text-[10px] px-1.5 py-0", getRoleBadgeColor(user?.role))}>
                    {user?.role?.replace("_", " ")}
                  </Badge>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200">
              <DropdownMenuItem className="text-slate-500" disabled>
                {user?.email}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-200" />
              <DropdownMenuItem 
                onClick={() => window.location.href = '/settings'}
                className="text-slate-700 focus:text-slate-900 cursor-pointer"
              >
                <Settings className="w-4 h-4 mr-2" />
                Email Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-200" />
              <DropdownMenuItem 
                onClick={logout}
                className="text-[#EF4444] focus:text-[#EF4444] cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="text-xs text-slate-500">
            <p>Innoviedge DSP</p>
            <p className="mt-1">Programmatic Platform v1.0</p>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50" data-testid="main-content">
        <Outlet />
      </main>
    </div>
  );
}

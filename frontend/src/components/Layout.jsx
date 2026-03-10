import { Outlet, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
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
  FileSpreadsheet
} from "lucide-react";
import { cn } from "../lib/utils";
import { Switch } from "./ui/switch";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/campaigns", icon: Megaphone, label: "Campaigns" },
  { to: "/campaigns/compare", icon: Scale, label: "Compare" },
  { to: "/media-planner", icon: Target, label: "Media Planner" },
  { to: "/creatives", icon: Image, label: "Creatives" },
  { to: "/ssp-endpoints", icon: Server, label: "SSP Endpoints" },
  { to: "/ssp-analytics", icon: PieChart, label: "SSP Analytics" },
  { to: "/bid-logs", icon: ScrollText, label: "Bid Logs" },
  { to: "/bid-stream", icon: Activity, label: "Bid Stream" },
  { to: "/reports", icon: BarChart3, label: "Reports" },
  { to: "/reports/ad-performance", icon: FileSpreadsheet, label: "Ad Performance" },
  { to: "/pacing", icon: Gauge, label: "Budget Pacing" },
  { to: "/insights", icon: Lightbulb, label: "Insights" },
  { to: "/ml-models", icon: Brain, label: "ML Models" },
  { to: "/bid-optimization", icon: TrendingUp, label: "Bid Optimizer" },
  { to: "/ab-testing", icon: FlaskConical, label: "A/B Testing" },
  { to: "/fraud-detection", icon: ShieldAlert, label: "Fraud" },
  { to: "/audiences", icon: Users, label: "Audiences" },
  { to: "/attribution", icon: GitBranch, label: "Attribution" },
  { to: "/migration-matrix", icon: ArrowRightLeft, label: "Migration" },
];

export default function Layout() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Default to dark
  });

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('light-theme', !isDarkMode);
  }, [isDarkMode]);

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
        <nav className="flex-1 py-4" data-testid="nav-menu">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
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
        
        {/* Theme Toggle & Footer */}
        <div className={cn("p-4 border-t", isDarkMode ? "border-[#2D3B55]" : "border-slate-200")}>
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

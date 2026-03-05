import { Outlet, NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Megaphone, 
  Image, 
  Server, 
  ScrollText, 
  ArrowRightLeft,
  Zap
} from "lucide-react";
import { cn } from "../lib/utils";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/campaigns", icon: Megaphone, label: "Campaigns" },
  { to: "/creatives", icon: Image, label: "Creatives" },
  { to: "/ssp-endpoints", icon: Server, label: "SSP Endpoints" },
  { to: "/bid-logs", icon: ScrollText, label: "Bid Logs" },
  { to: "/migration-matrix", icon: ArrowRightLeft, label: "Migration Matrix" },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#020408] flex" data-testid="app-layout">
      {/* Sidebar */}
      <aside className="w-56 surface-primary border-r border-[#2D3B55] flex flex-col" data-testid="sidebar">
        {/* Logo */}
        <div className="p-4 border-b border-[#2D3B55]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm bg-[#3B82F6] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[#F8FAFC]">OpenRTB</h1>
              <p className="text-[10px] text-[#64748B] uppercase tracking-wider">Bidder</p>
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
                    ? "nav-active text-[#F8FAFC] bg-[#151F32]"
                    : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151F32]/50"
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        
        {/* Footer */}
        <div className="p-4 border-t border-[#2D3B55]">
          <div className="text-xs text-[#64748B]">
            <p>OpenRTB 2.5/2.6</p>
            <p className="mt-1">DSP Bidder v1.0</p>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto" data-testid="main-content">
        <Outlet />
      </main>
    </div>
  );
}

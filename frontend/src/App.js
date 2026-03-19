import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import Layout from "./components/Layout";
import { ProtectedRoute } from "./components/AccessDenied";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminPanel from "./pages/AdminPanel";
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";
import CampaignWizard from "./pages/CampaignWizard";
import Creatives from "./pages/Creatives";
import CreativeForm from "./pages/CreativeForm";
import CreativeEditor from "./pages/CreativeEditor";
import SSPEndpoints from "./pages/SSPEndpoints";
import SSPAnalytics from "./pages/SSPAnalytics";
import BidLogs from "./pages/BidLogs";
import MigrationMatrix from "./pages/MigrationMatrix";
import Reports from "./pages/Reports";
import AdPerformanceReport from "./pages/AdPerformanceReport";
import Pacing from "./pages/Pacing";
import Insights from "./pages/Insights";
import MLModels from "./pages/MLModels";
import BidOptimization from "./pages/BidOptimization";
import CampaignComparison from "./pages/CampaignComparison";
import ABTesting from "./pages/ABTesting";
import FraudDetection from "./pages/FraudDetection";
import Audiences from "./pages/Audiences";
import Attribution from "./pages/Attribution";
import BidStream from "./pages/BidStream";
import MediaPlanner from "./pages/MediaPlanner";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Toaster 
            position="bottom-right" 
            toastOptions={{
              style: {
                background: '#0B1221',
                border: '1px solid #2D3B55',
                color: '#F8FAFC',
              },
            }}
          />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<ProtectedRoute requiredSidebarAccess="dashboard"><Dashboard /></ProtectedRoute>} />
              <Route path="campaigns" element={<ProtectedRoute requiredSidebarAccess="campaigns"><Campaigns /></ProtectedRoute>} />
              <Route path="campaigns/new" element={<ProtectedRoute requiredSidebarAccess="campaigns"><CampaignWizard /></ProtectedRoute>} />
              <Route path="campaigns/:id/edit" element={<ProtectedRoute requiredSidebarAccess="campaigns"><CampaignWizard /></ProtectedRoute>} />
              <Route path="campaigns/compare" element={<ProtectedRoute requiredSidebarAccess="compare"><CampaignComparison /></ProtectedRoute>} />
              <Route path="creatives" element={<ProtectedRoute requiredSidebarAccess="creatives"><Creatives /></ProtectedRoute>} />
              <Route path="creatives/new" element={<ProtectedRoute requiredSidebarAccess="creatives"><CreativeForm /></ProtectedRoute>} />
              <Route path="creative-editor" element={<ProtectedRoute requiredSidebarAccess="creatives"><CreativeEditor /></ProtectedRoute>} />
              <Route path="ssp-endpoints" element={<ProtectedRoute requiredSidebarAccess="ssp_endpoints"><SSPEndpoints /></ProtectedRoute>} />
              <Route path="ssp-analytics" element={<ProtectedRoute requiredSidebarAccess="ssp_analytics"><SSPAnalytics /></ProtectedRoute>} />
              <Route path="bid-logs" element={<ProtectedRoute requiredSidebarAccess="bid_logs"><BidLogs /></ProtectedRoute>} />
              <Route path="bid-stream" element={<ProtectedRoute requiredSidebarAccess="bid_stream"><BidStream /></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute requiredSidebarAccess="reports"><Reports /></ProtectedRoute>} />
              <Route path="reports/ad-performance" element={<ProtectedRoute requiredSidebarAccess="ad_performance"><AdPerformanceReport /></ProtectedRoute>} />
              <Route path="pacing" element={<ProtectedRoute requiredSidebarAccess="budget_pacing"><Pacing /></ProtectedRoute>} />
              <Route path="insights" element={<ProtectedRoute requiredSidebarAccess="insights"><Insights /></ProtectedRoute>} />
              <Route path="ml-models" element={<ProtectedRoute requiredSidebarAccess="ml_models"><MLModels /></ProtectedRoute>} />
              <Route path="bid-optimization" element={<ProtectedRoute requiredSidebarAccess="bid_optimizer"><BidOptimization /></ProtectedRoute>} />
              <Route path="ab-testing" element={<ProtectedRoute requiredSidebarAccess="ab_testing"><ABTesting /></ProtectedRoute>} />
              <Route path="fraud-detection" element={<ProtectedRoute requiredSidebarAccess="fraud"><FraudDetection /></ProtectedRoute>} />
              <Route path="audiences" element={<ProtectedRoute requiredSidebarAccess="audiences"><Audiences /></ProtectedRoute>} />
              <Route path="attribution" element={<ProtectedRoute requiredSidebarAccess="attribution"><Attribution /></ProtectedRoute>} />
              <Route path="media-planner" element={<ProtectedRoute requiredSidebarAccess="media_planner"><MediaPlanner /></ProtectedRoute>} />
              <Route path="migration-matrix" element={<ProtectedRoute requiredSidebarAccess="migration"><MigrationMatrix /></ProtectedRoute>} />
              <Route path="admin" element={<ProtectedRoute requiredSidebarAccess="admin_panel"><AdminPanel /></ProtectedRoute>} />
            </Route>
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

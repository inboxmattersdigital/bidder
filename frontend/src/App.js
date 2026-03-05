import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";
import CampaignForm from "./pages/CampaignForm";
import Creatives from "./pages/Creatives";
import CreativeForm from "./pages/CreativeForm";
import SSPEndpoints from "./pages/SSPEndpoints";
import BidLogs from "./pages/BidLogs";
import MigrationMatrix from "./pages/MigrationMatrix";
import Reports from "./pages/Reports";
import Pacing from "./pages/Pacing";
import Insights from "./pages/Insights";
import MLModels from "./pages/MLModels";
import CampaignComparison from "./pages/CampaignComparison";
import ABTesting from "./pages/ABTesting";
import FraudDetection from "./pages/FraudDetection";
import Audiences from "./pages/Audiences";
import BidStream from "./pages/BidStream";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
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
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="campaigns/new" element={<CampaignForm />} />
          <Route path="campaigns/:id/edit" element={<CampaignForm />} />
          <Route path="campaigns/compare" element={<CampaignComparison />} />
          <Route path="creatives" element={<Creatives />} />
          <Route path="creatives/new" element={<CreativeForm />} />
          <Route path="ssp-endpoints" element={<SSPEndpoints />} />
          <Route path="bid-logs" element={<BidLogs />} />
          <Route path="bid-stream" element={<BidStream />} />
          <Route path="reports" element={<Reports />} />
          <Route path="pacing" element={<Pacing />} />
          <Route path="insights" element={<Insights />} />
          <Route path="ml-models" element={<MLModels />} />
          <Route path="ab-testing" element={<ABTesting />} />
          <Route path="fraud-detection" element={<FraudDetection />} />
          <Route path="audiences" element={<Audiences />} />
          <Route path="migration-matrix" element={<MigrationMatrix />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

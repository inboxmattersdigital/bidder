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
          <Route path="creatives" element={<Creatives />} />
          <Route path="creatives/new" element={<CreativeForm />} />
          <Route path="ssp-endpoints" element={<SSPEndpoints />} />
          <Route path="bid-logs" element={<BidLogs />} />
          <Route path="migration-matrix" element={<MigrationMatrix />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

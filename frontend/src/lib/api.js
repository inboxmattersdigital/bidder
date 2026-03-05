import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');
export const getChartData = () => api.get('/dashboard/chart-data');

// Campaigns
export const getCampaigns = (status) => 
  api.get('/campaigns', { params: status ? { status } : {} });
export const getCampaign = (id) => api.get(`/campaigns/${id}`);
export const createCampaign = (data) => api.post('/campaigns', data);
export const updateCampaign = (id, data) => api.put(`/campaigns/${id}`, data);
export const deleteCampaign = (id) => api.delete(`/campaigns/${id}`);
export const activateCampaign = (id) => api.post(`/campaigns/${id}/activate`);
export const pauseCampaign = (id) => api.post(`/campaigns/${id}/pause`);

// Creatives
export const getCreatives = (type) => 
  api.get('/creatives', { params: type ? { type } : {} });
export const getCreative = (id) => api.get(`/creatives/${id}`);
export const createCreative = (data) => api.post('/creatives', data);
export const deleteCreative = (id) => api.delete(`/creatives/${id}`);

// SSP Endpoints
export const getSSPEndpoints = () => api.get('/ssp-endpoints');
export const createSSPEndpoint = (data) => api.post('/ssp-endpoints', data);
export const deleteSSPEndpoint = (id) => api.delete(`/ssp-endpoints/${id}`);
export const regenerateAPIKey = (id) => api.post(`/ssp-endpoints/${id}/regenerate-key`);
export const updateSSPStatus = (id, status) => 
  api.put(`/ssp-endpoints/${id}/status`, null, { params: { status } });

// Bid Logs
export const getBidLogs = (limit = 50, offset = 0) => 
  api.get('/bid-logs', { params: { limit, offset } });
export const getBidLog = (id) => api.get(`/bid-logs/${id}`);

// Migration Matrix
export const getMigrationMatrix = () => api.get('/migration-matrix');

// Reporting
export const getReportSummary = (startDate, endDate) => 
  api.get('/reports/summary', { params: { start_date: startDate, end_date: endDate } });
export const getCampaignReport = (campaignId, startDate, endDate) => 
  api.get(`/reports/campaign/${campaignId}`, { params: { start_date: startDate, end_date: endDate } });

// Report Exports
export const exportReportCSV = (startDate, endDate, campaignId) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (campaignId) params.append('campaign_id', campaignId);
  window.open(`${API_BASE}/reports/export/csv?${params.toString()}`, '_blank');
};
export const exportReportJSON = (startDate, endDate, campaignId) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (campaignId) params.append('campaign_id', campaignId);
  window.open(`${API_BASE}/reports/export/json?${params.toString()}`, '_blank');
};

// Pacing
export const getPacingStatus = () => api.get('/pacing/status');
export const resetDailySpend = (campaignId) => api.post(`/campaigns/${campaignId}/reset-daily-spend`);
export const resetAllDailySpend = () => api.post('/pacing/reset-all');

// ML Prediction
export const getMLStats = (campaignId) => api.get(`/ml/stats/${campaignId}`);
export const trainMLModel = (campaignId) => api.post(`/ml/train/${campaignId}`);
export const predictBidPrice = (campaignId, features) => 
  api.post(`/ml/predict?campaign_id=${campaignId}`, features);

// SPO
export const analyzeSPO = (campaignId) => api.get(`/spo/analyze/${campaignId}`);

// Frequency Capping
export const getUserFrequency = (campaignId, userId) => 
  api.get(`/frequency/${campaignId}/${userId}`);
export const resetCampaignFrequency = (campaignId) => 
  api.delete(`/frequency/reset/${campaignId}`);

// Win/Billing Notifications (for testing)
export const sendWinNotification = (bidId, price) => 
  api.post(`/notify/win/${bidId}`, null, { params: { price } });

// Seed Data
export const seedData = () => api.post('/seed-data');

// Campaign Insights
export const getCampaignInsights = () => api.get('/insights/campaigns');
export const getSingleCampaignInsight = (campaignId) => api.get(`/insights/campaign/${campaignId}`);
export const applyRecommendation = (campaignId, action) => 
  api.post(`/insights/apply-recommendation/${campaignId}?action=${action}`);

// ML Models
export const getAllMLModels = () => api.get('/ml/models');
export const getMLModelDetails = (campaignId) => api.get(`/ml/model/${campaignId}/details`);

// Multi-Currency
export const getSupportedCurrencies = () => api.get('/currencies');
export const convertCurrency = (amount, fromCurrency, toCurrency) => 
  api.get('/currency/convert', { params: { amount, from_currency: fromCurrency, to_currency: toCurrency } });

export default api;

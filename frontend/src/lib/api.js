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

// Seed Data
export const seedData = () => api.post('/seed-data');

export default api;

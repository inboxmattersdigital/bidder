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
export const duplicateCampaign = (id) => api.post(`/campaigns/${id}/duplicate`);

// Bulk Campaign Operations
export const bulkActivateCampaigns = (ids) => api.post('/campaigns/bulk/activate', ids);
export const bulkPauseCampaigns = (ids) => api.post('/campaigns/bulk/pause', ids);
export const bulkDeleteCampaigns = (ids) => api.post('/campaigns/bulk/delete', ids);

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
export const getSSPEndpointURL = (id) => api.get(`/ssp-endpoints/${id}/endpoint-url`);
export const updateSSPStatus = (id, status) => 
  api.put(`/ssp-endpoints/${id}/status`, null, { params: { status } });

// Bid Logs
export const getBidLogs = (limit = 50, offset = 0) => 
  api.get('/bid-logs', { params: { limit, offset } });
export const getBidLog = (id) => api.get(`/bid-logs/${id}`);

// Migration Matrix
export const getMigrationMatrix = () => api.get('/migration-matrix');

// File Uploads
export const uploadImage = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const uploadVideo = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/upload/video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const uploadVideoChunk = (chunk, chunkIndex, totalChunks, uploadId, filename) => {
  const formData = new FormData();
  formData.append('chunk', chunk);
  return api.post('/upload/video/chunk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params: { chunk_index: chunkIndex, total_chunks: totalChunks, upload_id: uploadId, filename }
  });
};

// VAST Validation
export const validateVast = (vastUrl, vastXml) => 
  api.post('/vast/validate', null, { params: { vast_url: vastUrl, vast_xml: vastXml } });

export const previewVast = (vastUrl) => 
  api.get('/vast/preview', { params: { vast_url: vastUrl } });

// Reference Data
export const getReferenceData = () => api.get('/reference/all');

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

// Reference Data
export const getIABCategories = () => api.get('/reference/iab-categories');
export const getVideoPlacements = () => api.get('/reference/video-placements');
export const getVideoPlcmt = () => api.get('/reference/video-plcmt');
export const getVideoProtocols = () => api.get('/reference/video-protocols');
export const getVideoMimes = () => api.get('/reference/video-mimes');
export const getPodPositions = () => api.get('/reference/pod-positions');
export const getAdPlacements = () => api.get('/reference/ad-placements');
export const getDeviceTypes = () => api.get('/reference/device-types');
export const getConnectionTypes = () => api.get('/reference/connection-types');
export const getCarriersByCountry = (countryCode) => api.get(`/reference/carriers/${countryCode}`);
export const getAllCarriers = () => api.get('/reference/carriers');

// Campaign Comparison
export const compareCampaigns = (campaignIds) => api.post('/campaigns/compare', { campaign_ids: campaignIds });

// A/B Testing
export const getABTests = () => api.get('/ab-tests');
export const createABTest = (name, campaignIds, trafficSplit) => 
  api.post('/ab-tests', { 
    name,
    campaign_ids: campaignIds, 
    traffic_split: trafficSplit 
  });
export const getABTest = (testId) => api.get(`/ab-tests/${testId}`);
export const updateABTestStatus = (testId, status) => api.put(`/ab-tests/${testId}/status?status=${status}`);

// Fraud Detection
export const getFraudStats = () => api.get('/fraud/stats');
export const checkFraud = (requestData) => api.post('/fraud/check', requestData);
export const updateFraudPatterns = (patterns) => api.put('/fraud/patterns', patterns);

// Viewability
export const getViewabilityStats = () => api.get('/viewability/stats');
export const predictViewability = (requestData) => api.post('/viewability/predict', requestData);

// Audience Segments
export const getAudiences = () => api.get('/audiences');
export const createAudience = (name, description, rules) => 
  api.post(`/audiences?name=${encodeURIComponent(name)}&description=${encodeURIComponent(description || '')}`, rules);
export const getAudience = (audienceId) => api.get(`/audiences/${audienceId}`);
export const updateAudience = (audienceId, name, rules) => 
  api.put(`/audiences/${audienceId}`, null, { params: { name, rules: JSON.stringify(rules) }});
export const deleteAudience = (audienceId) => api.delete(`/audiences/${audienceId}`);

// Creative Validation
export const validateCreative = (creativeData) => api.post('/creatives/validate', creativeData);

// Real-time Bid Stream
export const getBidStream = (limit = 20) => api.get(`/bid-stream?limit=${limit}`);

// SSP Analytics
export const getSSPAnalyticsOverview = () => api.get('/ssp-analytics/overview');
export const getSSPAnalyticsDetails = (sspId) => api.get(`/ssp-analytics/${sspId}/details`);
export const regenerateEndpointToken = (endpointId) => api.post(`/ssp-endpoints/${endpointId}/regenerate-token`);

// Bid Optimization
export const getBidOptimizationStatus = () => api.get('/bid-optimization/status');
export const enableBidOptimization = (campaignId, targetWinRate = 30, autoAdjust = true) => 
  api.post(`/bid-optimization/${campaignId}/enable?target_win_rate=${targetWinRate}&auto_adjust=${autoAdjust}`);
export const disableBidOptimization = (campaignId) => api.post(`/bid-optimization/${campaignId}/disable`);
export const runBidOptimization = (campaignId) => api.post(`/bid-optimization/${campaignId}/run`);
export const getBidOptimizationHistory = (campaignId) => api.get(`/bid-optimization/${campaignId}/history`);

// Cross-Campaign Attribution
export const trackAttributionEvent = (userId, campaignId, eventType, eventValue = 0) => 
  api.post(`/attribution/track?user_id=${userId}&campaign_id=${campaignId}&event_type=${eventType}&event_value=${eventValue}`);
export const getUserJourney = (userId) => api.get(`/attribution/user/${userId}`);
export const getAttributionAnalysis = (model = 'last_touch') => api.get(`/attribution/analysis?model=${model}`);

// File Uploads (delete)
export const deleteUploadedFile = (filename) => api.delete(`/uploads/${filename}`);

// Media Planner
export const getMediaPlanForecast = (data) => api.post('/media-planner/forecast', data);
export const getIndustryBenchmarks = () => api.get('/media-planner/benchmarks');
export const getPerformanceProjections = (budget, durationDays, creativeType, goal) => 
  api.post(`/media-planner/projections?budget=${budget}&duration_days=${durationDays}&creative_type=${creativeType}&goal=${goal}`);
export const recommendCampaignStrategy = (goal, budget, durationDays, creativeTypes) => 
  api.post('/media-planner/recommend-strategy', null, { 
    params: { goal, budget, duration_days: durationDays, creative_types: creativeTypes?.join(',') } 
  });

// Insertion Orders
export const getInsertionOrders = (campaignId) => 
  api.get('/insertion-orders', { params: campaignId ? { campaign_id: campaignId } : {} });
export const getInsertionOrder = (id) => api.get(`/insertion-orders/${id}`);
export const createInsertionOrder = (data) => api.post('/insertion-orders', data);
export const updateInsertionOrder = (id, data) => api.put(`/insertion-orders/${id}`, data);
export const deleteInsertionOrder = (id) => api.delete(`/insertion-orders/${id}`);

// Line Items
export const getLineItems = (ioId) => 
  api.get('/line-items', { params: ioId ? { io_id: ioId } : {} });
export const getLineItem = (id) => api.get(`/line-items/${id}`);
export const createLineItem = (data) => api.post('/line-items', data);
export const updateLineItem = (id, data) => api.put(`/line-items/${id}`, data);
export const deleteLineItem = (id) => api.delete(`/line-items/${id}`);
export const recommendLineItems = (goal, budget, audienceType) => 
  api.post('/line-items/recommend', null, { params: { goal, budget, audience_type: audienceType } });

// Fraud Analysis
export const analyzeFraud = (campaignId) => api.get(`/fraud/detection/${campaignId}`);

// Ad Performance Reports
export const generateAdPerformanceReport = (dimensions, metrics, startDate, endDate, numRows = 10000, useRealData = true, campaignId = null, creativeId = null) => 
  api.post('/reports/ad-performance', null, { 
    params: { 
      dimensions: dimensions.join(','), 
      metrics: metrics.join(','),
      start_date: startDate, 
      end_date: endDate,
      num_rows: numRows,
      use_real_data: useRealData,
      ...(campaignId && { campaign_id: campaignId }),
      ...(creativeId && { creative_id: creativeId })
    } 
  });

export const exportAdPerformanceCSV = (dimensions, metrics, startDate, endDate, numRows = 10000) => {
  const params = new URLSearchParams();
  params.append('dimensions', dimensions.join(','));
  params.append('metrics', metrics.join(','));
  params.append('start_date', startDate);
  params.append('end_date', endDate);
  params.append('num_rows', numRows.toString());
  
  window.open(`${API_BASE}/reports/ad-performance/export/csv?${params.toString()}`, '_blank');
};

export const exportAdPerformanceExcel = (dimensions, metrics, startDate, endDate, numRows = 10000) => {
  const params = new URLSearchParams();
  params.append('dimensions', dimensions.join(','));
  params.append('metrics', metrics.join(','));
  params.append('start_date', startDate);
  params.append('end_date', endDate);
  params.append('num_rows', numRows.toString());
  
  window.open(`${API_BASE}/reports/ad-performance/export/excel?${params.toString()}`, '_blank');
};

// Report Templates
export const getReportTemplates = () => api.get('/reports/templates');
export const getReportTemplate = (id) => api.get(`/reports/templates/${id}`);
export const saveReportTemplate = (name, description, dimensions, icon = "FileText") => 
  api.post('/reports/templates', null, { 
    params: { name, description, dimensions: dimensions.join(','), icon } 
  });
export const deleteReportTemplate = (id) => api.delete(`/reports/templates/${id}`);

export default api;

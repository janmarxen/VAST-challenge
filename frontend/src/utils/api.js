import axios from 'axios';

// Base API URL - uses proxy configured in package.json for development
// In production, this should point to the backend service
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Business API endpoints
export const fetchBusinessRevenue = (employerId, startDate, endDate) => {
  const params = new URLSearchParams();
  if (employerId) params.append('employer_id', employerId);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  
  return axios.get(`${API_BASE_URL}/business/revenue-timeseries?${params}`)
    .then(response => response.data);
};

export const fetchMarketShare = () => {
  return axios.get(`${API_BASE_URL}/business/market-share`)
    .then(response => response.data);
};

export const fetchPerformanceMetrics = () => {
  return axios.get(`${API_BASE_URL}/business/performance-metrics`)
    .then(response => response.data);
};

// Resident API endpoints
export const fetchWageVsCost = (education, householdSize) => {
  const params = new URLSearchParams();
  if (education) params.append('education', education);
  if (householdSize) params.append('household_size', householdSize);
  
  return axios.get(`${API_BASE_URL}/resident/wage-vs-cost?${params}`)
    .then(response => response.data);
};

export const fetchFinancialTrajectories = () => {
  return axios.get(`${API_BASE_URL}/resident/financial-trajectories`)
    .then(response => response.data);
};

export const fetchResidentClusters = () => {
  return axios.get(`${API_BASE_URL}/resident/clusters`)
    .then(response => response.data);
};

export const fetchParallelCoordinates = () => {
  return axios.get(`${API_BASE_URL}/resident/parallel-coordinates`)
    .then(response => response.data);
};

// Employer API endpoints
export const fetchTurnoverHeatmap = () => {
  return axios.get(`${API_BASE_URL}/employer/turnover-heatmap`)
    .then(response => response.data);
};

export const fetchJobFlow = (timePeriod) => {
  const params = timePeriod ? `?time_period=${timePeriod}` : '';
  return axios.get(`${API_BASE_URL}/employer/job-flow${params}`)
    .then(response => response.data);
};

export const fetchTransitionNetwork = () => {
  return axios.get(`${API_BASE_URL}/employer/transition-network`)
    .then(response => response.data);
};

export const fetchTurnoverDistribution = () => {
  return axios.get(`${API_BASE_URL}/employer/turnover-distribution`)
    .then(response => response.data);
};

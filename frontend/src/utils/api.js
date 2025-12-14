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

export const fetchVenueTimeseries = ({ venueId, venueType, participantId, startDate, endDate, resolution } = {}) => {
  const params = new URLSearchParams();
  if (venueId) params.append('venue_id', venueId);
  if (venueType) params.append('venue_type', venueType);
  if (participantId) params.append('participant_id', participantId);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (resolution) params.append('resolution', resolution);
  
  return axios.get(`${API_BASE_URL}/business/venue-timeseries?${params}`)
    .then(response => response.data);
};

export const fetchMarketShare = ({ venueType, venueId, participantId, startDate, endDate } = {}) => {
  const params = new URLSearchParams();
  if (venueType) params.append('venue_type', venueType);
  if (venueId) params.append('venue_id', venueId);
  if (participantId) params.append('participant_id', participantId);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  
  return axios.get(`${API_BASE_URL}/business/market-share?${params}`)
    .then(response => response.data);
};

export const fetchBusinessTrends = ({ venueType, venueId, participantId, startDate, endDate } = {}) => {
  const params = new URLSearchParams();
  if (venueType) params.append('venue_type', venueType);
  if (venueId) params.append('venue_id', venueId);
  if (participantId) params.append('participant_id', participantId);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  
  return axios.get(`${API_BASE_URL}/business/business-trends?${params}`)
    .then(response => response.data);
};

export const fetchVenues = () => {
  return axios.get(`${API_BASE_URL}/business/venues`)
    .then(response => response.data);
};

export const fetchParticipants = ({ venueType, venueId } = {}) => {
  const params = new URLSearchParams();
  if (venueType) params.append('venue_type', venueType);
  if (venueId) params.append('venue_id', venueId);
  
  const queryString = params.toString();
  return axios.get(`${API_BASE_URL}/business/participants${queryString ? '?' + queryString : ''}`)
    .then(response => response.data);
};

export const fetchUnifiedDataset = (limit = 100) => {
  return axios.get(`${API_BASE_URL}/business/unified-dataset?limit=${limit}`)
    .then(response => response.data);
};

export const fetchPerformanceMetrics = () => {
  return axios.get(`${API_BASE_URL}/business/performance-metrics`)
    .then(response => response.data);
};

// Resident API endpoints
export const fetchWageVsCost = (paramsObj = {}) => {
  const params = new URLSearchParams();
  // Support both old positional args (if someone uses them) and new object style
  // But for now, let's assume we migrate to object style or handle the specific case of "month passed as first arg"
  
  // If the first argument is a string that looks like a date (YYYY-MM), treat it as month
  // This is a temporary compatibility hack if we don't want to change all call sites immediately,
  // but we ARE changing call sites. So let's do it right.
  
  const { education, householdSize, haveKids, month } = paramsObj;

  if (education) params.append('education', education);
  if (householdSize) params.append('household_size', householdSize);
  if (haveKids !== undefined && haveKids !== null) params.append('haveKids', haveKids);
  if (month) params.append('month', month);
  
  return axios.get(`${API_BASE_URL}/resident/wage-vs-cost?${params}`)
    .then(response => response.data);
};

export const fetchFinancialTrajectories = (month) => {
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  return axios.get(`${API_BASE_URL}/resident/financial-trajectories?${params}`)
    .then(response => response.data);
};

export const fetchResidentClusters = () => {
  return axios.get(`${API_BASE_URL}/resident/clusters`)
    .then(response => response.data);
};

export const fetchParallelCoordinates = (paramsObj = {}) => {
  const params = new URLSearchParams();
  const { haveKids, month } = paramsObj;
  
  if (haveKids !== undefined && haveKids !== null) params.append('haveKids', haveKids);
  if (month) params.append('month', month);

  return axios.get(`${API_BASE_URL}/resident/parallel-coordinates?${params}`)
    .then(response => response.data);
};

// Employer API endpoints
export const fetchTurnoverHeatmap = () => {
  return axios.get(`${API_BASE_URL}/employers/turnover-heatmap`)
    .then(response => response.data);
};

export const fetchJobFlow = (timePeriod) => {
  const params = timePeriod ? `?time_period=${timePeriod}` : '';
  return axios.get(`${API_BASE_URL}/employers/job-flows${params}`)
    .then(response => response.data);
};

export const fetchTransitionNetwork = () => {
  return axios.get(`${API_BASE_URL}/employers/transition-network`)
    .then(response => response.data);
};

export const fetchTurnoverDistribution = () => {
  return axios.get(`${API_BASE_URL}/employers/turnover-distribution`)
    .then(response => response.data);
};

export const fetchEmployerMeta = () => {
  return axios.get(`${API_BASE_URL}/employers/meta`)
    .then(response => response.data);
};

export const fetchEmployeeCounts = () => {
  return axios.get(`${API_BASE_URL}/employers/employee-counts`)
    .then(response => response.data);
};

export const fetchTenure = () => {
  return axios.get(`${API_BASE_URL}/employers/tenure`)
    .then(response => response.data);
};

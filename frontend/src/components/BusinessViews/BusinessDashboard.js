import React, { useState, useEffect, useCallback, useMemo } from 'react';
import RevenueTimeSeries from './RevenueTimeSeries';
import MarketShareStream from './MarketShareStream';
import PerformanceScatter from './PerformanceScatter';
import BusinessTrends from './BusinessTrends';
import { fetchVenues, fetchParticipants, fetchMarketShare, fetchBusinessTrends } from '../../utils/api';

/**
 * Business Dashboard - Restaurant and Pub Analysis
 * Professional business analytics dashboard for venue performance
 */
function BusinessDashboard() {
  const [venues, setVenues] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [selectedVenueType, setSelectedVenueType] = useState('');
  const [startDate, setStartDate] = useState('2022-03-01');
  const [endDate, setEndDate] = useState('2022-05-31');
  const [resolution, setResolution] = useState('day');
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  
  // Shared data for KPIs - populated by child components via callbacks
  const [marketData, setMarketData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);

  // Load venues on mount
  useEffect(() => {
    fetchVenues()
      .then(data => {
        setVenues(data);
      })
      .catch(error => {
        console.error('Error fetching venues:', error);
      });
  }, []);

  // Load participants when venue type or venue changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingParticipants(true);
      fetchParticipants({
        venueType: selectedVenueType || undefined,
        venueId: selectedVenue || undefined
      })
        .then(data => {
          setParticipants(data);
          setLoadingParticipants(false);
        })
        .catch(error => {
          console.error('Error fetching participants:', error);
          setLoadingParticipants(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedVenueType, selectedVenue]);

  // Callbacks for child components to share their data
  const handleMarketDataLoaded = useCallback((data) => {
    setMarketData(data);
  }, []);

  const handleTrendsDataLoaded = useCallback((data) => {
    setTrendsData(data);
  }, []);

  // Calculate KPIs from shared data
  const kpiData = useMemo(() => {
    if (!marketData || !trendsData) {
      return null;
    }
    const totalVisits = marketData.venues?.reduce((sum, v) => sum + v.visit_count, 0) || 0;
    const prosperingCount = trendsData.venues?.filter(v => v.trend === 'prospering').length || 0;
    const strugglingCount = trendsData.venues?.filter(v => v.trend === 'struggling').length || 0;
    
    return {
      totalRevenue: marketData.total_spending || 0,
      totalVisits,
      avgSpendPerVisit: totalVisits > 0 ? marketData.total_spending / totalVisits : 0,
      activeVenues: marketData.venues?.length || 0,
      prosperingCount,
      strugglingCount
    };
  }, [marketData, trendsData]);

  const filteredVenues = selectedVenueType 
    ? venues.filter(v => v.venue_type === selectedVenueType)
    : venues;

  // Format currency
  const formatCurrency = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

  // Format number with commas
  const formatNumber = (value) => {
    return value.toLocaleString();
  };

  return (
    <div className="dashboard bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Venue Analytics Dashboard</h1>
              <p className="mt-1 text-blue-100">Restaurant & Pub Performance Intelligence</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-200">Analysis Period</div>
              <div className="text-lg font-semibold">
                {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">Total Revenue</div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-lg">$</span>
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {!kpiData ? <span className="animate-pulse bg-gray-200 rounded h-8 w-20 inline-block"></span> : formatCurrency(kpiData.totalRevenue)}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">Total Visits</div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-lg">👥</span>
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {!kpiData ? <span className="animate-pulse bg-gray-200 rounded h-8 w-20 inline-block"></span> : formatNumber(kpiData.totalVisits)}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">Avg. per Visit</div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-lg">📊</span>
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {!kpiData ? <span className="animate-pulse bg-gray-200 rounded h-8 w-20 inline-block"></span> : `$${kpiData.avgSpendPerVisit.toFixed(2)}`}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">Active Venues</div>
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <span className="text-indigo-600 text-lg">🏪</span>
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {!kpiData ? <span className="animate-pulse bg-gray-200 rounded h-8 w-12 inline-block"></span> : kpiData.activeVenues}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">Prospering</div>
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <span className="text-emerald-600 text-lg">▲</span>
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600">
              {!kpiData ? <span className="animate-pulse bg-gray-200 rounded h-8 w-12 inline-block"></span> : kpiData.prosperingCount}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">Struggling</div>
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 text-lg">▼</span>
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-red-600">
              {!kpiData ? <span className="animate-pulse bg-gray-200 rounded h-8 w-12 inline-block"></span> : kpiData.strugglingCount}
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm font-semibold text-gray-700">Filters</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Venue Type</label>
              <select 
                value={selectedVenueType}
                onChange={(e) => {
                  setSelectedVenueType(e.target.value);
                  setSelectedVenue(null);
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              >
                <option value="">All Types</option>
                <option value="Restaurant">🍽️ Restaurant</option>
                <option value="Pub">🍺 Pub</option>
              </select>
            </div>
            
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Venue</label>
              <select 
                value={selectedVenue || ''}
                onChange={(e) => {
                  setSelectedVenue(e.target.value ? parseInt(e.target.value) : null);
                  setSelectedParticipant(null);
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              >
                <option value="">All Venues</option>
                {filteredVenues.map(v => (
                  <option key={`${v.venue_type}-${v.venue_id}`} value={v.venue_id}>
                    {v.venue_type === 'Restaurant' ? '🍽️' : '🍺'} #{v.venue_id} (Cap: {v.max_occupancy})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Customer</label>
              <select 
                value={selectedParticipant || ''}
                onChange={(e) => setSelectedParticipant(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                disabled={loadingParticipants}
              >
                <option value="">All Customers</option>
                {participants.slice(0, 100).map(p => (
                  <option key={p.participant_id} value={p.participant_id}>
                    Customer #{p.participant_id} ({p.visit_count} visits)
                  </option>
                ))}
                {participants.length > 100 && (
                  <option disabled>...and {participants.length - 100} more</option>
                )}
              </select>
            </div>
            
            <div className="min-w-[130px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              />
            </div>
            
            <div className="min-w-[130px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              />
            </div>
            
            <div className="min-w-[120px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Resolution</label>
              <select 
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              >
                <option value="hour">Hourly</option>
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Visualization Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Revenue & Traffic Trends</h3>
                <p className="text-xs text-gray-500 mt-0.5">Check-ins and spending over time</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
            </div>
            <RevenueTimeSeries 
              venueId={selectedVenue}
              venueType={selectedVenueType}
              participantId={selectedParticipant}
              startDate={startDate}
              endDate={endDate}
              resolution={resolution}
            />
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Business Health Analysis</h3>
                <p className="text-xs text-gray-500 mt-0.5">Prospering vs struggling venues</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <BusinessTrends 
              venueType={selectedVenueType}
              startDate={startDate}
              endDate={endDate}
              onDataLoaded={handleTrendsDataLoaded}
            />
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Market Share Distribution</h3>
                <p className="text-xs text-gray-500 mt-0.5">Revenue breakdown by venue</p>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
            </div>
            <MarketShareStream 
              venueType={selectedVenueType}
              participantId={selectedParticipant}
              startDate={startDate}
              endDate={endDate}
              onDataLoaded={handleMarketDataLoaded}
            />
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Performance Matrix</h3>
                <p className="text-xs text-gray-500 mt-0.5">Venue comparison overview</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <PerformanceScatter 
              venueType={selectedVenueType}
              participantId={selectedParticipant}
              startDate={startDate}
              endDate={endDate}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>VAST Challenge 2022 — Venue Analytics Dashboard</p>
        </div>
      </div>
    </div>
  );
}

export default BusinessDashboard;

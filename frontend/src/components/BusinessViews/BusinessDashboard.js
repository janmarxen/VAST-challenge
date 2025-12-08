import React, { useState, useEffect } from 'react';
import RevenueTimeSeries from './RevenueTimeSeries';
import MarketShareStream from './MarketShareStream';
import PerformanceScatter from './PerformanceScatter';
import { fetchVenues, fetchParticipants } from '../../utils/api';

/**
 * Business Dashboard - Restaurant and Pub Analysis
 * Analyzes check-in activity, spending, and capacity for venues
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

  // Load participants when venue type or venue changes
  useEffect(() => {
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
  }, [selectedVenueType, selectedVenue]);

  const filteredVenues = selectedVenueType 
    ? venues.filter(v => v.venue_type === selectedVenueType)
    : venues;

  return (
    <div className="dashboard p-4">
      <h2 className="text-2xl font-bold mb-2">Restaurant & Pub Analysis</h2>
      <p className="text-gray-600 mb-4">Check-in activity, spending patterns, and capacity analysis</p>
      
      {/* Global Filters */}
      <div className="filters bg-gray-100 p-4 rounded mb-4 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Venue Type</label>
          <select 
            value={selectedVenueType}
            onChange={(e) => {
              setSelectedVenueType(e.target.value);
              setSelectedVenue(null);
            }}
            className="border rounded px-2 py-1"
          >
            <option value="">All Types</option>
            <option value="Restaurant">Restaurant</option>
            <option value="Pub">Pub</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Venue</label>
          <select 
            value={selectedVenue || ''}
            onChange={(e) => {
              setSelectedVenue(e.target.value ? parseInt(e.target.value) : null);
              setSelectedParticipant(null); // Reset participant when venue changes
            }}
            className="border rounded px-2 py-1"
          >
            <option value="">All Venues</option>
            {filteredVenues.map(v => (
              <option key={`${v.venue_type}-${v.venue_id}`} value={v.venue_id}>
                {v.venue_type} #{v.venue_id} (Cap: {v.max_occupancy})
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Participant</label>
          <select 
            value={selectedParticipant || ''}
            onChange={(e) => setSelectedParticipant(e.target.value ? parseInt(e.target.value) : null)}
            className="border rounded px-2 py-1"
            disabled={loadingParticipants}
          >
            <option value="">All Participants</option>
            {participants.slice(0, 100).map(p => (
              <option key={p.participant_id} value={p.participant_id}>
                #{p.participant_id} ({p.visit_count} visits, ${p.total_spending})
              </option>
            ))}
            {participants.length > 100 && (
              <option disabled>...and {participants.length - 100} more</option>
            )}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Resolution</label>
          <select 
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="hour">Hourly</option>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
      </div>
      
      <div className="visualization-grid grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="visualization-card bg-white shadow rounded p-4">
          <h3 className="text-lg font-semibold mb-2">Venue Time Series</h3>
          <RevenueTimeSeries 
            venueId={selectedVenue}
            venueType={selectedVenueType}
            participantId={selectedParticipant}
            startDate={startDate}
            endDate={endDate}
            resolution={resolution}
          />
        </div>
        
        <div className="visualization-card bg-white shadow rounded p-4">
          <h3 className="text-lg font-semibold mb-2">Market Share</h3>
          <MarketShareStream 
            venueType={selectedVenueType}
            participantId={selectedParticipant}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
        
        <div className="visualization-card bg-white shadow rounded p-4 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-2">Venue Performance Overview</h3>
          <PerformanceScatter 
            venueType={selectedVenueType}
            participantId={selectedParticipant}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>
    </div>
  );
}

export default BusinessDashboard;

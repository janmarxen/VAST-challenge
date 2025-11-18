import React from 'react';
import RevenueTimeSeries from './RevenueTimeSeries';
import MarketShareStream from './MarketShareStream';
import PerformanceScatter from './PerformanceScatter';

/**
 * Business Prosperity Dashboard (Question 1)
 * Handles visualizations for business performance analysis
 */
function BusinessDashboard() {
  return (
    <div className="dashboard">
      <h2>Question 1: Business Prosperity Analysis</h2>
      <p>Which businesses are thriving or struggling over time</p>
      
      <div className="visualization-grid">
        <div className="visualization-card">
          <h3>Revenue Time Series</h3>
          <RevenueTimeSeries />
        </div>
        
        <div className="visualization-card">
          <h3>Market Share Evolution</h3>
          <MarketShareStream />
        </div>
        
        <div className="visualization-card">
          <h3>Performance Metrics</h3>
          <PerformanceScatter />
        </div>
      </div>
    </div>
  );
}

export default BusinessDashboard;

import React from 'react';
import WageVsCostScatter from './WageVsCostScatter';
import FinancialTrajectories from './FinancialTrajectories';
import ResidentClusters from './ResidentClusters';

/**
 * Resident Financial Health Dashboard (Question 2)
 * Handles visualizations for wage vs cost of living analysis
 */
function ResidentDashboard() {
  return (
    <div className="dashboard">
      <h2>Question 2: Resident Financial Health</h2>
      <p>How wages compare to cost of living and identifying similar patterns</p>
      
      <div className="visualization-grid">
        <div className="visualization-card">
          <h3>Wage vs Cost of Living</h3>
          <WageVsCostScatter />
        </div>
        
        <div className="visualization-card">
          <h3>Financial Health Trajectories</h3>
          <FinancialTrajectories />
        </div>
        
        <div className="visualization-card">
          <h3>Resident Clustering</h3>
          <ResidentClusters />
        </div>
      </div>
    </div>
  );
}

export default ResidentDashboard;

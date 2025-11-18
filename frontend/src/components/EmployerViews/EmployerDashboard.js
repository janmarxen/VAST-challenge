import React from 'react';
import TurnoverHeatmap from './TurnoverHeatmap';
import JobFlowSankey from './JobFlowSankey';
import TransitionNetwork from './TransitionNetwork';

/**
 * Employer Health & Turnover Dashboard (Question 3)
 * Handles visualizations for employment patterns and turnover
 */
function EmployerDashboard() {
  return (
    <div className="dashboard">
      <h2>Question 3: Employer Health & Turnover</h2>
      <p>Employment patterns and turnover analysis</p>
      
      <div className="visualization-grid">
        <div className="visualization-card">
          <h3>Turnover Heatmap</h3>
          <TurnoverHeatmap />
        </div>
        
        <div className="visualization-card">
          <h3>Job Flow Sankey Diagram</h3>
          <JobFlowSankey />
        </div>
        
        <div className="visualization-card">
          <h3>Transition Network</h3>
          <TransitionNetwork />
        </div>
      </div>
    </div>
  );
}

export default EmployerDashboard;

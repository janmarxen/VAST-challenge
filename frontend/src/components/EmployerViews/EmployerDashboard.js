import React, { useState } from 'react';
import TurnoverRanking from './TurnoverRanking';
import JobFlowSankey from './JobFlowSankey';
import EmployerStabilityOverview from './EmployerStabilityOverview';
import TurnoverScatterplot from './TurnoverScatterplot';
import EmployeeCountsTimeSeries from './EmployeeCountsTimeSeries';

/**
 * Employer Health & Turnover Dashboard (Question 3)
 * Comprehensive analysis of employment patterns, turnover, and workforce stability
 */
function EmployerDashboard() {
  const [selectedEmployer, setSelectedEmployer] = useState(null);
  const [brushedEmployers, setBrushedEmployers] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('2022-03');
  const [minFlowThreshold, setMinFlowThreshold] = useState(7);

  console.log('[EmployerDashboard] RENDER with selectedEmployer:', selectedEmployer);

  const handleEmployerSelect = (employerId) => {
    console.log('[EmployerDashboard] Selecting employer:', employerId);
    setSelectedEmployer(prevEmployer => {
      const newValue = prevEmployer === employerId ? null : employerId;
      console.log('[EmployerDashboard] State update: ', prevEmployer, ' -> ', newValue);
      return newValue;
    });
    setBrushedEmployers([]);
  };

  const handleBrush = (employerIds) => {
    setBrushedEmployers(employerIds);
    setSelectedEmployer(null);
  };

  const handleMonthChange = (month) => {
    setSelectedMonth(month);
  };

  return (
    <div className="w-full bg-gradient-to-b from-slate-50 to-white">
      {/* Header Section */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-900">Employer Health & Turnover</h2>
          <p className="text-sm text-gray-600 mt-1">
            Analyze workforce dynamics, turnover patterns, and employment stability across employers
          </p>
        </div>
      </div>

      <div className="max-w-full mx-auto px-6 py-8 space-y-8">
        
        {/* Row 1: Turnover Ranking (Full Width) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Employer Turnover Ranking</h3>
          <div className="flex-1 min-h-[500px]">
            <TurnoverRanking 
              selectedEmployer={selectedEmployer}
              onEmployerSelect={handleEmployerSelect}
              selectedMonth={selectedMonth}
              onMonthChange={handleMonthChange}
              highlightedEmployers={brushedEmployers}
            />
          </div>
        </div>

        {/* Row 2: Job Flow Sankey (Full Width) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Job Flow Between Employers</h3>
          <div className="mb-3 flex items-center gap-2">
            <label className="text-xs font-medium text-gray-700">Min flow count:</label>
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={minFlowThreshold}
              onChange={(e) => setMinFlowThreshold(parseInt(e.target.value))}
              className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-xs font-semibold text-gray-700">{minFlowThreshold}</span>
          </div>
          <div className="flex-1 min-h-[400px]">
            <JobFlowSankey 
              selectedEmployer={selectedEmployer}
              minFlowThreshold={minFlowThreshold}
            />
          </div>
        </div>

        {/* Row 3: Employer Stability Overview + Turnover vs Tenure Scatterplot */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Employer Stability Overview */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Employer Stability Overview</h3>
            <div style={{ height: '550px' }} className="overflow-hidden">
              <EmployerStabilityOverview 
                selectedEmployer={selectedEmployer}
                onEmployerSelect={handleEmployerSelect}
                highlightedEmployers={brushedEmployers}
                onBrushSelection={handleBrush}
              />
            </div>
          </div>

          {/* Turnover vs Tenure Scatterplot */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Turnover Rate vs Tenure Scatterplot</h3>
            <div style={{ height: '550px' }} className="overflow-hidden">
              <TurnoverScatterplot 
                selectedEmployer={selectedEmployer}
                onEmployerSelect={handleEmployerSelect}
                onBrush={handleBrush}
                onBrushSelection={handleBrush}
                highlightedEmployers={brushedEmployers}
                onMonthChange={handleMonthChange}
                month={selectedMonth}
              />
            </div>
          </div>
        </div>

        {/* Row 4: Employee Counts Time Series (Full Width) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Employee Count Trends (March - April 2022)</h3>
          <div className="min-h-[400px]">
            <EmployeeCountsTimeSeries 
              selectedEmployer={selectedEmployer}
              brushedEmployers={brushedEmployers}
              highlightedEmployers={brushedEmployers}
            />
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-gray-600 font-semibold">Key Insight</p>
            <p className="text-sm text-gray-700 mt-2">
              Employers with high turnover and low tenure face workforce instability. Target them for intervention.
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-gray-600 font-semibold">Cross-Chart Interaction</p>
            <p className="text-sm text-gray-700 mt-2">
              Click an employer to highlight it across all charts. Use brushing on scatterplot to highlight multiple employers.
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-gray-600 font-semibold">Data Period</p>
            <p className="text-sm text-gray-700 mt-2">
              Analysis focused on March-April 2022. Use month toggle in Turnover Ranking to switch between months.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployerDashboard;

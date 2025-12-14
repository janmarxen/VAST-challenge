import React, { useState } from 'react';
import TurnoverRanking from './TurnoverRanking';
import JobFlowSankey from './JobFlowSankey';
import EmployerStabilityOverview from './EmployerStabilityOverview';
import EmployeeCountsTimeSeries from './EmployeeCountsTimeSeries';
import CityWideMetrics from './CityWideMetrics';
import EmployerMarketShare from './EmployerMarketShare';
import EmployerGeographicMap from './EmployerGeographicMap';
import EmployerPayrollEstimates from './EmployerPayrollEstimates';

/**
 * Employer Health & Turnover Dashboard (Question 3)
 * Comprehensive analysis of employment patterns, turnover, and workforce stability
 */
function EmployerDashboard() {
  const [selectedEmployer, setSelectedEmployer] = useState(null);
  const [brushedEmployers, setBrushedEmployers] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('2022-03');
  const [minFlowThreshold, setMinFlowThreshold] = useState(7);
  const [activeTab, setActiveTab] = useState('turnover'); // 'turnover' | 'economics'

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

  const months = [
    '2022-03', '2022-04', '2022-05', '2022-06', '2022-07', '2022-08',
    '2022-09', '2022-10', '2022-11', '2022-12', '2023-01', '2023-02',
    '2023-03', '2023-04', '2023-05'
  ];

  const renderTimeSlider = (isCompact = false) => (
    <div className="w-full max-w-md">
      <div className={`flex ${isCompact ? 'flex-col gap-2' : 'justify-between items-center mb-2'}`}>
        <label className={`font-bold text-gray-700 flex items-center gap-2 ${isCompact ? 'text-sm' : ''}`}>
          <span>📅 Analysis Period:</span>
          <span className={`${isCompact ? 'text-base' : 'text-blue-600 text-lg'}`}>{selectedMonth}</span>
        </label>
      </div>
      <input
        type="range"
        min="0"
        max={months.length - 1}
        value={months.indexOf(selectedMonth)}
        onChange={(e) => handleMonthChange(months[e.target.value])}
        className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500 transition-all"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-2 px-1 font-medium">
        <span>{months[0]}</span>
        <span>{months[Math.floor(months.length / 2)]}</span>
        <span>{months[months.length - 1]}</span>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-gradient-to-b from-slate-50 to-white">
      {/* Header Section */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Employer Health & Turnover</h2>
              <p className="text-sm text-gray-600 mt-1">
                Analyze workforce dynamics, turnover patterns, and employment stability across employers.
                <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-mono">
                  Turnover Rate = (Hires + Quits) / 2 / Headcount
                </span>
              </p>
            </div>
            {/* Global Month Slider */}
            {renderTimeSlider(true)}
          </div>

          {/* Tabs */}
          <div className="flex gap-6 mt-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('turnover')}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === 'turnover' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Turnover & Stability
            </button>
            <button
              onClick={() => setActiveTab('economics')}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === 'economics' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Workforce & Economics
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-6 py-8 space-y-8">
        
        {/* Tab Content: Turnover & Stability */}
        {activeTab === 'turnover' && (
          <>
            {/* Row 1: Ranking & Stability (Side-by-Side) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Left: Turnover Ranking */}
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

              {/* Right: Stability Overview */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Employer Stability Overview</h3>
                <div className="h-auto min-h-[550px]">
                  <EmployerStabilityOverview 
                    selectedEmployer={selectedEmployer}
                    onEmployerSelect={handleEmployerSelect}
                    highlightedEmployers={brushedEmployers}
                    onBrushSelection={handleBrush}
                    selectedMonth={selectedMonth}
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Job Flow Sankey */}
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

            {/* Row 3: Geographic Turnover */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Geographic Turnover Heatmap</h3>
              <div className="flex justify-center">
                <EmployerGeographicMap selectedMonth={selectedMonth} />
              </div>
            </div>
          </>
        )}

        {/* Tab Content: Workforce & Economics */}
        {activeTab === 'economics' && (
          <>
            {/* Row 1: City-Wide Metrics */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">City-Wide Employment Trends</h3>
              <CityWideMetrics />
            </div>

            {/* Row 2: Market Share (Full Width) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Market Share (Workforce Size)</h3>
              <EmployerMarketShare />
            </div>

            {/* Row 3: Payroll & Employee Counts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Estimated Monthly Payroll</h3>
                <EmployerPayrollEstimates selectedMonth={selectedMonth} />
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Employee Count Trends</h3>
                <div className="min-h-[400px]">
                  <EmployeeCountsTimeSeries 
                    selectedEmployer={selectedEmployer}
                    brushedEmployers={brushedEmployers}
                    highlightedEmployers={brushedEmployers}
                  />
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default EmployerDashboard;

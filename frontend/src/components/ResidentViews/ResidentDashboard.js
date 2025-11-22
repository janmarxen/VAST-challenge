import React, { useState } from 'react';
import WageVsCostScatter from './TabLivingGap/WageVsCostScatter';
import FinancialTrajectories from './TabFinancialFlow/FinancialTrajectories';
import ParallelCoordinates from './TabLivingGap/ParallelCoordinates';
import GeographicFinancialHeatmap from './TabGeographic/GeographicFinancialHeatmap';
import CityWideExpenses from './TabFinancialFlow/CityWideExpenses';
import SavingsRateByEducation from './TabLivingGap/SavingsRateByEducation';
import HouseholdSizeStats from './TabLivingGap/HouseholdSizeStats';
import FoodHungerScatter from './TabFinancialFlow/FoodHungerScatter';

/**
 * Resident Financial Health Dashboard (Question 2)
 * Handles visualizations for wage vs cost of living analysis with tabbed interface
 */
function ResidentDashboard() {
  const [selectedIds, setSelectedIds] = useState(null);
  const [activeTab, setActiveTab] = useState(1);
  const [filterHaveKids, setFilterHaveKids] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('2022-03');

  const months = [
    '2022-03', '2022-04', '2022-05', '2022-06', '2022-07', '2022-08',
    '2022-09', '2022-10', '2022-11', '2022-12', '2023-01', '2023-02',
    '2023-03', '2023-04', '2023-05'
  ];

  // --- Enhanced button style presets ---
  const baseChip = `
    group relative flex min-w-[170px] items-center gap-3 rounded-2xl
    px-4 py-3 text-left shadow-md hover:shadow-xl
    transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0
  `;

  const chipActive = `
    bg-white text-blue-700 ring-2 ring-indigo-300 shadow-xl
  `;

  const chipInactive = `
    bg-white/20 backdrop-blur-sm border border-white/40
    text-blue-900/80 hover:bg-white/40 hover:text-blue-900
  `;

  const baseTab = `
    group flex-1 min-w-[260px] rounded-2xl border px-6 py-5 text-left
    transition-all duration-300 font-medium shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0
  `;

  const tabActive = `
    bg-gradient-to-r from-indigo-600 to-purple-600 text-white
    border-transparent ring-2 ring-indigo-300 shadow-2xl scale-[1.02]
  `;

  const tabInactive = `
    bg-white/70 backdrop-blur border-gray-200 text-gray-600
    hover:border-indigo-200 hover:bg-white
  `;

  const householdOptions = [
    { label: 'All Residents', value: null, description: 'Full cohort baseline', icon: '🌐' },
    { label: 'With Children', value: true, description: 'Families balancing essentials', icon: '👨‍👩‍👧' },
    { label: 'Without Children', value: false, description: 'Singles & couples', icon: '🏙️' }
  ];

  const handleHouseholdFocus = (value) => {
    setFilterHaveKids(prev => (prev === value ? null : value));
  };

  const renderTab1 = () => (
    <div className="space-y-8">
      {/* Text Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-3">Geographic Financial Health</h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          Start your analysis by exploring the <strong>spatial distribution</strong> of financial health across Engagement, OH. 
          This view combines a building-level heatmap with city-wide economic indicators.
        </p>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-900">
            <strong>🗺️ Analysis Strategy:</strong> Identify "Red Zones" (high debt) on the map. 
            Are they clustered in specific neighborhoods? Use the slider to see if these clusters expand over time.
            Then, check the <strong>Demographic Disparities</strong> tab to see who lives there.
          </p>
        </div>
      </div>

      {/* Visualization */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col" style={{ minHeight: '700px' }}>
        <GeographicFinancialHeatmap selectedMonth={selectedMonth} />
      </div>
    </div>
  );

  const renderTab2 = () => (
    <div className="space-y-8">
      {/* Text Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-3">Demographic Disparities & The Living Gap</h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          Now that you've seen <em>where</em> the issues are, let's look at <em>who</em> is affected.
          This section analyzes the <strong>Living Gap</strong>—the difference between wages and the cost of living—across different population segments.
        </p>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>👥 Analysis Strategy:</strong> Use the scatter plot to select residents below the diagonal line (those in debt).
            Look at the Parallel Coordinates below to see their common traits: Are they mostly low-education? Large families?
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600/10 via-indigo-500/5 to-purple-500/10 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-blue-900/60 uppercase">Smart highlight</p>
            <h4 className="text-lg font-semibold text-gray-900">Household spotlight</h4>
            <p className="text-sm text-blue-900/80 max-w-md">
              Tap a chip to auto-brush the scatter plot and carry the selection through the entire dashboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {householdOptions.map(option => {
              const isActive = filterHaveKids === option.value;
              return (
                <button
                  key={option.label}
                  onClick={() => handleHouseholdFocus(option.value)}
                  className={`${baseChip} ${isActive ? chipActive : chipInactive}`}
                >
                  <span className={`text-xl ${isActive ? 'opacity-100' : 'opacity-70'}`}>{option.icon}</span>
                  <div>
                    <div className="text-sm font-semibold">{option.label}</div>
                    <p className="text-xs text-blue-900/70">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Visualizations */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col" style={{ height: '600px' }}>
        <WageVsCostScatter onFilter={setSelectedIds} filterHaveKids={filterHaveKids} selectedMonth={selectedMonth} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col" style={{ height: '700px' }}>
          <ParallelCoordinates selectedIds={selectedIds} selectedMonth={selectedMonth} />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
            <SavingsRateByEducation selectedMonth={selectedMonth} />
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
            <HouseholdSizeStats selectedMonth={selectedMonth} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderTab3 = () => (
    <div className="space-y-8">
      {/* Text Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-3">Expense Analysis & Health Impacts</h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          Examine how financial decisions impact daily life. 
          This section analyzes spending patterns over time and correlates them with physical well-being indicators like hunger.
        </p>
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <p className="text-sm text-amber-900">
            <strong>📉 Analysis Strategy:</strong> Look for widening gaps between the Income line and the Expense stack.
            Check if low food spending correlates with higher hunger rates in the scatter plot below.
          </p>
        </div>
      </div>

      {/* Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col" style={{ height: '800px' }}>
          <FinancialTrajectories selectedMonth={selectedMonth} />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
           <CityWideExpenses selectedMonth={selectedMonth} />
            <FoodHungerScatter selectedMonth={selectedMonth} />
        </div>
      </div>
      
      {/* Additional insights */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">Interpretation Guide</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <h5 className="font-semibold text-gray-800 mb-2">Reading the Chart</h5>
            <ul className="space-y-1 list-disc ml-4">
              <li><strong>Stacked areas</strong> represent cumulative expenses by category</li>
              <li><strong>Dashed line</strong> shows average wage income</li>
              <li>When the line is <strong>above</strong> the stack, residents are saving</li>
              <li>When the line is <strong>below</strong>, they're going into debt</li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-gray-800 mb-2">🔍 What to Look For</h5>
            <ul className="space-y-1 list-disc ml-4">
              <li>Seasonal patterns in specific expense categories</li>
              <li>Periods of growing wage-expense gap</li>
              <li>Which expense categories dominate</li>
              <li>Stability vs. volatility in income streams</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="w-full max-w-[95%] mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Resident Financial Health Analysis</h2>
          <p className="text-gray-600 max-w-3xl">
            A comprehensive view of financial stability in Engagement, OH. 
            Start with the <strong>Geographic Overview</strong> to find hotspots, analyze <strong>Demographics</strong> to understand who is affected, and check <strong>Trends</strong> to see the evolution over time.
          </p>
        </header>

        {/* Global Time Control */}
        <div className="mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold text-gray-700 flex items-center gap-2">
              <span>📅 Global Time Period:</span>
              <span className="text-blue-600 text-lg">{selectedMonth}</span>
            </label>
            <div className="text-xs text-gray-500">
              Updates all visualizations below
            </div>
          </div>
          <input
            type="range"
            min="0"
            max={months.length - 1}
            value={months.indexOf(selectedMonth)}
            onChange={(e) => setSelectedMonth(months[e.target.value])}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1 font-mono">
            <span>{months[0]}</span>
            <span>{months[months.length - 1]}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex flex-col gap-3 md:flex-row">
            <button onClick={() => setActiveTab(1)} className={`${baseTab} ${activeTab === 1 ? tabActive : tabInactive}`}>
              <div className="flex items-start gap-4">
                <span className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-bold ${activeTab === 1 ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>1</span>
                <div>
                  <div className="text-base font-semibold">Geographic Overview</div>
                  <p className={`text-sm mt-1 ${activeTab === 1 ? 'text-white/80' : 'text-gray-500'}`}>Map & City-wide Stats</p>
                </div>
              </div>
            </button>

            <button onClick={() => setActiveTab(2)} className={`${baseTab} ${activeTab === 2 ? tabActive : tabInactive}`}>
              <div className="flex items-start gap-4">
                <span className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-bold ${activeTab === 2 ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>2</span>
                <div>
                  <div className="text-base font-semibold">Demographic Disparities</div>
                  <p className={`text-sm mt-1 ${activeTab === 2 ? 'text-white/80' : 'text-gray-500'}`}>Wage vs. Cost & Profiling</p>
                </div>
              </div>
            </button>

            <button onClick={() => setActiveTab(3)} className={`${baseTab} ${activeTab === 3 ? tabActive : tabInactive}`}>
              <div className="flex items-start gap-4">
                <span className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-bold ${activeTab === 3 ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>3</span>
                <div>
                  <div className="text-base font-semibold">Expense Analysis</div>
                  <p className={`text-sm mt-1 ${activeTab === 3 ? 'text-white/80' : 'text-gray-500'}`}>Spending & Health Impacts</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 1 && renderTab1()}
        {activeTab === 2 && renderTab2()}
        {activeTab === 3 && renderTab3()}
      </div>
    </div>
  );
}

export default ResidentDashboard;

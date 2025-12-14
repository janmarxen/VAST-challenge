import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import WageVsCostScatter from './TabLivingGap/WageVsCostScatter';
import FinancialTrajectories from './TabFinancialFlow/FinancialTrajectories';
import ParallelCoordinates from './TabLivingGap/ParallelCoordinates';
import GeographicFinancialHeatmap from './TabGeographic/GeographicFinancialHeatmap';
import CityWideExpenses from './TabFinancialFlow/CityWideExpenses';
import SavingsRateByEducation from './TabLivingGap/SavingsRateByEducation';
import HouseholdSizeStats from './TabLivingGap/HouseholdSizeStats';
import InequalityTimeline from './TabFinancialFlow/InequalityTimeline';
import { CLUSTER_OPTIONS, normalizeClusterValue } from './clusterHelpers';

export function shouldShowFloatingDemographicControls(entry) {
  if (!entry) return false;
  // Only float once the controls have scrolled *above* the viewport.
  // If the user is above the controls (controls are below), do not show the floating bar.
  const top = entry.boundingClientRect?.top;
  const isAboveViewport = typeof top === 'number' ? top < 0 : false;
  return !entry.isIntersecting && isAboveViewport;
}

/**
 * Resident Financial Health Dashboard (Question 2)
 * Handles visualizations for wage vs cost of living analysis with tabbed interface
 */
function ResidentDashboard() {
  const [selectedIds, setSelectedIds] = useState(null);
  const [activeTab, setActiveTab] = useState(1);
  const [filterHaveKids, setFilterHaveKids] = useState(null);
  const [filterCluster, setFilterCluster] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('2022-04');
  const [brushedTimeRange, setBrushedTimeRange] = useState(null);
  const [showFloatingTimeControl, setShowFloatingTimeControl] = useState(false);
  const timeControlRef = useRef(null);
  const demographicControlsRef = useRef(null);
  const [showFloatingDemographicControls, setShowFloatingDemographicControls] = useState(false);
  const [driverStats, setDriverStats] = useState(null);
  const [driverStatsError, setDriverStatsError] = useState(null);

  const formatDriverFeatureLabel = (feature) => {
    if (!feature) return '';
    if (feature === 'haveKids') return 'Has kids';
    if (feature === 'householdSize') return 'Household size';
    if (feature === 'age') return 'Age';
    if (feature === 'Income') return 'Income';
    if (feature === 'CostOfLiving') return 'Cost of living';
    if (feature === 'Education') return 'Education spending';
    if (feature === 'Food') return 'Food spending';
    if (feature === 'SavingsRate') return 'Savings rate';
    if (feature === 'educationLevel') return 'Education level';

    if (feature.startsWith('educationLevel_')) {
      const level = feature.replace('educationLevel_', '');
      const pretty = {
        Low: 'Low',
        HighSchoolOrCollege: 'High school / college',
        Bachelors: "Bachelor's",
        Graduate: 'Graduate',
        Unknown: 'Unknown',
      };
      return `Education: ${pretty[level] || level}`;
    }

    const prettyFallback = String(feature)
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();

    if (!prettyFallback) return String(feature);
    return prettyFallback.charAt(0).toUpperCase() + prettyFallback.slice(1);
  };

  // Exclude the first month (2022-03) from the analysis per backend filtering
  const months = [
    '2022-04', '2022-05', '2022-06', '2022-07', '2022-08',
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

  useEffect(() => {
    const target = timeControlRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setShowFloatingTimeControl(!entry.isIntersecting);
      },
      { threshold: 0.2 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (activeTab !== 2) {
      setShowFloatingDemographicControls(false);
      return;
    }

    const target = demographicControlsRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setShowFloatingDemographicControls(shouldShowFloatingDemographicControls(entry));
      },
      { threshold: 0.2 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;
    setDriverStatsError(null);
    axios
      .get('/api/resident/driver-stats?top_n=4')
      .then((resp) => {
        if (!isMounted) return;
        setDriverStats(resp.data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setDriverStatsError(err?.message || 'Failed to load driver stats');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const renderTimeSlider = (isCompact = false) => (
    <>
      <div className={`flex ${isCompact ? 'flex-col gap-2' : 'justify-between items-center mb-2'}`}>
        <label className={`font-bold text-gray-700 flex items-center gap-2 ${isCompact ? 'text-sm' : ''}`}>
          <span>📅 Global Time Period:</span>
          <span className={`${isCompact ? 'text-base' : 'text-blue-600 text-lg'}`}>{selectedMonth}</span>
        </label>
        {!isCompact && (
          <div className="text-xs text-gray-500">
            Updates all visualizations below
          </div>
        )}
      </div>
      <input
        type="range"
        min="0"
        max={months.length - 1}
        value={months.indexOf(selectedMonth)}
        onChange={(e) => setSelectedMonth(months[e.target.value])}
        className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 ${isCompact ? 'mt-0' : ''}`}
      />
      <div className={`flex justify-between text-xs text-gray-400 mt-1 font-mono ${isCompact ? 'text-[0.65rem]' : ''}`}>
        <span>{months[0]}</span>
        <span>{months[months.length - 1]}</span>
      </div>
    </>
  );

  const handleHouseholdFocus = (value) => {
    setFilterHaveKids(prev => (prev === value ? null : value));
  };

  const renderDemographicControls = (isFloating = false) => (
    <div
      ref={!isFloating ? demographicControlsRef : null}
      className={`${isFloating ? 'bg-white/95 backdrop-blur' : ''} rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600/10 via-indigo-500/5 to-purple-500/10 ${isFloating ? 'p-4 shadow-2xl' : 'p-5 shadow-sm'}`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-blue-900/60 uppercase">Smart highlight</p>
            <h4 className={`font-semibold text-gray-900 ${isFloating ? 'text-base' : 'text-lg'}`}>Household spotlight</h4>
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

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pt-4 border-t border-white/40">
          <div>
            <p className="text-xs font-semibold tracking-widest text-blue-900/60 uppercase">Filter</p>
            <h4 className={`font-semibold text-gray-900 ${isFloating ? 'text-sm' : 'text-base'}`}>Cluster</h4>
            <p className="text-sm text-blue-900/80 max-w-md">Limits both the scatter plot and the PCP.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CLUSTER_OPTIONS.map((opt) => {
              const normalized = normalizeClusterValue(filterCluster);
              const isActive = normalizeClusterValue(opt.value) === normalized;
              return (
                <button
                  key={String(opt.value)}
                  onClick={() => setFilterCluster(opt.value)}
                  className={`rounded-full px-3 py-2 text-sm border transition ${isActive ? 'bg-white text-blue-700 border-indigo-200 shadow-sm' : 'bg-white/40 text-blue-900/80 border-white/40 hover:bg-white/60'}`}
                >
                  <span className="inline-flex items-center gap-2">
                    {opt.color ? (
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: opt.color }} />
                    ) : (
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300" />
                    )}
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    // Keep dashboard interactions predictable when cohort changes.
    setSelectedIds(null);
  }, [filterCluster]);

  useEffect(() => {
    // Cohort filter: don't convert this into a massive selection.
    setSelectedIds(null);
  }, [filterHaveKids]);

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
            <strong>🗺️ Analysis Strategy:</strong> Identify "Red Zones" (low savings) on the map. 
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
      {/* Story intro */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-3">Demographic Disparities & The Living Gap</h3>
        <p className="text-gray-700 leading-relaxed mb-3">
          After locating <em>where</em> low savings or inequality appears, this tab explains <em>who</em> is affected.
          Clusters highlight a few recurring household "lifestyles" and how each group balances income, costs and savings.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-1">How to read this tab</h4>
            <p>
              Start with the <strong>Living Gap</strong> scatter: residents below the red line spend more than they earn.
              Then use the <strong>Demographic Pattern Finder</strong> to see how household size, costs and savings differ across clusters.
            </p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
            <h4 className="font-semibold text-emerald-900 mb-1">Key discriminator: household structure</h4>
            <p>
              The strongest split is <strong>with vs. without children</strong> (η² 83.1%). This aligns with <strong>household size</strong> (61.9%) and a strong separation by <strong>education</strong> (72.0%), producing distinct “lifestyle” groups with very different savings capacity.
            </p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="font-semibold text-slate-900 mb-1">What age tells us</h4>
            <p>
              Age is not a dominant factor here. Cluster separation is driven primarily by <strong>having kids</strong>, <strong>education</strong>, <strong>household size</strong>, and <strong>income</strong> (38.0%). For month-to-month financial resilience, the strongest predictor of savings rate is <strong>cost of living</strong> (ΔR² 0.828), followed by <strong>income</strong> (0.408), <strong>household size</strong> (0.376), and <strong>having kids</strong> (0.127).
            </p>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      {renderDemographicControls(false)}

      {/* Visualizations */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col" style={{ height: '600px' }}>
        <WageVsCostScatter 
          onFilter={setSelectedIds} 
          selectedIds={selectedIds}
          filterHaveKids={filterHaveKids} 
          filterCluster={filterCluster}
          selectedMonth={selectedMonth}
          brushedTimeRange={brushedTimeRange}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-[780px]">
          <div className="mb-3 text-sm text-gray-700">
            <p className="mb-1"><strong>Cluster personas:</strong></p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong className="text-red-600">Affluent Achievers (red)</strong>: couples and families with very high incomes who keep costs in check, appearing as high-income, high-savings outliers.</li>
              <li><strong className="text-sky-700">Stretched Households (blue)</strong>: lower-income residents with average living costs, leaving little room to save and clustering near the low-savings region.</li>
              <li><strong className="text-orange-600">Lean Savers (orange)</strong>: mostly households without children, with low to average incomes but very low costs, achieving medium to high savings rates.</li>
            </ul>

            <div className="mt-3 text-xs text-gray-600">
              <p className="mb-1"><strong>Top drivers (data-backed):</strong></p>
              {driverStatsError ? (
                <p className="text-xs text-amber-800">{driverStatsError}</p>
              ) : !driverStats ? (
                <p className="text-xs text-gray-500">Loading…</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="mb-1 font-semibold text-gray-700">Cluster separation (η²)</p>
                      <ol className="list-decimal ml-5 space-y-0.5">
                        {(driverStats.cluster_separation?.numeric_eta2 || []).map((d) => (
                          <li key={d.feature}>
                            <span className="font-medium">{formatDriverFeatureLabel(d.feature)}</span>{' '}
                            <span className="text-gray-500">({(Number(d.eta2) * 100).toFixed(1)}%)</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div>
                      <p className="mb-1 font-semibold text-gray-700">SavingsRate predictors (perm. importance)</p>
                      <ol className="list-decimal ml-5 space-y-0.5">
                        {(driverStats.savings_predictors?.permutation_importance || []).map((d) => (
                          <li key={d.feature}>
                            <span className="font-medium">{formatDriverFeatureLabel(d.feature)}</span>{' '}
                            <span className="text-gray-500">(ΔR² {Number(d.importance_mean).toFixed(3)})</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex-1 min-h-[620px]">
            <ParallelCoordinates
              selectedIds={selectedIds}
              onFilter={setSelectedIds}
              selectedMonth={selectedMonth}
              filterHaveKids={filterHaveKids}
              filterCluster={filterCluster}
              onTimeBrush={setBrushedTimeRange}
            />
          </div>
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6 lg:h-[760px]">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden">
            <div className="flex-1">
              <SavingsRateByEducation selectedMonth={selectedMonth} />
            </div>
            <p className="mt-3 text-xs text-gray-600">
              Education nudges savings but does not fully explain the clusters: each education band still contains both savers and stretched households.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden">
            <div className="flex-1">
              <HouseholdSizeStats selectedMonth={selectedMonth} />
            </div>
            <p className="mt-3 text-xs text-gray-600">
              Notice how <strong>1-person households</strong> dominate the higher savings bars, while larger households with children push toward lower savings despite similar or higher incomes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTab3 = () => (
    <div className="space-y-8">
      {/* Text Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-3">Expense Analysis & Inequality Trends</h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          Follow how money flows through residents' budgets and track <strong>economic inequality</strong> over time. 
          The Gini coefficient measures the gap between rich and poor: 0 means perfect equality, 1 means total inequality.
        </p>
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <p className="text-sm text-amber-900">
            <strong>📉 Analysis Strategy:</strong> Start with the <em>Inequality Timeline</em> to see if the income gap is stable, widening, or narrowing. 
            Then check the stacked expenses chart to understand where money goes, and use the city-wide bars to compare spending categories.
          </p>
        </div>
      </div>

      {/* Inequality Timeline - New Feature */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="h-[320px]">
          <InequalityTimeline selectedMonth={selectedMonth} onMonthSelect={setSelectedMonth} />
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div className="bg-blue-50 p-3 rounded-lg">
            <strong className="text-blue-800">Income Gini (blue)</strong>: Measures inequality in monthly earnings. 
            Higher values indicate a wider gap between top earners and the rest.
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <strong className="text-red-800">Savings Gini (red)</strong>: Measures inequality in savings rates. 
            This captures who can build a safety net versus who lives paycheck-to-paycheck.
          </div>
        </div>
      </div>

      {/* Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col" style={{ minHeight: '550px' }}>
          <div className="flex-1" style={{ minHeight: '400px' }}>
            <FinancialTrajectories selectedMonth={selectedMonth} />
          </div>
          <div className="mt-4 text-sm text-gray-700">
            <h4 className="font-semibold text-gray-800 mb-2">Expense Composition Over Time</h4>
            <p>
              The stacked area shows average monthly expenses by category. The dashed line represents average wages. 
              When the line nears the top of the colored bands, residents have less room to save.
            </p>
          </div>
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
             <h4 className="text-sm font-semibold text-gray-800 mb-2">City-wide snapshot for {selectedMonth}</h4>
             <p className="text-xs text-gray-600 mb-3">
               These bars compress the entire city's budget into a single month: shelter dominates fixed costs, while food and recreation absorb most discretionary spending.
             </p>
             <CityWideExpenses selectedMonth={selectedMonth} />
           </div>
          {/* Savings vs Financial Stress visualization removed in favor of inequality analysis */}
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
        <div ref={timeControlRef} className="mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          {renderTimeSlider(false)}
        </div>

        {showFloatingTimeControl && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 z-50 w-full sm:w-auto sm:left-auto sm:right-6 sm:translate-x-0">
            <div className="bg-white/95 backdrop-blur border border-gray-200 rounded-2xl shadow-2xl p-4 sm:w-80">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Quick adjust</div>
              {renderTimeSlider(true)}
            </div>
          </div>
        )}

        {activeTab === 2 && showFloatingDemographicControls && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 px-4 z-50 w-full">
            <div className="w-full max-w-[95%] mx-auto">
              {renderDemographicControls(true)}
            </div>
          </div>
        )}

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

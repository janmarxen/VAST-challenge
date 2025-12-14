import React from 'react';

function HomePage({ onNavigate }) {
  return (
    <div className="w-full bg-gradient-to-b from-slate-50 to-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-12 shadow-md">
        <div className="max-w-6xl mx-auto px-6">
          <h1 className="text-4xl font-bold mb-3">VAST Challenge 3: Economics Dashboard</h1>
          <p className="text-lg text-slate-300">
            Analyzing the financial and employment landscape of Engagement, Ohio
          </p>
        </div>
      </div>

      {/* Introduction Section */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to the Economics Dashboard</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            This comprehensive data visualization platform explores three critical aspects of economic health 
            in the fictional city of Engagement, Ohio. Using advanced analytics and interactive visualizations, 
            we analyze data spanning 15 months with granular 5-minute increments, covering approximately 120 million 
            data points.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Explore the three analyses below to gain insights into business prosperity, resident financial health, 
            and employer workforce dynamics. Each dashboard offers interactive features to help you discover patterns 
            and relationships in the data.
          </p>
        </div>

        {/* Three Main Views */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Business Prosperity Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all">
            <div className="bg-emerald-600 p-6 text-white">
              <h3 className="text-xl font-bold">Business Prosperity</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-sm leading-relaxed mb-5">
                Identify which businesses are thriving or struggling over time. This analysis examines revenue trends, 
                employee headcount trajectories, and market activity patterns to determine business health and growth.
              </p>
              <div className="space-y-2 mb-6">
                <div className="flex items-start gap-2 text-gray-700 text-sm">
                  <span className="text-emerald-600 font-semibold">•</span>
                  <span>Revenue trends over time</span>
                </div>
                <div className="flex items-start gap-2 text-gray-700 text-sm">
                  <span className="text-emerald-600 font-semibold">•</span>
                  <span>Employee count by business</span>
                </div>
                <div className="flex items-start gap-2 text-gray-700 text-sm">
                  <span className="text-emerald-600 font-semibold">•</span>
                  <span>Business activity patterns</span>
                </div>
                <div className="flex items-start gap-2 text-gray-700 text-sm">
                  <span className="text-emerald-600 font-semibold">•</span>
                  <span>Market share analysis</span>
                </div>
              </div>
              <button
                onClick={() => onNavigate('business')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
              >
                Explore Dashboard →
              </button>
            </div>
          </div>

          {/* Resident Financial Health Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all">
            <div className="bg-indigo-600 p-6 text-white">
              <h3 className="text-xl font-bold">Resident Financial Health</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-sm leading-relaxed mb-5">
                Analyze how wages compare to cost of living and identify demographic groups with similar financial patterns. 
                Discover disparities in financial health across different resident segments.
              </p>
              <div className="space-y-2 mb-6">
                <div className="flex items-start gap-2 text-gray-700 text-sm">
                  <span className="text-indigo-600 font-semibold">•</span>
                  <span>Wage vs. living cost analysis</span>
                </div>
                <div className="flex items-start gap-2 text-gray-700 text-sm">
                  <span className="text-indigo-600 font-semibold">•</span>
                  <span>Financial health trends</span>
                </div>
                <div className="flex items-start gap-2 text-gray-700 text-sm">
                  <span className="text-indigo-600 font-semibold">•</span>
                  <span>Demographic patterns</span>
                </div>
                <div className="flex items-start gap-2 text-gray-700 text-sm">
                  <span className="text-indigo-600 font-semibold">•</span>
                  <span>Income disparities</span>
                </div>
              </div>
              <button
                onClick={() => onNavigate('resident')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
              >
                Explore Dashboard →
              </button>
            </div>
          </div>

          {/* Employer Health Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all">
            <div className="bg-purple-600 p-6 text-white">
              <h3 className="text-xl font-bold">Employer Health & Turnover</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-sm leading-relaxed mb-5">
                Examine employment patterns, workforce stability, and turnover rates across employers. Identify areas 
                of high and low turnover, and understand job flow patterns between organizations.
              </p>
              <div className="space-y-2 mb-6">
                <div className="flex items-start gap-2 text-gray-700 text-sm">
                  <span className="text-purple-600 font-semibold">•</span>
                  <span>Turnover rate analysis</span>
                </div>
                <div className="flex items-start gap-2 text-gray-700 text-sm">
                  <span className="text-purple-600 font-semibold">•</span>
                  <span>Job flow patterns</span>
                </div>
                <div className="flex items-start gap-2 text-gray-700 text-sm">
                  <span className="text-purple-600 font-semibold">•</span>
                  <span>Workforce stability</span>
                </div>
                <div className="flex items-start gap-2 text-gray-700 text-sm">
                  <span className="text-purple-600 font-semibold">•</span>
                  <span>Employment trends</span>
                </div>
              </div>
              <button
                onClick={() => onNavigate('employer')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
              >
                Explore Dashboard →
              </button>
            </div>
          </div>
        </div>

        {/* Footer Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mt-12">
          <h3 className="text-xl font-bold text-gray-900 mb-4">About This Dashboard</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">Data Overview</h4>
              <p className="text-sm leading-relaxed">
                This analysis covers 15 months of data with 5-minute increments, encompassing approximately 
                120 million data points. The dataset includes employment records, financial transactions, 
                and demographic information for the city of Engagement, Ohio.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">Interactive Features</h4>
              <p className="text-sm leading-relaxed">
                All visualizations feature interactive elements including brushing, filtering, selection, 
                and cross-component highlighting. Explore the data by clicking, dragging, and toggling controls 
                to uncover insights.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;

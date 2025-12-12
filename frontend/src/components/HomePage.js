import React from 'react';

function HomePage({ onNavigate }) {
  return (
    <div className="w-full bg-gradient-to-b from-blue-50 to-indigo-50 min-h-screen">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-12">
        <div className="max-w-6xl mx-auto px-6">
          <h1 className="text-4xl font-bold mb-3">VAST Challenge 3: Economics Dashboard</h1>
          <p className="text-lg text-blue-100">
            Analyzing the financial and employment landscape of Engagement, Ohio
          </p>
        </div>
      </div>

      {/* Introduction Section */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-md p-8 mb-12">
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
          <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white">
              <h3 className="text-lg font-bold">📊 Business Prosperity</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-sm leading-relaxed mb-6">
                Identify which businesses are thriving or struggling over time. This analysis examines revenue trends, 
                employee headcount trajectories, and market activity patterns to determine business health and growth.
              </p>
              <p className="text-gray-600 text-xs font-semibold mb-4">Key Metrics:</p>
              <ul className="text-gray-700 text-sm space-y-2 mb-6">
                <li>✓ Revenue trends over time</li>
                <li>✓ Employee count by business</li>
                <li>✓ Business activity patterns</li>
                <li>✓ Market share analysis</li>
              </ul>
              <button
                onClick={() => onNavigate('business')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Explore Business Data →
              </button>
            </div>
          </div>

          {/* Resident Financial Health Card */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
              <h3 className="text-lg font-bold">💰 Resident Financial Health</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-sm leading-relaxed mb-6">
                Analyze how wages compare to cost of living and identify demographic groups with similar financial patterns. 
                Discover disparities in financial health across different resident segments.
              </p>
              <p className="text-gray-600 text-xs font-semibold mb-4">Key Metrics:</p>
              <ul className="text-gray-700 text-sm space-y-2 mb-6">
                <li>✓ Wage vs. living cost analysis</li>
                <li>✓ Financial health trends</li>
                <li>✓ Demographic patterns</li>
                <li>✓ Income disparities</li>
              </ul>
              <button
                onClick={() => onNavigate('resident')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Explore Resident Data →
              </button>
            </div>
          </div>

          {/* Employer Health Card */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 text-white">
              <h3 className="text-lg font-bold">👥 Employer Health & Turnover</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-sm leading-relaxed mb-6">
                Examine employment patterns, workforce stability, and turnover rates across employers. Identify areas 
                of high and low turnover, and understand job flow patterns between organizations.
              </p>
              <p className="text-gray-600 text-xs font-semibold mb-4">Key Metrics:</p>
              <ul className="text-gray-700 text-sm space-y-2 mb-6">
                <li>✓ Turnover rate analysis</li>
                <li>✓ Job flow patterns</li>
                <li>✓ Workforce stability</li>
                <li>✓ Employment trends</li>
              </ul>
              <button
                onClick={() => onNavigate('employer')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Explore Employer Data →
              </button>
            </div>
          </div>
        </div>

        {/* Footer Information */}
        <div className="bg-white rounded-xl shadow-md p-8 mt-12">
          <h3 className="text-xl font-bold text-gray-900 mb-4">About This Dashboard</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
            <div>
              <h4 className="font-semibold text-blue-600 mb-2">📈 Data Overview</h4>
              <p className="text-sm leading-relaxed">
                This analysis covers 15 months of data with 5-minute increments, encompassing approximately 
                120 million data points. The dataset includes employment records, financial transactions, 
                and demographic information for the city of Engagement, Ohio.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-blue-600 mb-2">🎯 Interactive Features</h4>
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

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const CityWideExpenses = ({ selectedMonth }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const requestUrl = `/api/resident/geographic-financial-health`;
        const response = await axios.get(requestUrl);
        setData(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching geographic data:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="text-gray-400 italic">Loading stats...</div>;
  if (!data || !data.city_stats) return <div className="text-gray-400 italic">No data available</div>;

  const cityStats = data.city_stats.find(s => s.month === selectedMonth);

  if (!cityStats) return <div className="text-gray-400 italic">No data for this month</div>;

  // Consistent Color Scheme
  const categoryColors = {
    'Shelter': '#4e79a7',       // Blue
    'Food': '#f28e2b',          // Orange
    'Recreation': '#e15759',    // Red
    'Education': '#76b7b2',     // Teal
    'RentAdjustment': '#59a14f' // Green
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-full">
      <h3 className="font-bold text-lg mb-4 text-gray-800">City-wide Monthly Expenses</h3>
      <div className="space-y-4">
        {['Shelter', 'Food', 'Recreation', 'Education'].map(cat => {
          const val = cityStats[cat];
          // Calculate max for scaling (approximate max across all months/cats could be better, but local max works for now)
          const max = Math.max(cityStats.Shelter, cityStats.Food, cityStats.Recreation, cityStats.Education) * 1.2; 
          const pct = (val / max) * 100;
          return (
            <div key={cat}>
              <div className="flex justify-between text-sm mb-1 font-medium text-gray-600">
                <span>{cat}</span>
                <span>${val.toFixed(0)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div 
                    className="h-3 rounded-full transition-all duration-500" 
                    style={{
                        width: `${pct}%`,
                        backgroundColor: categoryColors[cat] || '#ccc'
                    }}
                ></div>
              </div>
            </div>
          )
        })}
        <div className="pt-4 mt-4 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm font-bold text-gray-500">Total Income</span>
            <span className="text-lg font-bold text-green-600">${cityStats.Income.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
};

export default CityWideExpenses;

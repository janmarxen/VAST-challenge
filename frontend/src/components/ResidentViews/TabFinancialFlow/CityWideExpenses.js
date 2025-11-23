import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { EXPENSE_KEYS, EXPENSE_COLOR_MAP } from '../expenditureColors';

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

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-full">
      <h3 className="font-bold text-lg mb-4 text-gray-800">City-wide Monthly Expenses</h3>
      <div className="space-y-4">
        {EXPENSE_KEYS.map(cat => {
          // Expenses may be negative in the source data; display magnitudes
          const val = cityStats[cat];
          const valAbs = Math.abs(val || 0);
          const max = Math.max(...EXPENSE_KEYS.map(k => Math.abs(cityStats[k] || 0))) * 1.2 || 1;
          const pct = max > 0 ? (valAbs / max) * 100 : 0;
          return (
            <div key={cat}>
              <div className="flex justify-between text-sm mb-1 font-medium text-gray-600">
                <span>{cat}</span>
                <span>${valAbs.toFixed(0)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: EXPENSE_COLOR_MAP[cat] || '#ccc'
                  }}
                ></div>
              </div>
            </div>
          );
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

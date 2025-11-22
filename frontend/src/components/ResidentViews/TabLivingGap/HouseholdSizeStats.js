import React, { useEffect, useState } from 'react';
import axios from 'axios';

const HouseholdSizeStats = ({ selectedMonth }) => {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/resident/geographic-financial-health');
        if (mounted) {
          setGeoData(response.data);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching geographic financial health data:', error);
        if (mounted) {
          setGeoData(null);
          setLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="text-gray-400 italic">Loading household stats...</div>;
  }

  const householdStats = geoData && Array.isArray(geoData.household_stats)
    ? geoData.household_stats.filter(stat => stat.month === selectedMonth)
    : [];

  if (!householdStats.length) {
    return <div className="text-gray-400 italic">No household data for this month</div>;
  }

  const sortedStats = [...householdStats].sort((a, b) => {
    const sizeA = Number(a.householdSize) || 0;
    const sizeB = Number(b.householdSize) || 0;
    return sizeA - sizeB;
  });

  const formatCurrency = value => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '--';
    }
    return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-full">
      <h3 className="font-bold text-lg mb-4 text-gray-800">Savings Rate by Household Size</h3>
      <div className="space-y-5">
        {sortedStats.map(stat => {
          const rate = (stat.SavingsRate ?? 0) * 100;
          const barWidth = Math.min(Math.abs(rate), 50);
          const leftPos = rate < 0 ? 50 - barWidth : 50;
          const color = rate < 0 ? 'bg-red-500' : 'bg-green-500';

          return (
            <div key={`household-${stat.householdSize}`}>
              <div className="flex justify-between text-sm mb-1 font-medium text-gray-600">
                <span>{stat.householdSize}-person household</span>
                <span className={rate < 0 ? 'text-red-600' : 'text-green-600'}>{rate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 relative overflow-hidden">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-400 z-10"></div>
                <div
                  className={`h-3 absolute ${color} transition-all duration-500`}
                  style={{ left: `${leftPos}%`, width: `${barWidth}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Income {formatCurrency(stat.Income)}</span>
                <span>Living Cost {formatCurrency(stat.CostOfLiving)}</span>
              </div>
            </div>
          );
        })}
        <div className="flex justify-between text-xs text-gray-400 mt-2 px-1">
          <span>-50%</span>
          <span>0%</span>
          <span>+50%</span>
        </div>
      </div>
    </div>
  );
};

export default HouseholdSizeStats;

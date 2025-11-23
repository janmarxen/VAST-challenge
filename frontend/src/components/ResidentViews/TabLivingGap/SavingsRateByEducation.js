import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { decodeLabel } from '../labels';

const SavingsRateByEducation = ({ selectedMonth }) => {
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
  if (!data || !data.education_stats) return <div className="text-gray-400 italic">No data available</div>;

  const eduStats = data.education_stats.filter(s => s.month === selectedMonth);

  if (!eduStats || eduStats.length === 0) return <div className="text-gray-400 italic">No data for this month</div>;

  // Clamp savings rate to [0, 1] for scale
  const clampRate = rate => Math.max(0, Math.min(1, rate));

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-full">
      <h3 className="font-bold text-lg mb-4 text-gray-800">Savings Rate by Education</h3>
      <div className="space-y-5">
        {eduStats.map(stat => {
          const rate = clampRate(stat.SavingsRate) * 100;
          const color = rate < 0 ? 'bg-red-500' : 'bg-green-500';
          // Scale: 0–100% maps to full bar width
          const barWidth = rate;
          const leftPos = 0;
          return (
            <div key={stat.educationLevel}>
              <div className="flex justify-between text-sm mb-1 font-medium text-gray-600">
                <span>{decodeLabel(stat.educationLevel)}</span>
                <span className={rate < 0 ? 'text-red-600' : 'text-green-600'}>{rate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-400 z-10"></div>
                <div 
                  className={`h-3 absolute ${color} transition-all duration-500`} 
                  style={{
                    left: `${leftPos}%`,
                    width: `${barWidth}%`
                  }}
                ></div>
              </div>
            </div>
          );
        })}
        <div className="flex justify-between text-xs text-gray-400 mt-2 px-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
};

export default SavingsRateByEducation;

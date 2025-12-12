import React, { useMemo } from 'react';

/**
 * Month Slider Component
 * Global time control for employer dashboard
 */
function MonthSlider({ selectedMonth, onMonthSelect }) {
  const months = useMemo(() => {
    // Generate months from 2022-03 to 2023-05
    const result = [];
    let current = new Date(2022, 2); // March 2022
    const end = new Date(2023, 4); // May 2023
    
    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      result.push(`${year}-${month}`);
      current.setMonth(current.getMonth() + 1);
    }
    return result;
  }, []);

  const currentIndex = months.indexOf(selectedMonth);

  return (
    <div className="space-y-3">
      <input
        type="range"
        min="0"
        max={months.length - 1}
        value={currentIndex >= 0 ? currentIndex : 0}
        onChange={(e) => onMonthSelect(months[parseInt(e.target.value)])}
        className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <div className="flex justify-between text-xs text-gray-500 font-mono px-1">
        <span>{months[0]}</span>
        <span className="font-bold text-gray-700">{selectedMonth}</span>
        <span>{months[months.length - 1]}</span>
      </div>
    </div>
  );
}

export default MonthSlider;

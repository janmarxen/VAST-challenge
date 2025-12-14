import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';

/**
 * Employer Turnover Ranking (Bar Chart)
 * Identifies employers with highest and lowest turnover
 */
function TurnoverRanking({ selectedEmployer, onEmployerSelect, selectedMonth, onMonthChange, highlightedEmployers }) {
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('turnoverRate');
  const [tooltip, setTooltip] = useState(null);
  const [employerCount, setEmployerCount] = useState(15);
  
  // Use prop if available, otherwise default (though prop should always be passed in this context)
  const currentMonth = selectedMonth || '2022-03';

  // Fetch data
  useEffect(() => {
    setLoading(true);
    setEmployerCount(15); // Reset to default when month changes
    axios.get('/api/employers/turnover-heatmap', {
      params: { month: currentMonth, fill_missing: true }
    })
      .then(response => {
        // API returns {"data": [...]} so response.data = {"data": [...]}
        let data = response.data;
        if (data && data.data) {
          data = data.data;
        }
        // Filter for selected month
        const monthData = (Array.isArray(data) ? data : []).filter(d => d.month === currentMonth);
        setData(monthData);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching turnover heatmap:', error);
        setLoading(false);
      });
  }, [currentMonth]);

  // Draw chart
  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0 || !svgRef.current) return;

    const width = 750;
    const height = 400;
    const margin = { top: 30, right: 20, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Sort and filter data based on employerCount
    const sortedData = [...data]
      .sort((a, b) => {
        if (sortBy === 'turnoverRate') return b.turnoverRate - a.turnoverRate;
        if (sortBy === 'hires') return b.hires - a.hires;
        if (sortBy === 'quits') return b.quits - a.quits;
        if (sortBy === 'net_change') return b.net_change - a.net_change;
        return 0;
      })
      .slice(0, employerCount);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const maxValue = d3.max(sortedData, d => d[sortBy]);
    const yScale = d3.scaleLinear()
      .domain([0, maxValue * 1.1])
      .range([innerHeight, 0]);

    const xScale = d3.scaleBand()
      .domain(sortedData.map(d => d.employerId.toString()))
      .range([0, innerWidth])
      .padding(0.4);

    // Color scale: blue for normal, red for high, green for low
    const colorScale = d3.scaleLinear()
      .domain([0, d3.mean(sortedData, d => d[sortBy]), maxValue])
      .range(['#4f46e5', '#ec4899', '#dc2626'])
      .clamp(true);

    // Bars
    g.selectAll('.bar')
      .data(sortedData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.employerId.toString()))
      .attr('y', d => yScale(d[sortBy]))
      .attr('width', xScale.bandwidth())
      .attr('height', d => innerHeight - yScale(d[sortBy]))
      .attr('fill', d => {
        if (selectedEmployer === d.employerId) return '#000';
        if (highlightedEmployers && highlightedEmployers.includes(d.employerId)) return '#ff9500';
        return colorScale(d[sortBy]);
      })
      .attr('opacity', d => {
        if (selectedEmployer === d.employerId) return 1;
        if (highlightedEmployers && highlightedEmployers.length > 0) {
          return highlightedEmployers.includes(d.employerId) ? 1 : 0.3;
        }
        return selectedEmployer === null ? 1 : 0.3;
      })
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        event.stopPropagation();
        onEmployerSelect(d.employerId);
      })
      .on('mouseover', function(event, d) {
        setTooltip({
          x: event.pageX,
          y: event.pageY,
          content: {
            employerId: d.employerId,
            turnoverRate: (d.turnoverRate * 100).toFixed(1) + '%',
            hires: d.hires,
            quits: d.quits,
            net_change: d.net_change
          }
        });
      })
      .on('mouseout', function() {
        setTooltip(null);
      });

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .style('font-size', '11px');

    // Y Axis Label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -45)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#666')
      .attr('font-size', '12px')
      .text(sortBy === 'turnoverRate' ? 'Turnover Rate' : sortBy.charAt(0).toUpperCase() + sortBy.slice(1));

    // X Axis (employer IDs)
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .style('font-size', '10px')
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

  }, [data, sortBy, selectedEmployer, highlightedEmployers, employerCount, currentMonth]);

  if (loading) return <div className="text-center py-8 text-gray-500">Loading turnover data...</div>;

  return (
    <div className="flex flex-col gap-4">
      {/* Header with description */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
        <h3 className="font-semibold text-blue-900 text-sm">Turnover Ranking</h3>
        <p className="text-xs text-blue-800 mt-1">
          Ranks employers by workforce change intensity. Switch metrics to compare turnover rate, hires, quits, or net change. 
          Click bars to highlight across other charts.
        </p>
      </div>

      {/* Controls: Month Toggle, Sort, Employer Count */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-700">Month:</label>
          <select
            value={currentMonth}
            onChange={(e) => {
              onMonthChange?.(e.target.value);
            }}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white cursor-pointer"
          >
            {[
              '2022-03', '2022-04', '2022-05', '2022-06', '2022-07', '2022-08',
              '2022-09', '2022-10', '2022-11', '2022-12', '2023-01', '2023-02',
              '2023-03', '2023-04', '2023-05'
            ].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-700">Sort by:</label>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white cursor-pointer"
          >
            <option value="turnoverRate">Turnover Rate</option>
            <option value="hires">Hires</option>
            <option value="quits">Quits</option>
            <option value="net_change">Net Change</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-700">Show:</label>
          {[15, 30, 50].map(count => (
            <button
              key={count}
              onClick={() => setEmployerCount(count)}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                employerCount === count
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-x-auto flex justify-center">
        <svg ref={svgRef} width={750} height={400} style={{ maxWidth: '100%' }}></svg>
      </div>

      {tooltip && (
        <div
          className="absolute z-50 bg-gray-900 text-white text-xs p-2 rounded shadow-lg pointer-events-none"
          style={{ left: tooltip.x + 10, top: tooltip.y - 50 }}
        >
          <div className="font-semibold">Employer #{tooltip.content.employerId}</div>
          <div>Turnover: {tooltip.content.turnoverRate}</div>
          <div>Hires: {tooltip.content.hires}</div>
          <div>Quits: {tooltip.content.quits}</div>
          <div>Net Change: {tooltip.content.net_change}</div>
        </div>
      )}
    </div>
  );
}

export default TurnoverRanking;

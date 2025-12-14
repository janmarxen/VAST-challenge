import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';

/**
 * Employer Market Share (Stream Graph)
 * Shows the evolution of workforce size for top employers over time.
 */
function EmployerMarketShare() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOthers, setShowOthers] = useState(false);
  const svgRef = useRef();

  useEffect(() => {
    setLoading(true);
    axios.get('/api/employers/market-share')
      .then(response => {
        setData(response.data || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching market share:', error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const width = 800;
    const height = 400;
    const margin = { top: 20, right: 120, bottom: 30, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Process Data
    // 1. Identify Top N Employers
    const employerTotals = d3.rollup(data, v => d3.sum(v, d => d.avgEmployeeCount), d => d.employerId);
    const sortedEmployers = Array.from(employerTotals)
      .sort((a, b) => b[1] - a[1])
      .map(d => d[0]);

    // Take top 10
    const top10 = sortedEmployers.slice(0, 10);
    const topSet = new Set(top10);

    // 2. Pivot Data: Month -> { EmployerId: Count, ... }
    // Group "Others"
    const months = Array.from(new Set(data.map(d => d.month))).sort();
    
    const pivotedData = months.map(m => {
      const monthRecords = data.filter(d => d.month === m);
      const obj = { month: m };
      let otherCount = 0;
      
      monthRecords.forEach(r => {
         if (topSet.has(r.employerId)) {
           obj[r.employerId] = r.avgEmployeeCount;
         } else {
           otherCount += r.avgEmployeeCount;
         }
      });
      
      // Fill missing top employers with 0
      top10.forEach(id => {
        if (obj[id] === undefined) obj[id] = 0;
      });
      
      if (showOthers) {
        obj['Others'] = otherCount;
      }
      return obj;
    });

    const keys = showOthers ? [...top10, 'Others'] : top10;

    // Stack
    const stack = d3.stack()
      .keys(keys)
      .offset(d3.stackOffsetNone); 

    const series = stack(pivotedData);

    // Scales
    const x = d3.scaleBand()
      .domain(months)
      .range([0, innerWidth])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(series, s => d3.max(s, d => d[1]))])
      .range([innerHeight, 0]);

    const color = d3.scaleOrdinal()
      .domain(keys)
      .range(d3.schemeTableau10);

    // Area generator
    const area = d3.area()
      .x(d => x(d.data.month) + x.bandwidth() / 2)
      .y0(d => y(d[0]))
      .y1(d => y(d[1]));

    // Draw Areas
    svg.selectAll('path')
      .data(series)
      .join('path')
      .attr('fill', d => color(d.key))
      .attr('d', area)
      .append('title')
      .text(d => `Employer ${d.key}`);

    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x));

    svg.append('g')
      .call(d3.axisLeft(y));

    // Legend
    const legend = svg.append('g')
      .attr('transform', `translate(${innerWidth + 10}, 0)`);

    keys.slice().reverse().forEach((key, i) => {
      const g = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);
      
      g.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', color(key));
      
      g.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .text(key === 'Others' ? 'Others' : `Emp ${key}`)
        .style('font-size', '10px')
        .style('fill', '#333'); // Ensure text color is visible
    });

  }, [data, showOthers]);

  if (loading) return <div className="text-center py-8 text-gray-500">Loading market share data...</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-purple-50 border-l-4 border-purple-400 p-3 rounded flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-purple-900 text-sm">Employer Market Share</h3>
          <p className="text-xs text-purple-800 mt-1">
            Evolution of workforce size for top 10 employers vs. the rest of the market.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="showOthers" 
              checked={showOthers} 
              onChange={(e) => setShowOthers(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="showOthers" className="text-xs font-medium text-purple-900 cursor-pointer">
              Show all other aggregated employers
            </label>
          </div>
        </div>
      </div>
      <div className="relative overflow-x-auto flex justify-center">
        <svg ref={svgRef}></svg>
      </div>
    </div>
  );
}

export default EmployerMarketShare;

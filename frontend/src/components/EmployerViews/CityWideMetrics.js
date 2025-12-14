import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';

/**
 * City-Wide Metrics Dashboard
 * Shows aggregated employment and turnover trends for the entire city.
 */
function CityWideMetrics() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const svgRef = useRef();

  useEffect(() => {
    setLoading(true);
    axios.get('/api/employers/city-metrics')
      .then(response => {
        setData(response.data || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching city metrics:', error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const width = 800;
    const height = 300;
    const margin = { top: 20, right: 50, bottom: 30, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Axis: Month
    const x = d3.scaleBand()
      .domain(data.map(d => d.month))
      .range([0, innerWidth])
      .padding(0.1);

    // Y Axis 1: Employment (Left)
    const y1 = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.avgTotalEmployment) * 1.1])
      .range([innerHeight, 0]);

    // Y Axis 2: Turnover Rate (Right)
    const y2 = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.cityTurnoverRate) * 1.2])
      .range([innerHeight, 0]);

    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x));

    svg.append('g')
      .call(d3.axisLeft(y1).ticks(5))
      .append('text')
      .attr('fill', '#1f77b4')
      .attr('y', -10)
      .attr('dy', '0.71em')
      .attr('text-anchor', 'end')
      .text('Employment');

    svg.append('g')
      .attr('transform', `translate(${innerWidth},0)`)
      .call(d3.axisRight(y2).ticks(5).tickFormat(d3.format('.1%')))
      .append('text')
      .attr('fill', '#ff7f0e')
      .attr('y', -10)
      .attr('dy', '0.71em')
      .attr('text-anchor', 'start')
      .text('Turnover Rate');

    // Line for Employment
    const line1 = d3.line()
      .x(d => x(d.month) + x.bandwidth() / 2)
      .y(d => y1(d.avgTotalEmployment));

    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#1f77b4')
      .attr('stroke-width', 2)
      .attr('d', line1);

    // Line for Turnover Rate
    const line2 = d3.line()
      .x(d => x(d.month) + x.bandwidth() / 2)
      .y(d => y2(d.cityTurnoverRate));

    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#ff7f0e')
      .attr('stroke-width', 2)
      .attr('d', line2);

    // Dots
    svg.selectAll('.dot1')
      .data(data)
      .enter().append('circle')
      .attr('cx', d => x(d.month) + x.bandwidth() / 2)
      .attr('cy', d => y1(d.avgTotalEmployment))
      .attr('r', 4)
      .attr('fill', '#1f77b4');

    svg.selectAll('.dot2')
      .data(data)
      .enter().append('circle')
      .attr('cx', d => x(d.month) + x.bandwidth() / 2)
      .attr('cy', d => y2(d.cityTurnoverRate))
      .attr('r', 4)
      .attr('fill', '#ff7f0e');

  }, [data]);

  if (loading) return <div className="text-center py-8 text-gray-500">Loading city metrics...</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-gray-50 border-l-4 border-gray-400 p-3 rounded">
        <h3 className="font-semibold text-gray-900 text-sm">City-Wide Overview</h3>
        <p className="text-xs text-gray-800 mt-1">
          Total employment (blue) vs. turnover rate (orange) across the entire city.
        </p>
      </div>
      <div className="relative overflow-x-auto flex justify-center">
        <svg ref={svgRef}></svg>
      </div>
    </div>
  );
}

export default CityWideMetrics;

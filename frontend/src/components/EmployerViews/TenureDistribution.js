import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';

/**
 * Tenure Distribution by Employer (Boxplot)
 * Shows employment stability: long tenure = stable organization
 */
function TenureDistribution({ selectedEmployer, onBrush }) {
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);

  // Fetch tenure data
  useEffect(() => {
    setLoading(true);
    axios.get('/api/employers/tenure')
      .then(response => {
        // Handle response format
        let tenureData = response.data;
        if (tenureData && tenureData.data) {
          tenureData = tenureData.data;
        }
        tenureData = Array.isArray(tenureData) ? tenureData : [];
        
        // response.data should be array of {employerId, medianTenure, avgTenure, minTenure, maxTenure}
        const processed = tenureData.map(d => ({
          employerId: d.employerId,
          median: d.medianTenure,
          mean: d.avgTenure,
          min: d.minTenure,
          max: d.maxTenure,
          q1: d.minTenure + (d.medianTenure - d.minTenure) * 0.25,
          q3: d.medianTenure + (d.maxTenure - d.medianTenure) * 0.25
        }));
        setData(processed);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching tenure data:', error);
        setLoading(false);
      });
  }, []);

  // Draw boxplot
  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0 || !svgRef.current) return;

    const width = 480;
    const height = 400;
    const margin = { top: 30, right: 20, bottom: 80, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const maxTenure = d3.max(data, d => d.max);
    const yScale = d3.scaleLinear()
      .domain([0, maxTenure * 1.1])
      .range([innerHeight, 0]);

    const xScale = d3.scaleBand()
      .domain(data.map((d, i) => i.toString()))
      .range([0, innerWidth])
      .padding(0.5);

    // Whiskers (min-max)
    g.selectAll('.whisker')
      .data(data)
      .enter()
      .append('line')
      .attr('class', 'whisker')
      .attr('x1', (d, i) => xScale(i.toString()) + xScale.bandwidth() / 2)
      .attr('x2', (d, i) => xScale(i.toString()) + xScale.bandwidth() / 2)
      .attr('y1', d => yScale(d.max))
      .attr('y2', d => yScale(d.min))
      .attr('stroke', '#999')
      .attr('stroke-width', 1);

    // Boxes (Q1-Q3)
    g.selectAll('.box')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'box')
      .attr('x', (d, i) => xScale(i.toString()) + xScale.bandwidth() * 0.2)
      .attr('y', d => yScale(d.q3))
      .attr('width', xScale.bandwidth() * 0.6)
      .attr('height', d => yScale(d.q1) - yScale(d.q3))
      .attr('fill', d => {
        if (selectedEmployer === d.employerId) return '#3b82f6';
        return '#a78bfa';
      })
      .attr('opacity', d => selectedEmployer === null || selectedEmployer === d.employerId ? 0.7 : 0.3)
      .attr('stroke', d => {
        if (selectedEmployer === d.employerId) return '#1e40af';
        return '#7c3aed';
      })
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        setTooltip({
          x: event.pageX,
          y: event.pageY,
          content: {
            employerId: d.employerId,
            median: d.median.toFixed(0),
            mean: d.mean.toFixed(0),
            min: d.min,
            max: d.max
          }
        });
      })
      .on('mouseout', () => {
        setTooltip(null);
      });

    // Median line (inside box)
    g.selectAll('.median')
      .data(data)
      .enter()
      .append('line')
      .attr('class', 'median')
      .attr('x1', (d, i) => xScale(i.toString()) + xScale.bandwidth() * 0.2)
      .attr('x2', (d, i) => xScale(i.toString()) + xScale.bandwidth() * 0.8)
      .attr('y1', d => yScale(d.median))
      .attr('y2', d => yScale(d.median))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

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
      .text('Tenure (days)');

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .style('font-size', '9px')
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    // X Axis Label
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 65)
      .attr('text-anchor', 'middle')
      .attr('fill', '#666')
      .attr('font-size', '12px')
      .text('Employer Index');

  }, [data, selectedEmployer]);

  if (loading) return <div className="text-center py-8 text-gray-500">Loading tenure data...</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-x-auto">
        <svg ref={svgRef} width={480} height={400} style={{ maxWidth: '100%' }}></svg>
      </div>

      {tooltip && (
        <div
          className="absolute z-50 bg-gray-900 text-white text-xs p-2 rounded shadow-lg pointer-events-none"
          style={{ left: tooltip.x + 10, top: tooltip.y - 80 }}
        >
          <div className="font-semibold">Employer #{tooltip.content.employerId}</div>
          <div>Median: {tooltip.content.median} days</div>
          <div>Mean: {tooltip.content.mean} days</div>
          <div>Range: {tooltip.content.min} - {tooltip.content.max} days</div>
        </div>
      )}

      <p className="text-xs text-gray-600 text-center">
        Each box shows the interquartile range (IQR) of tenure. Longer boxes = more variable tenure patterns.
      </p>
    </div>
  );
}

export default TenureDistribution;

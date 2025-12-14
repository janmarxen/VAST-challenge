import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';

/**
 * Employer Payroll Estimates
 * Visualizes estimated monthly payroll costs for top employers.
 */
function EmployerPayrollEstimates({ selectedMonth }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const svgRef = useRef();

  const currentMonth = selectedMonth || '2022-03';

  useEffect(() => {
    setLoading(true);
    axios.get('/api/employers/financials')
      .then(response => {
        setData(response.data || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching financials:', error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;

    // Filter by month
    const monthData = data.filter(d => d.month === currentMonth);
    
    // Top 15 by payroll
    const topData = monthData.slice(0, 15);

    // Calculate global max for consistent scale
    const globalMaxPayroll = d3.max(data, d => d.estimatedMonthlyPayroll) || 0;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const width = 750;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 100, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleBand()
      .domain(topData.map(d => d.employerId))
      .range([0, innerWidth])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, globalMaxPayroll])
      .range([innerHeight, 0]);

    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    svg.append('g')
      .call(d3.axisLeft(y).tickFormat(d => `$${d3.format('.2s')(d)}`));

    // Bars
    svg.selectAll('rect')
      .data(topData)
      .enter().append('rect')
      .attr('x', d => x(d.employerId))
      .attr('y', d => y(d.estimatedMonthlyPayroll))
      .attr('width', x.bandwidth())
      .attr('height', d => innerHeight - y(d.estimatedMonthlyPayroll))
      .attr('fill', '#10b981') // Emerald green
      .append('title')
      .text(d => `Employer ${d.employerId}\nPayroll: $${d3.format(',.2f')(d.estimatedMonthlyPayroll)}\nAvg Rate: $${d.avgHourlyRate.toFixed(2)}/hr`);

    // Labels
    svg.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 60)
      .attr('text-anchor', 'middle')
      .text('Employer ID');

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -80)
      .attr('text-anchor', 'middle')
      .text(`Est. Monthly Payroll (${currentMonth})`);

  }, [data, currentMonth]);

  if (loading) return <div className="text-center py-8 text-gray-500">Loading financial data...</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded">
        <h3 className="font-semibold text-green-900 text-sm">Estimated Monthly Payroll</h3>
        <p className="text-xs text-green-800 mt-1">
          Top 15 employers by estimated payroll cost (Employees × Avg Hourly Rate × 160h).
        </p>
      </div>
      <div className="relative overflow-x-auto flex justify-center">
        <svg ref={svgRef}></svg>
      </div>
    </div>
  );
}

export default EmployerPayrollEstimates;

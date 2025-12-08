import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { fetchMarketShare } from '../../utils/api';

/**
 * Market Share Bar/Pie Chart
 * Shows spending distribution by venue
 */
function MarketShareStream({ venueType, participantId, startDate, endDate, onDataLoaded }) {
  const svgRef = useRef();
  const [data, setData] = useState({ venues: [], total_spending: 0 });
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('bar');
  const [topN, setTopN] = useState(10);

  useEffect(() => {
    setLoading(true);
    fetchMarketShare({ venueType, participantId, startDate, endDate })
      .then(response => {
        setData(response);
        setLoading(false);
        // Notify parent of loaded data for KPI calculation
        if (onDataLoaded) {
          onDataLoaded(response);
        }
      })
      .catch(error => {
        console.error('Error fetching market share:', error);
        setLoading(false);
      });
  }, [venueType, participantId, startDate, endDate, onDataLoaded]);

  useEffect(() => {
    if (!data.venues || !data.venues.length) return;

    const width = 550;
    const height = 350;
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // Take top N venues
    const chartData = data.venues.slice(0, topN);

    // Color scale
    const colorScale = d3.scaleOrdinal()
      .domain(chartData.map(d => d.venue_id))
      .range(d3.schemeTableau10);

    if (chartType === 'bar') {
      // Bar Chart
      const margin = { top: 20, right: 20, bottom: 80, left: 60 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleBand()
        .domain(chartData.map(d => `${d.venue_type[0]}${d.venue_id}`))
        .range([0, innerWidth])
        .padding(0.2);

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.percentage)])
        .nice()
        .range([innerHeight, 0]);

      // Bars
      g.selectAll('.bar')
        .data(chartData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(`${d.venue_type[0]}${d.venue_id}`))
        .attr('y', d => yScale(d.percentage))
        .attr('width', xScale.bandwidth())
        .attr('height', d => innerHeight - yScale(d.percentage))
        .attr('fill', d => d.venue_type === 'Restaurant' ? '#3b82f6' : '#10b981')
        .on('mouseover', function(event, d) {
          d3.select(this).attr('opacity', 0.8);
          tooltip.transition().duration(200).style('opacity', 0.9);
          tooltip.html(`
            <strong>${d.venue_type} #${d.venue_id}</strong><br/>
            Spending: $${d.total_spending.toFixed(2)}<br/>
            Share: ${d.percentage.toFixed(2)}%<br/>
            Visits: ${d.visit_count}
          `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
          d3.select(this).attr('opacity', 1);
          tooltip.transition().duration(500).style('opacity', 0);
        });

      // X Axis
      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-size', '10px');

      // Y Axis
      g.append('g')
        .call(d3.axisLeft(yScale).tickFormat(d => d + '%'));

      // Y Axis Label
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -45)
        .attr('x', -innerHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#666')
        .attr('font-size', '12px')
        .text('Market Share (%)');

    } else {
      // Pie Chart
      const radius = Math.min(width, height) / 2 - 40;
      const g = svg.append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

      const pie = d3.pie()
        .value(d => d.percentage)
        .sort(null);

      const arc = d3.arc()
        .innerRadius(radius * 0.4)
        .outerRadius(radius);

      const arcHover = d3.arc()
        .innerRadius(radius * 0.4)
        .outerRadius(radius * 1.05);

      const slices = g.selectAll('.slice')
        .data(pie(chartData))
        .enter()
        .append('g')
        .attr('class', 'slice');

      slices.append('path')
        .attr('d', arc)
        .attr('fill', d => d.data.venue_type === 'Restaurant' ? '#3b82f6' : '#10b981')
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .on('mouseover', function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('d', arcHover);
          tooltip.transition().duration(200).style('opacity', 0.9);
          tooltip.html(`
            <strong>${d.data.venue_type} #${d.data.venue_id}</strong><br/>
            Spending: $${d.data.total_spending.toFixed(2)}<br/>
            Share: ${d.data.percentage.toFixed(2)}%<br/>
            Visits: ${d.data.visit_count}
          `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('d', arc);
          tooltip.transition().duration(500).style('opacity', 0);
        });

      // Add labels for larger slices
      slices.filter(d => d.data.percentage > 3)
        .append('text')
        .attr('transform', d => `translate(${arc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', 'white')
        .text(d => `${d.data.percentage.toFixed(1)}%`);
    }

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background', 'white')
      .style('border', '1px solid #ccc')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000);

    return () => {
      tooltip.remove();
    };
  }, [data, chartType, topN]);

  if (loading) return <div className="text-center py-8">Loading market share data...</div>;

  if (!data.venues || data.venues.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data available for the selected filters</div>;
  }

  return (
    <div>
      <div className="mb-2 flex gap-4">
        <div>
          <label className="mr-2 text-sm">Chart:</label>
          <select 
            value={chartType} 
            onChange={(e) => setChartType(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="bar">Bar Chart</option>
            <option value="pie">Pie Chart</option>
          </select>
        </div>
        <div>
          <label className="mr-2 text-sm">Top N:</label>
          <select 
            value={topN} 
            onChange={(e) => setTopN(parseInt(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="20">20</option>
          </select>
        </div>
      </div>
      <div className="text-sm text-gray-600 mb-2">
        Total spending: ${data.total_spending.toFixed(2)} |
        <span className="inline-block w-3 h-3 bg-blue-500 ml-2 mr-1"></span>Restaurant
        <span className="inline-block w-3 h-3 bg-green-500 ml-2 mr-1"></span>Pub
      </div>
      <svg ref={svgRef}></svg>
    </div>
  );
}

export default MarketShareStream;

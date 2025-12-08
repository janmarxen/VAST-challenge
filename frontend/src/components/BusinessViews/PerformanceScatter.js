import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { fetchMarketShare } from '../../utils/api';

/**
 * Performance Scatter Plot
 * Shows venue performance comparison: visits vs spending
 */
function PerformanceScatter({ venueType, venueId, participantId, startDate, endDate, topN, sortBy, hoveredVenue, onHoverVenue }) {
  const svgRef = useRef();
  const [data, setData] = useState({ venues: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchMarketShare({ venueType, venueId, participantId, startDate, endDate })
      .then(response => {
        setData(response);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching performance data:', error);
        setLoading(false);
      });
  }, [venueType, venueId, participantId, startDate, endDate]);

  useEffect(() => {
    if (!data.venues || !data.venues.length) return;

    const width = 550;
    const height = 320;
    const margin = { top: 20, right: 20, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // Sort by parent's sortBy criteria first, then take top N
    let sortedVenues = [...data.venues];
    if (sortBy === 'total_spending') {
      sortedVenues.sort((a, b) => b.total_spending - a.total_spending);
    } else if (sortBy === 'visit_count') {
      sortedVenues.sort((a, b) => b.visit_count - a.visit_count);
    }
    const chartVenues = sortedVenues.slice(0, topN || data.venues.length);

    // Helper to create venue key for cross-chart matching
    const venueKey = d => `${d.venue_type}-${d.venue_id}`;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(chartVenues, d => d.visit_count) * 1.1])
      .nice()
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(chartVenues, d => d.total_spending) * 1.1])
      .nice()
      .range([innerHeight, 0]);

    const sizeScale = d3.scaleSqrt()
      .domain([0, d3.max(chartVenues, d => d.percentage)])
      .range([4, 20]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisBottom(xScale).tickSize(innerHeight).tickFormat(''));

    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(''));

    // Points
    const circles = g.selectAll('circle')
      .data(chartVenues)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.visit_count))
      .attr('cy', d => yScale(d.total_spending))
      .attr('r', d => sizeScale(d.percentage))
      .attr('fill', d => d.venue_type === 'Restaurant' ? '#f97316' : '#8b5cf6')
      .attr('opacity', d => hoveredVenue && hoveredVenue !== venueKey(d) ? 0.2 : 0.7)
      .attr('stroke', d => hoveredVenue === venueKey(d) ? '#000' : 'white')
      .attr('stroke-width', d => hoveredVenue === venueKey(d) ? 3 : 1);

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

    circles.on('mouseover', function(event, d) {
      if (onHoverVenue) onHoverVenue(venueKey(d));
      d3.select(this)
        .attr('opacity', 1)
        .attr('stroke', '#333')
        .attr('stroke-width', 2);
      tooltip.transition().duration(200).style('opacity', 0.9);
      tooltip.html(`
        <strong>${d.venue_type} #${d.venue_id}</strong><br/>
        Total Visits: ${d.visit_count}<br/>
        Total Spending: $${d.total_spending.toFixed(2)}<br/>
        Market Share: ${d.percentage.toFixed(2)}%<br/>
        Avg per Visit: $${(d.total_spending / d.visit_count).toFixed(2)}
      `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', function() {
      if (onHoverVenue) onHoverVenue(null);
      d3.select(this)
        .attr('opacity', 0.7)
        .attr('stroke', 'white')
        .attr('stroke-width', 1);
      tooltip.transition().duration(500).style('opacity', 0);
    });

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale));

    // X Axis Label
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', '#666')
      .attr('font-size', '12px')
      .text('Total Visits');

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(yScale).tickFormat(d => `$${d}`));

    // Y Axis Label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -50)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#666')
      .attr('font-size', '12px')
      .text('Total Spending ($)');

    return () => {
      tooltip.remove();
    };
  }, [data, topN, sortBy, hoveredVenue, onHoverVenue]);

  if (loading) return <div className="text-center py-8">Loading performance data...</div>;

  if (!data.venues || data.venues.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data available for the selected filters</div>;
  }

  return (
    <div>
      <div className="text-sm text-gray-600 mb-2">
        Showing top {Math.min(topN || data.venues.length, data.venues.length)} venues | Bubble size = market share
      </div>
      <svg ref={svgRef}></svg>
    </div>
  );
}

export default PerformanceScatter;

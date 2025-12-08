import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { fetchVenueTimeseries } from '../../utils/api';

/**
 * Venue Time Series Visualization
 * Shows check-in count and spending over time for venues
 */
function RevenueTimeSeries({ venueId, venueType, participantId, startDate, endDate, resolution }) {
  const svgRef = useRef();
  const [data, setData] = useState({ timeseries: [], max_occupancy: null });
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState('checkin_count');

  useEffect(() => {
    setLoading(true);
    fetchVenueTimeseries({
      venueId,
      venueType,
      participantId,
      startDate,
      endDate,
      resolution
    })
      .then(response => {
        setData(response);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching venue timeseries:', error);
        setLoading(false);
      });
  }, [venueId, venueType, participantId, startDate, endDate, resolution]);

  useEffect(() => {
    if (!data.timeseries || !data.timeseries.length) return;

    const width = 550;
    const height = 350;
    const margin = { top: 20, right: 40, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse dates and prepare data
    const parseTime = d3.isoParse;
    const chartData = data.timeseries.map(d => ({
      date: parseTime(d.timestamp),
      checkin_count: d.checkin_count,
      total_spending: d.total_spending
    }));

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(chartData, d => d.date))
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d[metric]) * 1.1])
      .nice()
      .range([innerHeight, 0]);

    // Line generator
    const line = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d[metric]))
      .curve(d3.curveMonotoneX);

    // Area generator for fill
    const area = d3.area()
      .x(d => xScale(d.date))
      .y0(innerHeight)
      .y1(d => yScale(d[metric]))
      .curve(d3.curveMonotoneX);

    // Add area fill
    g.append('path')
      .datum(chartData)
      .attr('fill', metric === 'checkin_count' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)')
      .attr('d', area);

    // Add line
    g.append('path')
      .datum(chartData)
      .attr('fill', 'none')
      .attr('stroke', metric === 'checkin_count' ? '#3b82f6' : '#10b981')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add max occupancy line if available and showing check-in count
    if (data.max_occupancy && metric === 'checkin_count') {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(data.max_occupancy))
        .attr('y2', yScale(data.max_occupancy))
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5');

      g.append('text')
        .attr('x', innerWidth - 5)
        .attr('y', yScale(data.max_occupancy) - 5)
        .attr('text-anchor', 'end')
        .attr('fill', '#ef4444')
        .attr('font-size', '12px')
        .text(`Max Capacity: ${data.max_occupancy}`);
    }

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(6))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5));

    // Y Axis Label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -45)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#666')
      .attr('font-size', '12px')
      .text(metric === 'checkin_count' ? 'Check-in Count' : 'Total Spending ($)');

    // Add dots for hover
    const dots = g.selectAll('.dot')
      .data(chartData)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(d[metric]))
      .attr('r', 4)
      .attr('fill', metric === 'checkin_count' ? '#3b82f6' : '#10b981')
      .attr('opacity', 0);

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background', 'white')
      .style('border', '1px solid #ccc')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    dots.on('mouseover', function(event, d) {
      d3.select(this).attr('opacity', 1).attr('r', 6);
      tooltip.transition().duration(200).style('opacity', 0.9);
      tooltip.html(`
        <strong>${d3.timeFormat('%Y-%m-%d')(d.date)}</strong><br/>
        Check-ins: ${d.checkin_count}<br/>
        Spending: $${d.total_spending.toFixed(2)}
      `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', function() {
      d3.select(this).attr('opacity', 0).attr('r', 4);
      tooltip.transition().duration(500).style('opacity', 0);
    });

    return () => {
      tooltip.remove();
    };
  }, [data, metric]);

  if (loading) return <div className="text-center py-8">Loading venue data...</div>;

  if (!data.timeseries || data.timeseries.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data available for the selected filters</div>;
  }

  return (
    <div>
      <div className="mb-2">
        <label className="mr-2 text-sm">Metric:</label>
        <select 
          value={metric} 
          onChange={(e) => setMetric(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="checkin_count">Check-in Count</option>
          <option value="total_spending">Total Spending</option>
        </select>
      </div>
      <svg ref={svgRef}></svg>
    </div>
  );
}

export default RevenueTimeSeries;

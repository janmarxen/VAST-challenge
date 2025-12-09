import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { fetchBusinessTrends } from '../../utils/api';

/**
 * Business Trends Visualization
 * Shows which businesses are prospering (↑ green) vs struggling (↓ red)
 * Uses arrows and color encoding to clearly indicate trends
 */
function BusinessTrends({ venueType, venueId, participantId, startDate, endDate, metric, topN, sortBy, hoveredVenue, onHoverVenue, onDataLoaded }) {
  const svgRef = useRef();
  const [data, setData] = useState({ venues: [], period_info: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchBusinessTrends({
      venueType,
      venueId,
      participantId,
      startDate,
      endDate
    })
      .then(response => {
        setData(response);
        setLoading(false);
        // Notify parent of loaded data for KPI calculation
        if (onDataLoaded) {
          onDataLoaded(response);
        }
      })
      .catch(error => {
        console.error('Error fetching business trends:', error);
        setLoading(false);
      });
  }, [venueType, venueId, participantId, startDate, endDate, onDataLoaded]);

  useEffect(() => {
    if (!data.venues || !data.venues.length) return;

    const width = 550;
    const height = 400;
    const margin = { top: 40, right: 30, bottom: 60, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // First sort by parent's sortBy to get consistent top N across charts
    let sortedVenues = [...data.venues];
    if (sortBy === 'total_spending') {
      sortedVenues.sort((a, b) => b.total_spending - a.total_spending);
    } else if (sortBy === 'visit_count') {
      sortedVenues.sort((a, b) => b.total_visits - a.total_visits);
    }

    // Take top N venues (prop from parent)
    let displayVenues = sortedVenues.slice(0, topN || 15);
    
    // Then sort display by trend change (based on metric)
    const changeField = metric === 'checkin_count' ? 'visits_pct_change' : 'spending_pct_change';
    displayVenues.sort((a, b) => (b[changeField] || 0) - (a[changeField] || 0));

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Color scale: green for prospering, red for struggling  
    // Determine trend based on metric
    const getChange = d => metric === 'checkin_count' ? (d.visits_pct_change || 0) : (d.spending_pct_change || 0);
    const getTrend = d => getChange(d) >= 0 ? 'prospering' : 'struggling';
    const colorScale = d => getTrend(d) === 'prospering' ? '#10b981' : '#ef4444';

    // Y scale for venues
    const yScale = d3.scaleBand()
      .domain(displayVenues.map(d => `${d.venue_type[0]}#${d.venue_id}`))
      .range([0, innerHeight])
      .padding(0.2);

    // X scale for percentage change (centered at 0)
    const maxChange = Math.max(
      Math.abs(d3.min(displayVenues, d => getChange(d))),
      Math.abs(d3.max(displayVenues, d => getChange(d))),
      10 // minimum range
    );
    
    const xScale = d3.scaleLinear()
      .domain([-maxChange, maxChange])
      .range([0, innerWidth])
      .nice();

    // Add center line (0% change)
    g.append('line')
      .attr('x1', xScale(0))
      .attr('x2', xScale(0))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#9ca3af')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,4');

    // Add background regions
    g.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', xScale(0))
      .attr('height', innerHeight)
      .attr('fill', '#fef2f2')
      .attr('opacity', 0.5);

    g.append('rect')
      .attr('x', xScale(0))
      .attr('y', 0)
      .attr('width', innerWidth - xScale(0))
      .attr('height', innerHeight)
      .attr('fill', '#f0fdf4')
      .attr('opacity', 0.5);

    // Add labels for regions
    g.append('text')
      .attr('x', xScale(0) / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#dc2626')
      .text('← Struggling');

    g.append('text')
      .attr('x', xScale(0) + (innerWidth - xScale(0)) / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#16a34a')
      .text('Prospering →');

    // Draw bars
    const bars = g.selectAll('.trend-bar')
      .data(displayVenues)
      .enter()
      .append('g')
      .attr('class', 'trend-bar');

    // Helper to create venue key for cross-chart matching
    const venueKey = d => `${d.venue_type}-${d.venue_id}`;

    // Bar from center to value
    bars.append('rect')
      .attr('class', 'trend-rect')
      .attr('x', d => getChange(d) >= 0 ? xScale(0) : xScale(getChange(d)))
      .attr('y', d => yScale(`${d.venue_type[0]}#${d.venue_id}`))
      .attr('width', d => Math.abs(xScale(getChange(d)) - xScale(0)))
      .attr('height', yScale.bandwidth())
      .attr('fill', colorScale)
      .attr('opacity', d => hoveredVenue && hoveredVenue !== venueKey(d) ? 0.3 : 0.8)
      .attr('rx', 3)
      .attr('stroke', d => hoveredVenue === venueKey(d) ? '#000' : 'none')
      .attr('stroke-width', 2);

    // Add percentage labels
    bars.append('text')
      .attr('x', d => {
        const change = getChange(d);
        const barEnd = change >= 0 
          ? xScale(0) + Math.abs(xScale(change) - xScale(0))
          : xScale(change);
        // Position inside bar if it's wide enough, otherwise outside
        const barWidth = Math.abs(xScale(change) - xScale(0));
        if (barWidth > 40) {
          return change >= 0 ? barEnd - 5 : barEnd + 5;
        }
        return change >= 0 ? barEnd + 5 : barEnd - 5;
      })
      .attr('y', d => yScale(`${d.venue_type[0]}#${d.venue_id}`) + yScale.bandwidth() / 2 + 4)
      .attr('text-anchor', d => {
        const barWidth = Math.abs(xScale(getChange(d)) - xScale(0));
        if (barWidth > 40) {
          return getChange(d) >= 0 ? 'end' : 'start';
        }
        return getChange(d) >= 0 ? 'start' : 'end';
      })
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', d => {
        const barWidth = Math.abs(xScale(getChange(d)) - xScale(0));
        return barWidth > 40 ? '#fff' : colorScale(d);
      })
      .text(d => {
        const change = getChange(d);
        return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
      });

    // Y axis (venue labels)
    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .attr('font-size', '11px');

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d => `${d}%`))
      .selectAll('text')
      .attr('font-size', '10px');

    // X axis label
    const axisLabel = metric === 'checkin_count' ? 'Visits Change (%)' : 'Spending Change (%)';
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#666')
      .text(axisLabel);

    // Add tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'business-trend-tooltip')
      .style('position', 'absolute')
      .style('background', 'white')
      .style('border', '1px solid #ddd')
      .style('border-radius', '4px')
      .style('padding', '10px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000);

    bars.on('mouseover', (event, d) => {
      if (onHoverVenue) onHoverVenue(venueKey(d));
      tooltip
        .style('opacity', 1)
        .html(`
          <strong>${d.venue_type} #${d.venue_id}</strong><br/>
          <span style="color: ${colorScale(d)}; font-weight: bold;">
            ${d.trend === 'prospering' ? 'Prospering' : 'Struggling'}
          </span><br/>
          <hr style="margin: 5px 0"/>
          <strong>Revenue:</strong> $${d.total_spending.toLocaleString()}<br/>
          First half: $${d.first_half_spending.toLocaleString()}<br/>
          Second half: $${d.second_half_spending.toLocaleString()}<br/>
          Change: <span style="color: ${colorScale(d)}">${d.spending_change >= 0 ? '+' : ''}$${d.spending_change.toLocaleString()} (${d.spending_pct_change > 0 ? '+' : ''}${d.spending_pct_change}%)</span><br/>
          <hr style="margin: 5px 0"/>
          <strong>Visits:</strong> ${d.total_visits.toLocaleString()}<br/>
          First half: ${d.first_half_visits.toLocaleString()}<br/>
          Second half: ${d.second_half_visits.toLocaleString()}<br/>
          Change: <span style="color: ${d.visits_change >= 0 ? '#10b981' : '#ef4444'}">${d.visits_change >= 0 ? '+' : ''}${d.visits_change} (${d.visits_pct_change > 0 ? '+' : ''}${d.visits_pct_change}%)</span>
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mousemove', (event) => {
      tooltip
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', () => {
      if (onHoverVenue) onHoverVenue(null);
      tooltip.style('opacity', 0);
    });

    // Cleanup tooltip on unmount
    return () => {
      d3.selectAll('.business-trend-tooltip').remove();
    };

  }, [data, sortBy, metric, topN, hoveredVenue, onHoverVenue]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading trends...</div>;
  }

  if (!data.venues || !data.venues.length) {
    return <div className="flex items-center justify-center h-64 text-gray-500">No data available</div>;
  }

  // Summary stats based on selected metric
  const getChangeValue = v => metric === 'checkin_count' ? (v.visits_pct_change || 0) : (v.spending_pct_change || 0);
  const prosperingCount = data.venues.filter(v => getChangeValue(v) >= 0).length;
  const strugglingCount = data.venues.filter(v => getChangeValue(v) < 0).length;
  const metricLabel = metric === 'checkin_count' ? 'visits' : 'spending';

  return (
    <div>
      {/* Period info and summary */}
      {data.period_info && (
        <div className="mb-2 text-sm text-gray-600">
          Comparing {metricLabel}: <strong>{data.period_info.first_half_label}</strong> vs <strong>{data.period_info.second_half_label}</strong>
          <span className="ml-4">
            <span className="text-green-600 font-semibold">{prosperingCount} prospering</span>
            {' | '}
            <span className="text-red-600 font-semibold">{strugglingCount} struggling</span>
          </span>
        </div>
      )}

      <svg ref={svgRef}></svg>
    </div>
  );
}

export default BusinessTrends;

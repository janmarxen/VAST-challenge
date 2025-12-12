import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';

/**
 * Turnover Rate vs Average Tenure Scatterplot
 * Identifies instability hotspots with brush selection
 */
function TurnoverScatterplot({ selectedEmployer, onEmployerSelect, onBrush, onMonthChange, highlightedEmployers, onBrushSelection, month = '2022-03' }) {
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(month);

  // Fetch and combine turnover + tenure data
  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get('/api/employers/turnover-heatmap'),
      axios.get('/api/employers/tenure')
    ])
      .then(([turnoverRes, tenureRes]) => {
        // Handle response formats
        let turnoverData = turnoverRes.data;
        if (turnoverData && turnoverData.data) {
          turnoverData = turnoverData.data;
        }
        turnoverData = Array.isArray(turnoverData) ? turnoverData : [];
        
        let tenureData = tenureRes.data;
        if (tenureData && tenureData.data) {
          tenureData = tenureData.data;
        }
        tenureData = Array.isArray(tenureData) ? tenureData : [];
        
        // Filter turnover for selected month
        const monthTurnover = turnoverData.filter(d => d.month === selectedMonth);
        
        // Combine with tenure data
        const combined = monthTurnover.map(t => {
          const tenureRecord = tenureData.find(te => te.employerId === t.employerId);
          return {
            employerId: t.employerId,
            turnoverRate: t.turnoverRate,
            avgTenure: tenureRecord ? tenureRecord.avgTenure : 0,
            hires: t.hires,
            quits: t.quits,
            switches: t.switches
          };
        });
        setData(combined);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        setLoading(false);
      });
  }, [selectedMonth]);

  // Draw scatterplot
  useEffect(() => {
    console.log('[TurnoverScatterplot] Render effect - selectedEmployer:', selectedEmployer, 'highlightedEmployers:', highlightedEmployers);
    if (!Array.isArray(data) || data.length === 0 || !svgRef.current) return;

    try {
      const width = 600;
      const height = 380;
      const margin = { top: 30, right: 30, bottom: 60, left: 70 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Scales
      const xMax = d3.max(data, d => d.avgTenure);
      const yMax = d3.max(data, d => d.turnoverRate);

      const xScale = d3.scaleLinear()
        .domain([0, xMax * 1.1])
        .range([0, innerWidth]);

      const yScale = d3.scaleLinear()
        .domain([0, yMax * 1.1])
        .range([innerHeight, 0]);

      // Instability zone (high turnover + low tenure)
      g.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', innerWidth * 0.4)
        .attr('height', innerHeight * 0.4)
        .attr('fill', '#fecaca')
        .attr('opacity', 0.1)
        .attr('pointer-events', 'none');

      // Stability zone (low turnover + high tenure)
      g.append('rect')
        .attr('x', innerWidth * 0.6)
        .attr('y', innerHeight * 0.6)
        .attr('width', innerWidth * 0.4)
        .attr('height', innerHeight * 0.4)
        .attr('fill', '#86efac')
        .attr('opacity', 0.1)
        .attr('pointer-events', 'none');

      // Zone labels
      g.append('text')
        .attr('x', innerWidth * 0.2)
        .attr('y', innerHeight * 0.2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#dc2626')
        .attr('opacity', 0.3)
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .text('⚠ Instability');

      g.append('text')
        .attr('x', innerWidth * 0.8)
        .attr('y', innerHeight * 0.8)
        .attr('text-anchor', 'middle')
        .attr('fill', '#16a34a')
        .attr('opacity', 0.3)
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .text('✓ Stability');

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .style('font-size', '11px');

      g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 45)
        .attr('text-anchor', 'middle')
        .attr('fill', '#666')
        .attr('font-size', '12px')
        .text('Average Tenure (days)');

      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .style('font-size', '11px');

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -50)
        .attr('text-anchor', 'middle')
        .attr('fill', '#666')
        .attr('font-size', '12px')
        .text('Turnover Rate');

      // Brush setup
      const brush = d3.brush()
        .extent([[0, 0], [innerWidth, innerHeight]])
        .on('end', function(event) {
          if (!event.selection) return;
          const [[x0, y0], [x1, y1]] = event.selection;
          const selected = data.filter(d => {
            const cx = xScale(d.avgTenure);
            const cy = yScale(d.turnoverRate);
            return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
          });
          const selectedIds = selected.map(d => d.employerId);
          // Brush selection overrides single-click selection
          onBrushSelection?.(selectedIds);
          onBrush?.(selectedIds);
          // Clear brush after selection
          g.select('.brush').call(brush.move, null);
        });

      // Add brush overlay AFTER other elements so it's on top
      g.append('g')
        .attr('class', 'brush')
        .call(brush);

      // Circles - Use proper D3 pattern for data updates
      const circles = g.selectAll('.dot').data(data, d => d.employerId);
      
      // Remove exiting circles
      circles.exit().remove();
      
      // Merge enter and update selections
      const circlesWithData = circles.enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('r', 6)
        .style('cursor', 'pointer')
        .merge(circles);
      
      // Apply all attributes to both enter and update selections
      circlesWithData
        .attr('cx', d => xScale(d.avgTenure))
        .attr('cy', d => yScale(d.turnoverRate))
        .attr('fill', d => {
          // Brush selection takes priority (shows as orange)
          if (highlightedEmployers && highlightedEmployers.includes(d.employerId)) return '#ff9500';
          // Single-click selection (shows as black)
          if (selectedEmployer === d.employerId) return '#000';
          // Default coloring by risk category
          if (d.turnoverRate > yMax * 0.6 && d.avgTenure < xMax * 0.4) return '#dc2626'; // Red instability
          if (d.turnoverRate < yMax * 0.3 && d.avgTenure > xMax * 0.6) return '#16a34a'; // Green stability
          return '#3b82f6'; // Blue normal
        })
        .attr('opacity', d => {
          // High opacity for any selection (brush or click)
          if ((highlightedEmployers && highlightedEmployers.includes(d.employerId)) || selectedEmployer === d.employerId) return 0.9;
          // Normal opacity when no selection
          return 0.7;
        })
        .on('click', function(event, d) {
          console.log('[TurnoverScatterplot] Circle clicked:', d.employerId);
          event.stopPropagation();
          onEmployerSelect?.(d.employerId);
        })
        .on('mouseover', function(event, d) {
          setTooltip({
            x: event.pageX,
            y: event.pageY,
            content: {
              employerId: d.employerId,
              turnoverRate: (d.turnoverRate * 100).toFixed(1) + '%',
              avgTenure: d.avgTenure.toFixed(0),
              hires: d.hires,
              quits: d.quits
            }
          });
        })
        .on('mouseout', function() {
          setTooltip(null);
        });

    } catch (error) {
      console.error('Error rendering scatterplot:', error);
    }

  }, [data, selectedEmployer, highlightedEmployers]);

  if (loading) return <div className="text-center py-8 text-gray-500">Loading scatterplot data...</div>;

  return (
    <div className="flex flex-col gap-4">
      {/* Month Toggle */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-gray-700">Month:</label>
        <button
          onClick={() => {
            setSelectedMonth('2022-03');
            onMonthChange?.('2022-03');
          }}
          className={`px-3 py-1 rounded text-xs font-medium transition ${
            selectedMonth === '2022-03'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          March 2022
        </button>
        <button
          onClick={() => {
            setSelectedMonth('2022-04');
            onMonthChange?.('2022-04');
          }}
          className={`px-3 py-1 rounded text-xs font-medium transition ${
            selectedMonth === '2022-04'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          April 2022
        </button>
      </div>

      <div className="relative overflow-x-auto">
        <svg ref={svgRef} width={600} height={380} style={{ maxWidth: '100%' }}></svg>
      </div>

      {tooltip && (
        <div
          className="absolute z-50 bg-gray-900 text-white text-xs p-2 rounded shadow-lg pointer-events-none"
          style={{ left: tooltip.x + 10, top: tooltip.y - 80 }}
        >
          <div className="font-semibold">Employer #{tooltip.content.employerId}</div>
          <div>Turnover: {tooltip.content.turnoverRate}</div>
          <div>Avg Tenure: {tooltip.content.avgTenure} days</div>
          <div>Hires: {tooltip.content.hires}, Quits: {tooltip.content.quits}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-red-50 p-2 rounded border border-red-200">
          <span className="font-semibold text-red-700">⚠ Instability Zone:</span> High turnover + low tenure
        </div>
        <div className="bg-green-50 p-2 rounded border border-green-200">
          <span className="font-semibold text-green-700">✓ Stability Zone:</span> Low turnover + high tenure
        </div>
      </div>

      <p className="text-xs text-gray-600 text-center">
        Drag to select multiple employers. Click an employer to highlight it. Month toggle syncs with Turnover Ranking.
      </p>
    </div>
  );
}

export default TurnoverScatterplot;

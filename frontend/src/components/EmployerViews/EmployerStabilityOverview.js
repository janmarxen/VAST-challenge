import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';

/**
 * Employer Stability Overview
 * Bubble scatter with corrected thresholds and scales
 */
function EmployerStabilityOverview({ selectedEmployer, onEmployerSelect, highlightedEmployers, onBrushSelection, selectedMonth = '2022-03' }) {
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);

  // Fetch and combine data
  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get('/api/employers/turnover-heatmap', {
        params: { month: selectedMonth, fill_missing: true }
      }),
      axios.get('/api/employers/tenure'),
      axios.get('/api/employers/employee-counts')
    ])
      .then(([turnoverRes, tenureRes, countsRes]) => {
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

        let countsData = countsRes.data;
        if (countsData && countsData.data) {
          countsData = countsData.data;
        }
        countsData = Array.isArray(countsData) ? countsData : [];
        
        // Backend is month-scoped when month is provided; keep fallback filter for safety.
        const monthTurnover = turnoverData.filter(d => d.month === selectedMonth);
        
        // Calculate average headcount per employer from selected month
        const monthCounts = countsData.filter(d => d.month === selectedMonth);
        const headcountByEmployer = {};
        monthCounts.forEach(d => {
          if (!headcountByEmployer[d.employerId]) {
            headcountByEmployer[d.employerId] = [];
          }
          headcountByEmployer[d.employerId].push(d.employeeCount);
        });

        // Combine data with percentage-based thresholds
        const combined = monthTurnover.map(t => {
          const tenureRecord = tenureData.find(te => te.employerId === t.employerId);
          const counts = headcountByEmployer[t.employerId] || [];
          const avgHeadcount = counts.length > 0 
            ? counts.reduce((a, b) => a + b, 0) / counts.length 
            : 0;

          // Convert turnover fraction to percentage
          const turnoverPct = t.turnoverRate * 100;

          // Determine stability category with percentage-based thresholds
          let stability = 'Normal';
          // Adjusted thresholds based on data distribution (high turnover environment)
          // High Risk: > 45% monthly turnover AND < 120 days tenure
          // Stable: < 45% monthly turnover AND > 200 days tenure
          if (turnoverPct > 45 && tenureRecord && tenureRecord.avgTenure < 120) {
            stability = 'High Risk';
          } else if (turnoverPct < 45 && tenureRecord && tenureRecord.avgTenure > 200) {
            stability = 'Stable';
          }

          return {
            employerId: t.employerId,
            turnoverRate: t.turnoverRate, // Keep original fraction for calculations
            turnoverPct: turnoverPct, // Percentage for plotting
            avgTenure: tenureRecord ? tenureRecord.avgTenure : 0,
            headcount: avgHeadcount,
            stability: stability,
            hires: t.hires,
            quits: t.quits,
            minHeadcount: counts.length > 0 ? Math.min(...counts) : 0,
            maxHeadcount: counts.length > 0 ? Math.max(...counts) : 0
          };
        }).filter(d => d.avgTenure > 0); // Only include employers with tenure data

        setData(combined);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching stability data:', error);
        setLoading(false);
      });
  }, [selectedMonth]);

  // Draw bubble scatter
  useEffect(() => {
    console.log('[EmployerStabilityOverview] Render effect - selectedEmployer:', selectedEmployer, 'highlightedEmployers:', highlightedEmployers);
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

      // Scales - using PERCENTAGE values for turnover
      const xMax = d3.max(data, d => d.turnoverPct);
      const yMin = d3.min(data, d => d.avgTenure);
      const yMax = d3.max(data, d => d.avgTenure);
      
      const xScale = d3.scaleLinear()
        .domain([0, xMax * 1.1])
        .range([0, innerWidth]);

      // NO LOG SCALE - use linear
      const yScale = d3.scaleLinear()
        .domain([0, yMax * 1.1])
        .range([innerHeight, 0]);

      // Bubble size scale - sqrt scale with capped max radius
      const minHeadcount = d3.min(data, d => d.headcount);
      const maxHeadcount = d3.max(data, d => d.headcount);
      const rScale = d3.scaleSqrt()
        .domain([minHeadcount, maxHeadcount])
        .range([3, 18]); // Capped max radius to reduce clutter

      // Color scale by stability - muted colors
      const colorScale = d3.scaleOrdinal()
        .domain(['High Risk', 'Normal', 'Stable'])
        .range(['#b74545', '#5b7d99', '#5a9368']); // Muted red, blue, green

      // --- Background Zones ---

      // 1. Stable Zone: turnover < 45%, tenure > 200
      // Rect from x=0 to x=45, y=0 (top) to y=200
      g.append('rect')
        .attr('x', 0)
        .attr('width', xScale(45))
        .attr('y', 0)
        .attr('height', yScale(200))
        .attr('fill', '#22c55e')
        .attr('opacity', 0.08)
        .attr('pointer-events', 'none');

      g.append('text')
        .attr('x', xScale(22.5))
        .attr('y', yScale(200) / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#16a34a')
        .attr('opacity', 0.5)
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text('Stable Zone');

      // 2. High Risk Zone: turnover > 45%, tenure < 120
      // Rect from x=45 to max, y=120 to bottom (0)
      g.append('rect')
        .attr('x', xScale(45))
        .attr('width', innerWidth - xScale(45))
        .attr('y', yScale(120))
        .attr('height', innerHeight - yScale(120))
        .attr('fill', '#ef4444')
        .attr('opacity', 0.08)
        .attr('pointer-events', 'none');

      g.append('text')
        .attr('x', xScale(45) + (innerWidth - xScale(45)) / 2)
        .attr('y', yScale(120) + (innerHeight - yScale(120)) / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#b91c1c')
        .attr('opacity', 0.5)
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text('High Risk Zone');

      // Store jittered coordinates for each bubble (±3 px max)
      const jitteredData = data.map(d => ({
        ...d,
        xJitter: xScale(d.turnoverPct) + (Math.random() - 0.5) * 6,
        yJitter: yScale(d.avgTenure) + (Math.random() - 0.5) * 6
      }));

      // Add click-outside handler to clear brush
      g.append('rect')
        .attr('class', 'background-click')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', innerWidth)
        .attr('height', innerHeight)
        .attr('fill', 'none')
        .attr('pointer-events', 'all')
        .style('cursor', 'default')
        .on('click', function(event) {
          // Only clear if clicking outside brush area (let brush handle its own clicks)
          if (event.target.classList.contains('background-click')) {
            onBrushSelection?.([]);
            // Clear brush UI
            g.select('.brush').call(brush.move, null);
          }
        });

      // Brush setup - use stored jittered coordinates
      const brush = d3.brush()
        .extent([[0, 0], [innerWidth, innerHeight]])
        .on('end', function(event) {
          if (!event.selection) return;
          const [[x0, y0], [x1, y1]] = event.selection;
          const selected = jitteredData.filter(d => {
            return d.xJitter >= x0 && d.xJitter <= x1 && d.yJitter >= y0 && d.yJitter <= y1;
          });
          const selectedIds = selected.map(d => d.employerId);
          onBrushSelection?.(selectedIds);
          // Clear brush after selection
          g.select('.brush').call(brush.move, null);
        });

      // Add brush overlay
      g.append('g')
        .attr('class', 'brush')
        .call(brush);

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
        .text(`Turnover Rate (${selectedMonth})`);

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
        .text('Average Tenure (days)');

      // Bubbles with stored jitter coordinates
      // Bubbles - Use proper D3 pattern for data updates
      const bubbles = g.selectAll('.bubble').data(jitteredData, d => d.employerId);
      
      // Remove exiting bubbles
      bubbles.exit().remove();
      
      // Merge enter and update selections
      const bubblesWithData = bubbles.enter()
        .append('circle')
        .attr('class', 'bubble')
        .attr('stroke', '#999')
        .attr('stroke-width', 0.5)
        .style('cursor', 'pointer')
        .merge(bubbles);
      
      // Apply all attributes to both enter and update selections
      bubblesWithData
        .attr('cx', d => d.xJitter)
        .attr('cy', d => d.yJitter)
        .attr('r', d => rScale(d.headcount))
        .attr('fill', d => {
          // Brush selection takes priority (shows as orange)
          if (highlightedEmployers && highlightedEmployers.includes(d.employerId)) return '#ff9500';
          // Single-click selection (shows as black)
          if (selectedEmployer === d.employerId) return '#000';
          return colorScale(d.stability);
        })
        .attr('opacity', d => {
          // High opacity for selections
          if ((highlightedEmployers && highlightedEmployers.includes(d.employerId)) || selectedEmployer === d.employerId) {
            return 0.85;
          }
          return 0.65; // Reduced from 0.75 for less visual clutter
        })
        .on('click', function(event, d) {
          console.log('[EmployerStabilityOverview] Bubble clicked:', d.employerId);
          event.stopPropagation();
          onEmployerSelect?.(d.employerId);
        })
        .on('mouseover', function(event, d) {
          setTooltip({
            x: event.pageX,
            y: event.pageY,
            content: {
              employerId: d.employerId,
              turnover: d.turnoverPct.toFixed(1) + '%',
              avgTenure: d.avgTenure.toFixed(0),
              headcount: Math.round(d.headcount),
              stability: d.stability,
              hires: d.hires,
              quits: d.quits
            }
          });
        })
        .on('mouseout', function() {
          setTooltip(null);
        });
      
      // Remove exiting bubbles
      bubbles.exit().remove();

      // Legend - positioned to not overlap chart
      const legend = svg.append('g')
        .attr('transform', `translate(${width - 180}, ${margin.top + 10})`);

      // Title for legend
      legend.append('text')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('fill', '#333')
        .text('Legend:');

      // Stability categories
      ['High Risk', 'Normal', 'Stable'].forEach((category, i) => {
        const legendRow = legend.append('g')
          .attr('transform', `translate(0, ${18 + i * 18})`);

        legendRow.append('circle')
          .attr('r', 5)
          .attr('fill', colorScale(category))
          .attr('opacity', 0.65)
          .attr('stroke', '#999')
          .attr('stroke-width', 0.5);

        legendRow.append('text')
          .attr('x', 15)
          .attr('y', 4)
          .attr('font-size', '10px')
          .attr('fill', '#333')
          .text(category);
      });

      // Bubble size legend
      const sizeLegend = svg.append('g')
        .attr('transform', `translate(${width - 180}, ${margin.top + 85})`);

      sizeLegend.append('text')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('fill', '#333')
        .text('Bubble size =');

      sizeLegend.append('text')
        .attr('y', 12)
        .attr('font-size', '9px')
        .attr('fill', '#666')
        .text('Employer headcount');

      // Dynamic legend sizes based on data
      const legendSizes = [
        Math.round(maxHeadcount * 0.2),
        Math.round(maxHeadcount * 0.5),
        Math.round(maxHeadcount)
      ].filter((v, i, a) => a.indexOf(v) === i && v > 0).sort((a, b) => a - b);
      
      // Fallback if data is weird
      if (legendSizes.length === 0) legendSizes.push(Math.max(1, Math.round(maxHeadcount)));

      legendSizes.forEach((size, i) => {
        const sizeRow = sizeLegend.append('g')
          .attr('transform', `translate(0, ${28 + i * 22})`);

        sizeRow.append('circle')
          .attr('r', rScale(size))
          .attr('fill', 'none')
          .attr('stroke', '#999')
          .attr('stroke-width', 0.5);

        sizeRow.append('text')
          .attr('x', rScale(size) + 10)
          .attr('y', 3)
          .attr('font-size', '9px')
          .attr('fill', '#666')
          .text(`${size}`);
      });

    } catch (error) {
      console.error('Error rendering stability overview:', error);
    }

  }, [data, selectedEmployer, highlightedEmployers, selectedMonth]);

  if (loading) return <div className="text-center py-8 text-gray-500">Loading stability data...</div>;

  return (
    <div className="flex flex-col gap-4">
      {/* Header with description */}
      <div className="bg-indigo-50 border-l-4 border-indigo-400 p-2 rounded">
        <h3 className="font-semibold text-indigo-900 text-xs">Employer Stability Overview</h3>
        <p className="text-xs text-indigo-800 mt-0.5">
          Multi-dimensional view: bubble size = headcount, position = turnover/tenure, color = stability category.
        </p>
      </div>

      {/* Spacer to align with month toggle in TurnoverScatterplot */}
      <div className="h-10"></div>

      <div className="relative overflow-x-auto">
        <svg ref={svgRef} width={600} height={380} style={{ maxWidth: '100%', border: '1px solid #e5e7eb' }}></svg>
      </div>

      {tooltip && (
        <div
          className="absolute z-50 bg-gray-900 text-white text-xs p-2 rounded shadow-lg pointer-events-none"
          style={{ left: tooltip.x + 10, top: tooltip.y - 80 }}
        >
          <div className="font-semibold">Employer #{tooltip.content.employerId}</div>
          <div>Stability: <span className={
            tooltip.content.stability === 'Stable' ? 'text-green-400' :
            tooltip.content.stability === 'High Risk' ? 'text-red-400' :
            'text-blue-400'
          }>{tooltip.content.stability}</span></div>
          <div>Turnover: {tooltip.content.turnover}</div>
          <div>Avg Tenure: {tooltip.content.avgTenure} days</div>
          <div>Avg Headcount: {tooltip.content.headcount}</div>
          <div>Hires: {tooltip.content.hires}, Quits: {tooltip.content.quits}</div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-[10px] mt-2">
        <div className="bg-red-50 p-1.5 rounded border border-red-200 leading-tight">
          <span className="font-bold text-red-700 block mb-0.5">🔴 High Risk</span>
          Turnover &gt; 45%<br/>Tenure &lt; 120d
        </div>
        <div className="bg-blue-50 p-1.5 rounded border border-blue-200 leading-tight">
          <span className="font-bold text-blue-700 block mb-0.5">🔵 Normal</span>
          Between thresholds
        </div>
        <div className="bg-green-50 p-1.5 rounded border border-green-200 leading-tight">
          <span className="font-bold text-green-700 block mb-0.5">🟢 Stable</span>
          Turnover &lt; 45%<br/>Tenure &gt; 200d
        </div>
      </div>
    </div>
  );
}

export default EmployerStabilityOverview;

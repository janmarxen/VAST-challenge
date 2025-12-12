import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';

/**
 * Employee Counts Time Series
 * Shows workforce size trends - only days where employee count changed
 * Uses step-line chart with top 10 employers by default
 * Independent line selection: click lines to toggle, separate from brush context
 * Colors: neutral gray default, blue for brush, orange for click selection
 */
function EmployeeCountsTimeSeries({ selectedEmployer, brushedEmployers, highlightedEmployers }) {
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const [clickSelectedLines, setClickSelectedLines] = useState(new Set()); // Independent click selection
  const [displayCount, setDisplayCount] = useState(5); // Default to top 5

  // Fetch employee counts data
  useEffect(() => {
    setLoading(true);
    axios.get('/api/employers/employee-counts')
      .then(response => {
        // Handle response format
        let employeeData = response.data;
        if (employeeData && employeeData.data) {
          employeeData = employeeData.data;
        }
        employeeData = Array.isArray(employeeData) ? employeeData : [];
        
        // Filter for March-April 2022 only
        const marchAprilData = employeeData.filter(d => {
          const month = d.month || d.date?.substring(0, 7);
          return month === '2022-03' || month === '2022-04';
        });
        
        // Parse dates and sort
        const withDates = marchAprilData.map(d => ({
          ...d,
          date: new Date(d.date)
        })).sort((a, b) => a.date - b.date);

        // Filter to only days where count changed
        const filteredData = [];
        const countByEmployer = {};

        withDates.forEach(d => {
          if (!countByEmployer[d.employerId]) {
            countByEmployer[d.employerId] = null;
          }
          
          if (countByEmployer[d.employerId] !== d.employeeCount) {
            countByEmployer[d.employerId] = d.employeeCount;
            filteredData.push(d);
          }
        });
        
        setData(filteredData);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching employee counts:', error);
        setLoading(false);
      });
  }, []);

  // Update selected lines based on highlighted employers from brush
  useEffect(() => {
    // Note: clickSelectedLines is separate from brush - doesn't get cleared
    // This allows independent line clicking even during brush selection
  }, []);

  // Handle deselecting lines when displayCount changes (if line not in new view)
  useEffect(() => {
    if (!brushedEmployers?.length && !selectedEmployer && clickSelectedLines.size > 0) {
      // Calculate which employers are shown at current displayCount
      const avgHeadcountByEmployer = {};
      data.forEach(d => {
        if (!avgHeadcountByEmployer[d.employerId]) {
          avgHeadcountByEmployer[d.employerId] = [];
        }
        avgHeadcountByEmployer[d.employerId].push(d.employeeCount);
      });
      
      const visibleEmployers = Object.entries(avgHeadcountByEmployer)
        .map(([id, counts]) => ({
          id: parseInt(id),
          avg: counts.reduce((a, b) => a + b, 0) / counts.length
        }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, displayCount)
        .map(e => e.id);
      
      // Remove selected lines that are no longer visible
      const newSelected = new Set(
        Array.from(clickSelectedLines).filter(id => visibleEmployers.includes(id))
      );
      
      if (newSelected.size !== clickSelectedLines.size) {
        setClickSelectedLines(newSelected);
      }
    }
  }, [displayCount, data, clickSelectedLines, brushedEmployers, selectedEmployer]);

  // Draw time series
  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0 || !svgRef.current) return;

    try {
      const width = 700;
      const height = 320;
      const margin = { top: 30, right: 200, bottom: 60, left: 70 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      // Determine which employers to display
      // Priority: brush selection > single-click > top 10
      let displayEmployers = [];
      let plotData = [];

      if (brushedEmployers && brushedEmployers.length > 0) {
        // Brush selection takes priority
        displayEmployers = brushedEmployers;
        plotData = data.filter(d => brushedEmployers.includes(d.employerId));
      } else if (selectedEmployer) {
        displayEmployers = [selectedEmployer];
        plotData = data.filter(d => d.employerId === selectedEmployer);
      } else {
        // Show top 5 employers by headcount (average count across all days) - changed from 10
        const avgHeadcountByEmployer = {};
        data.forEach(d => {
          if (!avgHeadcountByEmployer[d.employerId]) {
            avgHeadcountByEmployer[d.employerId] = [];
          }
          avgHeadcountByEmployer[d.employerId].push(d.employeeCount);
        });
        
        const topEmployers = Object.entries(avgHeadcountByEmployer)
          .map(([id, counts]) => ({
            id: parseInt(id),
            avg: counts.reduce((a, b) => a + b, 0) / counts.length
          }))
          .sort((a, b) => b.avg - a.avg)
          .slice(0, displayCount)
          .map(e => e.id);
        
        displayEmployers = topEmployers;
        plotData = data.filter(d => topEmployers.includes(d.employerId));
      }

      if (plotData.length === 0) return;

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Scales
      const dateExtent = d3.extent(plotData, d => d.date);
      
      // Add Feb 28 padding (2 days before March 1)
      const paddedStartDate = new Date(dateExtent[0]);
      paddedStartDate.setDate(paddedStartDate.getDate() - 2);
      
      const countMax = d3.max(plotData, d => d.employeeCount);

      const xScale = d3.scaleTime()
        .domain([paddedStartDate, dateExtent[1]])
        .range([0, innerWidth]);

      const yScale = d3.scaleLinear()
        .domain([0, countMax * 1.1])
        .range([innerHeight, 0]);

      // Color palette for unique colors when no selection is active
      const uniqueColors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
        '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
      ];

      // Map employers to unique colors
      const employerColorMap = {};
      displayEmployers.forEach((id, index) => {
        employerColorMap[id] = uniqueColors[index % uniqueColors.length];
      });

      // Single neutral color scale - all lines start gray
      const defaultColor = '#888';
      const brushColor = '#3b82f6';
      const clickColor = '#ff9500';

      // Step-line generator (no jitter - removed for clarity)
      const line = d3.line()
        .curve(d3.curveStepAfter)
        .x(d => xScale(d.date))
        .y(d => yScale(d.employeeCount));

      // Group data by employer
      const groupedData = d3.group(plotData, d => d.employerId);

      // Helper function to determine line color and opacity
      const getLineColor = (employerId) => {
        if (clickSelectedLines.has(employerId)) {
          return clickColor; // Orange for click selection
        }
        if (brushedEmployers && brushedEmployers.includes(employerId)) {
          return brushColor; // Blue for brush selection
        }
        // If there's any click selection or brush, use gray for non-selected
        if ((clickSelectedLines.size > 0 || (brushedEmployers && brushedEmployers.length > 0)) && !selectedEmployer) {
          return defaultColor;
        }
        // When no selection active, use unique colors
        return employerColorMap[employerId] || defaultColor;
      };

      const getLineOpacity = (employerId) => {
        if (clickSelectedLines.size > 0) {
          // If user has clicked any lines, only those are opaque, others very faint
          return clickSelectedLines.has(employerId) ? 1 : 0.1;
        }
        // If brush or highlighted, show normally
        if ((brushedEmployers && brushedEmployers.includes(employerId)) || 
            (highlightedEmployers && highlightedEmployers.includes(employerId))) {
          return 1;
        }
        // Normal opacity when no selection
        return 1;
      };

      // Draw lines with new color scheme
      const lineElements = [];
      groupedData.forEach((values, employerId) => {
        const pathElement = g.append('path')
          .datum(values.sort((a, b) => a.date - b.date))
          .attr('class', `line-${employerId}`)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', getLineColor(employerId))
          .attr('stroke-width', 3.5)
          .attr('opacity', getLineOpacity(employerId))
          .style('cursor', 'pointer')
          .on('click', function(event) {
            event.stopPropagation();
            // Allow line selection independent from brush context
            const newSelected = new Set(clickSelectedLines);
            if (newSelected.has(employerId)) {
              newSelected.delete(employerId);
            } else {
              newSelected.add(employerId);
            }
            setClickSelectedLines(newSelected);
          });
        
        lineElements.push({ employerId, pathElement });
      });

      // Draw circles for interaction points (only on change points)
      g.selectAll('.dot')
        .data(plotData)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.date))
        .attr('cy', d => yScale(d.employeeCount))
        .attr('r', 4)
        .attr('fill', d => getLineColor(d.employerId))
        .attr('opacity', d => getLineOpacity(d.employerId))
        .style('cursor', 'pointer')
        .on('click', function(event, d) {
          event.stopPropagation();
          // Allow line selection independent from brush context
          const newSelected = new Set(clickSelectedLines);
          if (newSelected.has(d.employerId)) {
            newSelected.delete(d.employerId);
          } else {
            newSelected.add(d.employerId);
          }
          setClickSelectedLines(newSelected);
        })
        .on('mouseover', function(event, d) {
          setTooltip({
            x: event.pageX,
            y: event.pageY,
            content: {
              employerId: d.employerId,
              date: d.date.toLocaleDateString(),
              count: d.employeeCount
            }
          });
        })
        .on('mouseout', function() {
          setTooltip(null);
        });

      // X Axis
      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(10).tickFormat(d3.timeFormat('%b %d')))
        .style('font-size', '11px')
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');

      g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 50)
        .attr('text-anchor', 'middle')
        .attr('fill', '#666')
        .attr('font-size', '12px')
        .text('Date (March - April 2022, change points only)');

      // Y Axis
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
        .text('Employee Count');

      // Add end labels for click-selected lines
      if (clickSelectedLines.size > 0) {
        groupedData.forEach((values, employerId) => {
          if (clickSelectedLines.has(employerId)) {
            const lastPoint = values.sort((a, b) => a.date - b.date)[values.length - 1];
            if (lastPoint) {
              const labelX = xScale(lastPoint.date) + 8;
              const labelY = yScale(lastPoint.employeeCount) - 5;
              
              g.append('text')
                .attr('x', labelX)
                .attr('y', labelY)
                .attr('font-size', '10px')
                .attr('font-weight', 'bold')
                .attr('fill', clickColor)
                .text(`Emp ${employerId} (${lastPoint.employeeCount})`);
            }
          }
        });
      }

      // Legend - positioned on the right to avoid overlap
      const legendX = innerWidth + 40;
      const legendY = 0;
      const maxLegendItems = 10;
      const displayLegendEmployers = displayEmployers.slice(0, maxLegendItems);

      const legendItems = g.selectAll('.legend-item')
        .data(displayLegendEmployers)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(${legendX},${legendY + i * 18})`)
        .style('cursor', 'pointer');

      legendItems.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', d => getLineColor(d))
        .attr('opacity', 1);

      legendItems.append('text')
        .attr('x', 18)
        .attr('y', 10)
        .attr('font-size', '10px')
        .text(d => `Emp ${d}`)
        .attr('opacity', 1);

      legendItems.on('click', function(event, d) {
        event.stopPropagation();
        const newSelected = new Set(clickSelectedLines);
        if (newSelected.has(d)) {
          newSelected.delete(d);
        } else {
          newSelected.add(d);
        }
        setClickSelectedLines(newSelected);
      });

    } catch (error) {
      console.error('Error rendering time series:', error);
    }

  }, [data, selectedEmployer, brushedEmployers, clickSelectedLines, highlightedEmployers, displayCount]);

  if (loading) return <div className="text-center py-8 text-gray-500">Loading employee count data...</div>;

  return (
    <div className="flex flex-col gap-4">
      {/* Display count buttons - similar to TurnoverScatterplot */}
      {!selectedEmployer && !brushedEmployers?.length && (
        <div className="flex items-center justify-center gap-2">
          <label className="text-xs font-semibold text-gray-700">Display:</label>
          <button
            onClick={() => setDisplayCount(5)}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              displayCount === 5
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Top 5
          </button>
          <button
            onClick={() => setDisplayCount(10)}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              displayCount === 10
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Top 10
          </button>
        </div>
      )}

      <div className="relative overflow-x-auto flex justify-center">
        <svg ref={svgRef} width={700} height={320} style={{ maxWidth: '100%' }}></svg>
      </div>

      {tooltip && (
        <div
          className="absolute z-50 bg-gray-900 text-white text-xs p-2 rounded shadow-lg pointer-events-none"
          style={{ left: tooltip.x + 10, top: tooltip.y - 60 }}
        >
          <div className="font-semibold">Employer #{tooltip.content.employerId}</div>
          <div>{tooltip.content.date}</div>
          <div>Employees: {tooltip.content.count}</div>
        </div>
      )}

      <p className="text-xs text-gray-600 text-center">
        Step-line chart showing only days where employee count changed. 
        <strong>Click a line or legend item to highlight (independent from brush selection).</strong> Brush selection shows in blue, click selection in orange. Grayed-out opacity reduced for non-selected lines.
        {selectedEmployer && ` Showing Employer #${selectedEmployer}.`}
        {brushedEmployers && brushedEmployers.length > 0 && ` Showing ${brushedEmployers.length} selected employers.`}
      </p>
    </div>
  );
}

export default EmployeeCountsTimeSeries;

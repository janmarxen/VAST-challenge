import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';

/**
 * InequalityTimeline
 * Shows Gini coefficient for Income and Savings Rate over time.
 * 
 * The Gini coefficient measures economic inequality:
 * - 0 = perfect equality (everyone has the same)
 * - 1 = perfect inequality (one person has everything)
 */
function InequalityTimeline({ selectedMonth, onMonthSelect }) {
  const containerRef = useRef();
  const svgRef = useRef();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Handle resize
  useEffect(() => {
    const observeTarget = containerRef.current;
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].target.getBoundingClientRect();
      setDimensions({ width, height });
    });

    if (observeTarget) {
      resizeObserver.observe(observeTarget);
    }

    return () => {
      if (observeTarget) resizeObserver.unobserve(observeTarget);
    };
  }, []);

  // Fetch data
  useEffect(() => {
    axios.get('/api/resident/inequality-timeline')
      .then(response => {
        setData(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching inequality data:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Render chart
  useEffect(() => {
    if (!data || dimensions.width === 0 || dimensions.height === 0) return;

    const timeline = data.timeline;
    if (!timeline || timeline.length === 0) return;

    // Parse months and prepare data
    const processedData = timeline
      .filter(d => d.giniIncome !== null && d.giniSavingsRate !== null)
      .map(d => ({
        ...d,
        month: new Date(d.month),
        monthStr: d.month
      }))
      .sort((a, b) => a.month - b.month);

    if (processedData.length === 0) return;

    const margin = { top: 40, right: 140, bottom: 60, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(processedData, d => d.month))
      .range([0, width]);

    // Gini ranges from 0 to 1, but we'll use actual data range with padding
    const allGini = processedData.flatMap(d => [d.giniIncome, d.giniSavingsRate]);
    const yMin = Math.max(0, d3.min(allGini) - 0.02);
    const yMax = Math.min(1, d3.max(allGini) + 0.02);

    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([height, 0]);

    // Colors
    const incomeColor = '#3498db';  // Blue
    const savingsColor = '#e74c3c'; // Red

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat('')
      );

    // Axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(d3.timeMonth.every(2))
      .tickFormat(d3.timeFormat('%b %Y'));

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => d.toFixed(2));

    g.append('g')
      .call(yAxis);

    // Y-axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -45)
      .attr('x', -height / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#666')
      .text('Gini Coefficient');

    // Line generators
    const lineIncome = d3.line()
      .x(d => xScale(d.month))
      .y(d => yScale(d.giniIncome))
      .curve(d3.curveMonotoneX);

    const lineSavings = d3.line()
      .x(d => xScale(d.month))
      .y(d => yScale(d.giniSavingsRate))
      .curve(d3.curveMonotoneX);

    // Draw lines
    g.append('path')
      .datum(processedData)
      .attr('fill', 'none')
      .attr('stroke', incomeColor)
      .attr('stroke-width', 2.5)
      .attr('d', lineIncome);

    g.append('path')
      .datum(processedData)
      .attr('fill', 'none')
      .attr('stroke', savingsColor)
      .attr('stroke-width', 2.5)
      .attr('d', lineSavings);

    // Draw points
    g.selectAll('.dot-income')
      .data(processedData)
      .enter()
      .append('circle')
      .attr('class', 'dot-income')
      .attr('cx', d => xScale(d.month))
      .attr('cy', d => yScale(d.giniIncome))
      .attr('r', 4)
      .attr('fill', incomeColor)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);

    g.selectAll('.dot-savings')
      .data(processedData)
      .enter()
      .append('circle')
      .attr('class', 'dot-savings')
      .attr('cx', d => xScale(d.month))
      .attr('cy', d => yScale(d.giniSavingsRate))
      .attr('r', 4)
      .attr('fill', savingsColor)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);

    // Highlight selected month
    if (selectedMonth) {
      const selectedData = processedData.find(d => d.monthStr === selectedMonth);
      if (selectedData) {
        const xPos = xScale(selectedData.month);
        
        g.append('line')
          .attr('x1', xPos)
          .attr('x2', xPos)
          .attr('y1', 0)
          .attr('y2', height)
          .attr('stroke', '#2c3e50')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '4,4')
          .attr('opacity', 0.7);
      }
    }

    // Legend
    const legend = g.append('g')
      .attr('transform', `translate(${width + 15}, 0)`);

    const legendItems = [
      { label: 'Income Gini', color: incomeColor },
      { label: 'Savings Gini', color: savingsColor }
    ];

    legendItems.forEach((item, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 22})`);

      legendRow.append('line')
        .attr('x1', 0)
        .attr('x2', 20)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', item.color)
        .attr('stroke-width', 2.5);

      legendRow.append('circle')
        .attr('cx', 10)
        .attr('cy', 0)
        .attr('r', 4)
        .attr('fill', item.color);

      legendRow.append('text')
        .attr('x', 28)
        .attr('y', 4)
        .style('font-size', '11px')
        .style('fill', '#333')
        .text(item.label);
    });

    // Reference line for "moderate inequality" at 0.3-0.4 range
    const referenceY = yScale(0.35);
    if (referenceY >= 0 && referenceY <= height) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', referenceY)
        .attr('y2', referenceY)
        .attr('stroke', '#95a5a6')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.6);

      g.append('text')
        .attr('x', width - 5)
        .attr('y', referenceY - 5)
        .attr('text-anchor', 'end')
        .style('font-size', '10px')
        .style('fill', '#95a5a6')
        .text('Moderate inequality');
    }

    // Title
    svg.append('text')
      .attr('x', margin.left + width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('fill', '#333')
      .text('Income & Savings Inequality Over Time');

    // Tooltip
    const tooltip = d3.select(containerRef.current)
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(255,255,255,0.95)')
      .style('border', '1px solid #ddd')
      .style('border-radius', '4px')
      .style('padding', '8px 12px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)');

    // Invisible overlay for hover
    g.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mousemove', function(event) {
        const [mx] = d3.pointer(event);
        const xDate = xScale.invert(mx);
        
        // Find closest data point
        const bisect = d3.bisector(d => d.month).left;
        const idx = bisect(processedData, xDate, 1);
        const d0 = processedData[idx - 1];
        const d1 = processedData[idx];
        const closest = d1 && (xDate - d0.month > d1.month - xDate) ? d1 : d0;

        if (closest) {
          const xPos = xScale(closest.month);
          
          tooltip
            .style('opacity', 1)
            .style('left', `${margin.left + xPos + 15}px`)
            .style('top', `${margin.top + 20}px`)
            .html(`
              <strong>${d3.timeFormat('%B %Y')(closest.month)}</strong><br/>
              <span style="color:${incomeColor}">●</span> Income Gini: <strong>${closest.giniIncome.toFixed(3)}</strong><br/>
              <span style="color:${savingsColor}">●</span> Savings Gini: <strong>${closest.giniSavingsRate.toFixed(3)}</strong><br/>
              <span style="color:#666">Sample: ${closest.sampleSize.toLocaleString()}</span>
            `);
        }
      })
      .on('mouseout', function() {
        tooltip.style('opacity', 0);
      })
      .on('click', function(event) {
        const [mx] = d3.pointer(event);
        const xDate = xScale.invert(mx);
        const bisect = d3.bisector(d => d.month).left;
        const idx = bisect(processedData, xDate, 1);
        const d0 = processedData[idx - 1];
        const d1 = processedData[idx];
        const closest = d1 && (xDate - d0.month > d1.month - xDate) ? d1 : d0;
        
        if (closest && onMonthSelect) {
          onMonthSelect(closest.monthStr);
        }
      });

    return () => {
      tooltip.remove();
    };

  }, [data, dimensions, selectedMonth, onMonthSelect]);

  if (loading) {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center">
        <div className="text-gray-500">Loading inequality data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ overflow: 'visible' }}
      />
      {/* Formula explanation */}
      <div className="absolute bottom-1 left-16 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded">
        Gini: G = (2·Σi·yᵢ)/(n·Σyᵢ) − (n+1)/n where yᵢ sorted; 0=equal, 1=unequal
      </div>
    </div>
  );
}

export default InequalityTimeline;

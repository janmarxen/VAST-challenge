import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { fetchWageVsCost } from '../../../utils/api';
import { CLUSTER_COLOR_RANGE, getSortedClusterDomain } from '../colorHelpers';

/**
 * Wage vs Cost of Living Scatter Plot
 * Shows relationship between wages and living costs
 */
function WageVsCostScatter({ onFilter, filterHaveKids, selectedMonth, selectedIds }) {
  const containerRef = useRef();
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const colorScaleRef = useRef(d3.scaleOrdinal(CLUSTER_COLOR_RANGE));

  // Handle resize
  useEffect(() => {
    const observeTarget = containerRef.current;
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      const rect = entries[0].target.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    });

    if (observeTarget) {
      resizeObserver.observe(observeTarget);
    }

    return () => {
      if (observeTarget) resizeObserver.unobserve(observeTarget);
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    // Pass parameters as an object
    fetchWageVsCost({ month: selectedMonth })
      .then(response => {
        setData(response);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching wage vs cost data:', error);
        setLoading(false);
      });
  }, [selectedMonth]);

  useEffect(() => {
    if (!data.length) return;
    const domain = getSortedClusterDomain(data.map(d => d.Cluster));
    colorScaleRef.current.domain(domain);
  }, [data]);

  useEffect(() => {
    if (!data.length || dimensions.width === 0 || dimensions.height === 0) return;

    const margin = { top: 30, right: 30, bottom: 90, left: 80 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    // User requested capping Cost of Living at ~4000 AND filtering data
    const xMax = 4000; 
    
    // Filter data points that exceed the xMax
    const filteredData = data.filter(d => d.CostOfLiving <= xMax);
    
    const yExtent = d3.extent(filteredData, d => d.Income);
    const yMax = yExtent[1] || 0;

    const xScale = d3.scaleLinear()
      .domain([0, xMax])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, yMax * 1.1])
      .range([height, 0]);

    const colorScale = colorScaleRef.current;

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(width > 400 ? 10 : 5));

    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 40)
      .attr('text-anchor', 'middle')
      .text('Avg Monthly Cost of Living ($)')
      .style('font-size', '12px')
      .style('fill', '#4b5563');

    g.append('g')
      .call(d3.axisLeft(yScale));

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .text('Avg Monthly Income ($)')
      .style('font-size', '12px')
      .style('fill', '#4b5563');

    // Survival Line (y=x)
    // We draw it up to the min of xMax or yMax to stay within view
    const breakEvenEnd = Math.min(xMax, yMax * 1.1);
    
    g.append('line')
      .attr('x1', xScale(0))
      .attr('y1', yScale(0))
      .attr('x2', xScale(breakEvenEnd))
      .attr('y2', yScale(breakEvenEnd))
      .attr('stroke', '#ef4444')
      .attr('stroke-dasharray', '4')
      .attr('opacity', 0.7);

    g.append('text')
      .attr('x', xScale(breakEvenEnd * 0.9))
      .attr('y', yScale(breakEvenEnd * 0.9) - 10)
      .text('Break-even')
      .attr('fill', '#ef4444')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold');

    // Points
    const circles = g.selectAll('circle')
      .data(filteredData)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.CostOfLiving))
      .attr('cy', d => yScale(d.Income))
      .attr('r', 4)
      .attr('fill', d => colorScale(d.Cluster))
      .attr('opacity', 0.6)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5);

    // Brush
    const brush = d3.brush()
      .extent([[0, 0], [width, height]])
      .on('end', brushed);

    g.append('g')
      .call(brush);

    function brushed(event) {
      if (!event.selection) {
        if (onFilter) onFilter(null); // Reset filter
        return;
      }

      const [[x0, y0], [x1, y1]] = event.selection;
      
      const selectedIds = [];
      // Calculate selected IDs but don't update DOM directly
      // Let the useEffect handle the visual update via selectedIds prop
      filteredData.forEach(d => {
        const x = xScale(d.CostOfLiving);
        const y = yScale(d.Income);
        const isSelected = x >= x0 && x <= x1 && y >= y0 && y <= y1;
        if (isSelected) selectedIds.push(d.participantId);
      });

      if (onFilter) onFilter(selectedIds);
    }

  }, [data, onFilter, dimensions]);

  // Handle filterHaveKids changes by updating the selection
  useEffect(() => {
    if (!data.length) return;
    
    // Only trigger if filterHaveKids is actively set or unset
    // We don't want to override manual brushing unless the filter changes
    if (filterHaveKids === null) {
       // If we just cleared the filter, we might want to clear selection
       // But we should be careful not to clear manual brush if filter didn't change
       // This effect runs when filterHaveKids changes.
       // If it changes to null, we clear.
       onFilter(null);
    } else {
       const ids = data.filter(d => d.haveKids === filterHaveKids).map(d => d.participantId);
       onFilter(ids);
    }
  }, [filterHaveKids, data]); // Removed onFilter from deps to avoid loops if onFilter is unstable, but it should be fine.

  // Handle visual updates based on selectedIds (from any source)
  useEffect(() => {
    if (!data.length || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const circles = svg.selectAll('circle');
    if (circles.empty()) return;

    const colorScale = colorScaleRef.current;

    if (!selectedIds || selectedIds.length === 0) {
      circles
        .attr('fill', d => colorScale(d.Cluster))
        .attr('opacity', 0.6)
        .attr('r', 4);
      return;
    }

    circles
      .attr('fill', d => {
        const isSelected = selectedIds.includes(d.participantId);
        return isSelected ? colorScale(d.Cluster) : '#e5e7eb';
      })
      .attr('opacity', d => {
        const isSelected = selectedIds.includes(d.participantId);
        return isSelected ? 0.9 : 0.15;
      })
      .attr('r', d => {
        const isSelected = selectedIds.includes(d.participantId);
        return isSelected ? 5 : 3;
      });

  }, [selectedIds, data]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-gray-800">The Living Gap: Income vs Cost</h3>
        <div className="text-xs text-gray-500 italic">
            Drag to select residents
        </div>
      </div>
      <div
            ref={containerRef}
            className="w-full flex-grow"
            style={{ height: "100%" }}
          >
        {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400">Loading data...</div>
        ) : (
            <svg ref={svgRef} width="100%" height="100%" style={{ overflow: 'visible', flex: 1 }} />
        )}
      </div>
    </div>
  );
}

export default WageVsCostScatter;

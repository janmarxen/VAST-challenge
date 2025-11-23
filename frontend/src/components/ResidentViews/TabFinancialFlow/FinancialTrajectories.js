import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { fetchFinancialTrajectories } from '../../../utils/api';
import { EXPENSE_KEYS, EXPENSE_COLOR_MAP } from '../expenditureColors';

/**
 * Financial Health Trajectories
 * Shows financial health over time by demographic segments
 */
function FinancialTrajectories({ filterCluster, selectedMonth }) {
  const containerRef = useRef();
  const svgRef = useRef();
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Handle resize
  useEffect(() => {
    const observeTarget = containerRef.current;
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      // Use getBoundingClientRect for more accurate sizing in flex containers
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

  useEffect(() => {
    fetchFinancialTrajectories()
      .then(response => {
        setRawData(response);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching trajectories:', error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!rawData || dimensions.width === 0 || dimensions.height === 0) return;

    // Determine which dataset to use
    let dataset = rawData.overall;
    if (filterCluster !== null && filterCluster !== undefined) {
        dataset = rawData.by_cluster.filter(d => d.Cluster === filterCluster);
    }

    if (!dataset || dataset.length === 0) return;

    // Process data for Stacked Area
    // Backend returns "wide" format: { month: '2022-03', Shelter: -500, Wage: 3000, ... }
    const processedData = dataset.map(d => {
        const obj = { ...d, month: new Date(d.month) };
        // Ensure all keys exist and are positive for stacking
      EXPENSE_KEYS.forEach(k => {
            obj[k] = Math.abs(d[k] || 0);
        });
        obj.Wage = d.Wage || 0;
        return obj;
    }).sort((a, b) => a.month - b.month);

    const margin = { top: 30, right: 130, bottom: 90, left: 80 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Keys
    const expenseKeys = EXPENSE_KEYS;
    
    // Make expenses positive for plotting
    processedData.forEach(d => {
        expenseKeys.forEach(k => {
            d[k] = Math.abs(d[k] || 0);
        });
        d.Wage = d.Wage || 0;
    });

    const stack = d3.stack().keys(expenseKeys);
    const stackedData = stack(processedData);

    // Scales
    const xExtent = d3.extent(processedData, d => d.month);
    const xScale = d3.scaleTime().domain(xExtent).range([0, width]);

    const maxExpense = d3.max(stackedData, layer => d3.max(layer, d => d[1]));
    const maxIncome = d3.max(processedData, d => d.Wage);
    const maxY = Math.max(maxExpense || 0, maxIncome || 0);

    const yScale = d3.scaleLinear().domain([0, maxY * 1.1]).range([height, 0]);
    
    const colorScale = (key) => EXPENSE_COLOR_MAP[key] || '#ccc';

    // Area generator
    const area = d3.area()
        .x(d => xScale(d.data.month))
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]));

    // Draw Areas
    g.selectAll('path.area')
        .data(stackedData)
        .enter()
        .append('path')
        .attr('class', 'area')
        .attr('d', area)
        .attr('fill', d => colorScale(d.key))
        .attr('opacity', 0.8);

    // Draw Income Line
    const line = d3.line()
        .x(d => xScale(d.month))
        .y(d => yScale(d.Wage));

    g.append('path')
        .datum(processedData)
        .attr('fill', 'none')
        .attr('stroke', '#2c3e50')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '5,5')
        .attr('d', line);
        
    g.append('text')
       .attr('x', width - 10)
       .attr('y', yScale(processedData[processedData.length-1].Wage) - 10)
       .attr('text-anchor', 'end')
       .style('fill', '#2c3e50')
       .style('font-weight', 'bold')
       .text('Avg Wage');

    // Highlight Selected Month
    if (selectedMonth) {
        const selectedDate = new Date(selectedMonth + '-01'); // Append day to make it parseable
        // Adjust for timezone if necessary, but usually 'YYYY-MM-01' works fine in local time for visualization if consistent
        // Better to match how processedData parses it.
        // processedData uses new Date(d.month) where d.month is 'YYYY-MM'
        
        const xPos = xScale(selectedDate);
        
        if (xPos >= 0 && xPos <= width) {
            g.append('line')
                .attr('x1', xPos)
                .attr('x2', xPos)
                .attr('y1', 0)
                .attr('y2', height)
                .attr('stroke', '#2563eb') // Blue-600
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '4');

            g.append('text')
                .attr('x', xPos)
                .attr('y', -10)
                .attr('text-anchor', 'middle')
                .style('fill', '#2563eb')
                .style('font-weight', 'bold')
                .style('font-size', '12px')
                .text('Selected');
        }
    }

    // Axes
    const xAxis = d3.axisBottom(xScale)
        .ticks(width > 500 ? 10 : 5)
        .tickFormat(d3.timeFormat("%b %Y"));

    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

    g.append('g')
        .call(d3.axisLeft(yScale).tickFormat(d => `$${d}`));

    // Legend
    const legend = g.append('g')
        .attr('transform', `translate(${width + 20}, 0)`);

    expenseKeys.forEach((key, i) => {
        const lg = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);
            
        lg.append('rect')
            .attr('width', 18)
            .attr('height', 18)
            .attr('fill', colorScale(key))
            .attr('rx', 4);
        
        lg.append('text')
            .attr('x', 25)
            .attr('y', 14)
            .text(key)
            .style('font-size', '12px')
            .style('fill', '#4b5563');
    });

  }, [rawData, filterCluster, dimensions, selectedMonth]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-gray-800">Financial Flow Analysis</h3>
        <div className="text-xs text-gray-500">
            {filterCluster !== null && filterCluster !== undefined ? `Cluster ${filterCluster}` : 'All Residents'}
        </div>
      </div>
      <div
      ref={containerRef}
            className="w-full"
            style={{ height: "100%", minHeight: "600px" }}   // ← guarantees enough room
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

export default FinancialTrajectories;

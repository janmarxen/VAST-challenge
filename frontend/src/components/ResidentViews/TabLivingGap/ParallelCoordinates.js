import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { fetchParallelCoordinates } from '../../../utils/api';
import { decodeLabel } from '../labels';
import { CLUSTER_COLOR_RANGE, getSortedClusterDomain } from '../colorHelpers';

function ParallelCoordinates({ selectedIds, onFilter, selectedMonth, filterHaveKids }) {
  const containerRef = useRef();
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sampleRate, setSampleRate] = useState(0.2); // Default 20% sampling
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const brushSelections = useRef(new Map());

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

  // Clear brushes if selection is reset externally
  useEffect(() => {
    if (!selectedIds) {
      brushSelections.current.clear();
    }
  }, [selectedIds]);

  // Fetch data (ALL months)
  useEffect(() => {
    setLoading(true);
    fetchParallelCoordinates({ month: 'all', haveKids: filterHaveKids })
      .then(response => {
        setData(response || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching PCP data:', error);
        setLoading(false);
      });
  }, [filterHaveKids]); // Removed selectedMonth dependency

  useEffect(() => {
    if (!data.length || dimensions.width === 0 || dimensions.height === 0) return;

    // Apply cohort filter client-side to ensure density slider samples the right group
    const filteredData = filterHaveKids === null ? data : data.filter(d => d.haveKids === filterHaveKids);
    const renderData = filteredData.length ? filteredData : data;

    // Reduced margins to maximize horizontal space
    const margin = { top: 40, right: 10, bottom: 40, left: 50 }; // Increased left margin for month labels
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Dimensions to plot
    const dims = ['month', 'age', 'householdSize', 'Income', 'CostOfLiving', 'SavingsRate'];

    // Scales
    const yScales = {};
    dims.forEach(dim => {
      if (dim === 'month') {
        const months = [...new Set(renderData.map(d => d[dim]))].sort();
        yScales[dim] = d3.scalePoint().domain(months).range([height, 0]).padding(0.1);
      } else {
        yScales[dim] = d3.scaleLinear().domain(d3.extent(renderData, d => d[dim])).range([height, 0]);
      }
    });

    const xScale = d3.scalePoint().range([0, width]).padding(0.5).domain(dims);

    // Color scale (match scatterplot palette)
    const clusterDomain = getSortedClusterDomain(renderData.map(d => d.Cluster));
    const colorScale = d3.scaleOrdinal().domain(clusterDomain).range(CLUSTER_COLOR_RANGE);

    // Line generator
    const line = d3.line().defined(d => !isNaN(d[1]) && d[1] !== undefined).x(d => xScale(d[0])).y(d => yScales[d[0]](d[1]));
    function path(d) {
      return line(dims.map(p => [p, d[p]]));
    }

    // Sampling logic (works on the cohort in renderData)
    let dataToPlot = renderData;
    if (!selectedIds || selectedIds.length === 0) {
      dataToPlot = renderData.filter(() => Math.random() < sampleRate);
    } else {
      const selectedData = renderData.filter(d => selectedIds.includes(d.participantId));
      const unselectedData = renderData.filter(d => !selectedIds.includes(d.participantId));
      const sampledUnselected = unselectedData.filter(() => Math.random() < (sampleRate * 0.5));
      dataToPlot = [...selectedData, ...sampledUnselected];
    }

    // Draw lines
    g.selectAll('path')
      .data(dataToPlot)
      .enter()
      .append('path')
      .attr('d', path)
      .style('fill', 'none')
      .style('stroke', d => {
        if (selectedIds && selectedIds.length > 0) {
          return selectedIds.includes(d.participantId) ? colorScale(d.Cluster) : '#e5e7eb';
        }
        return colorScale(d.Cluster);
      })
      .style('opacity', d => {
        if (selectedIds && selectedIds.length > 0) {
          return selectedIds.includes(d.participantId) ? 0.8 : 0.2;
        }
        return 0.4;
      })
      .style('stroke-width', d => {
        if (selectedIds && selectedIds.length > 0) {
          return selectedIds.includes(d.participantId) ? 2 : 1;
        }
        return 1;
      });

    // Axes
    g.selectAll('myAxis')
      .data(dims)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${xScale(d)})`)
      .each(function (d) {
        // For householdSize, prefer integer ticks
        if (d === 'householdSize') {
          const domain = yScales[d].domain();
          const min = Math.floor(domain[0]);
          const max = Math.ceil(domain[1]);
          const ticks = d3.range(min, max + 1);
          d3.select(this).call(d3.axisLeft(yScales[d]).tickValues(ticks).tickFormat(d3.format('d')));
        } else if (d === 'month') {
          d3.select(this).call(d3.axisLeft(yScales[d]));
        } else {
          d3.select(this).call(d3.axisLeft(yScales[d]).ticks(5));
        }

        // Add brush
        const brush = d3.brushY()
          .extent([[-10, 0], [10, height]])
          .on('end', (event) => {
            if (!event.sourceEvent) return; // Ignore programmatic changes

            if (event.selection) {
              brushSelections.current.set(d, event.selection);
            } else {
              brushSelections.current.delete(d);
            }

            // Filter data based on all active brushes
            if (brushSelections.current.size === 0) {
              if (onFilter) onFilter(null);
              return;
            }

            const selected = renderData.filter(row => {
              return Array.from(brushSelections.current.entries()).every(([key, extent]) => {
                const val = yScales[key](row[key]);
                // Brush selection is [y0, y1] (pixels)
                // D3 y-scale maps value to pixels.
                // Check if pixel value is within extent.
                return val >= extent[0] && val <= extent[1];
              });
            });

            // When filtering by month, we might select multiple rows for the same participant.
            // We want to return unique participant IDs.
            const ids = [...new Set(selected.map(row => row.participantId))];
            if (onFilter) onFilter(ids);
          });

        const brushGroup = d3.select(this).append('g').call(brush);

        // Restore brush selection if exists
        if (brushSelections.current.has(d)) {
          brush.move(brushGroup, brushSelections.current.get(d));
        }
      })
      .append('text')
      .style('text-anchor', 'middle')
      .attr('y', -9)
      .text(d => decodeLabel(d))
      .style('fill', '#374151')
      .style('font-weight', 'bold')
      .style('font-size', '12px');

  }, [data, selectedIds, sampleRate, dimensions, filterHaveKids]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-gray-800">Demographic Pattern Finder</h3>
        <div className="flex items-center space-x-2">
          <label className="text-xs text-gray-500">Density:</label>
          <input
            type="range"
            min="0.01"
            max="1"
            step="0.01"
            value={sampleRate}
            onChange={(e) => setSampleRate(parseFloat(e.target.value))}
            className="w-24"
          />
          <span className="text-xs text-gray-500 w-8">{Math.round(sampleRate * 100)}%</span>
        </div>
      </div>
      <div ref={containerRef} className="w-full" style={{ height: '100%', minHeight: '600px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">Loading data...</div>
        ) : (
          <svg ref={svgRef} width="100%" height="100%" style={{ overflow: 'visible', flex: 1 }} />
        )}
      </div>
    </div>
  );
}

export default ParallelCoordinates;
 
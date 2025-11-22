import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { fetchParallelCoordinates } from '../../utils/api';

function ParallelCoordinates({ selectedIds, onFilter, filterHaveKids }) {
  const containerRef = useRef();
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sampleRate, setSampleRate] = useState(0.2); // Default 20% sampling
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
    fetchParallelCoordinates(filterHaveKids)
      .then(response => {
        setData(response);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching PCP data:', error);
        setLoading(false);
      });
  }, [filterHaveKids]);

  useEffect(() => {
    if (!data.length || dimensions.width === 0 || dimensions.height === 0) return;

    const margin = { top: 40, right: 20, bottom: 40, left: 50 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Dimensions to plot
    const dims = ['age', 'householdSize', 'Income', 'CostOfLiving', 'SavingsRate'];
    
    // Scales
    const yScales = {};
    dims.forEach(dim => {
        yScales[dim] = d3.scaleLinear()
            .domain(d3.extent(data, d => d[dim]))
            .range([height, 0]);
    });

    const xScale = d3.scalePoint()
        .range([0, width])
        .padding(0.5)
        .domain(dims);

    // Color scale
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Line generator
    const line = d3.line()
        .defined(d => !isNaN(d[1]))
        .x(d => xScale(d[0]))
        .y(d => yScales[d[0]](d[1]));

    function path(d) {
        return line(dims.map(p => [p, d[p]]));
    }

    // Sampling logic
    // Always include selectedIds if they exist
    let dataToPlot = data;
    if (!selectedIds || selectedIds.length === 0) {
        // Random sampling if no selection
        dataToPlot = data.filter(() => Math.random() < sampleRate);
    } else {
        // If selection exists, show all selected + sample of unselected context
        const selectedData = data.filter(d => selectedIds.includes(d.participantId));
        const unselectedData = data.filter(d => !selectedIds.includes(d.participantId));
        const sampledUnselected = unselectedData.filter(() => Math.random() < (sampleRate * 0.5)); // Reduce context noise
        dataToPlot = [...selectedData, ...sampledUnselected];
    }

    // Draw lines
    g.selectAll('path')
        .data(dataToPlot)
        .enter().append('path')
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
        .data(dims).enter()
        .append('g')
        .attr('transform', d => `translate(${xScale(d)})`)
        .each(function(d) { 
            d3.select(this).call(d3.axisLeft(yScales[d]).ticks(5)); 
        })
        .append('text')
        .style('text-anchor', 'middle')
        .attr('y', -9)
        .text(d => d)
        .style('fill', '#374151')
        .style('font-weight', 'bold')
        .style('font-size', '12px');

  }, [data, selectedIds, sampleRate, dimensions]);

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

export default ParallelCoordinates;
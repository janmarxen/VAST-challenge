import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { fetchPerformanceMetrics } from '../../utils/api';

/**
 * Performance Metrics Scatter Plot
 * Multi-dimensional comparison of businesses
 */
function PerformanceScatter() {
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceMetrics()
      .then(response => {
        setData(response.metrics || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching performance metrics:', error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!data.length) return;

    const width = 600;
    const height = 400;
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // TODO: Implement scatter plot
    // - x: employee count, y: average wage
    // - Size: revenue, Color: retention rate
    // - Add axes and tooltips

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .text('Performance Scatter Plot')
      .style('font-size', '16px')
      .style('fill', '#666');

  }, [data]);

  if (loading) return <div>Loading performance metrics...</div>;

  return <svg ref={svgRef}></svg>;
}

export default PerformanceScatter;

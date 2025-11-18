import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { fetchFinancialTrajectories } from '../../utils/api';

/**
 * Financial Health Trajectories
 * Shows financial health over time by demographic segments
 */
function FinancialTrajectories() {
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialTrajectories()
      .then(response => {
        setData(response.timeseries || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching trajectories:', error);
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

    // TODO: Implement line chart with confidence bands
    // - Multiple lines for different demographic segments
    // - Shaded areas for P25/P75 percentiles
    // - Interactive legend

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .text('Financial Trajectories Over Time')
      .style('font-size', '16px')
      .style('fill', '#666');

  }, [data]);

  if (loading) return <div>Loading financial trajectories...</div>;

  return <svg ref={svgRef}></svg>;
}

export default FinancialTrajectories;

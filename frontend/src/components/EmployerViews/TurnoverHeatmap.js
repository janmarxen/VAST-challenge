import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { fetchTurnoverHeatmap } from '../../utils/api';

/**
 * Turnover Heatmap Visualization
 * Shows turnover rates by employer and time period
 */
function TurnoverHeatmap() {
  const svgRef = useRef();
  const [data, setData] = useState({ employers: [], months: [], turnover_rates: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTurnoverHeatmap()
      .then(response => {
        setData(response);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching turnover heatmap:', error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!data.employers || !data.employers.length) return;

    const width = 600;
    const height = 400;
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // TODO: Implement heatmap
    // - Rows: employers, Columns: months
    // - Color scale for turnover rate (green = low, red = high)
    // - Interactive hover showing exact values

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .text('Turnover Rate Heatmap')
      .style('font-size', '16px')
      .style('fill', '#666');

  }, [data]);

  if (loading) return <div>Loading turnover heatmap...</div>;

  return <svg ref={svgRef}></svg>;
}

export default TurnoverHeatmap;

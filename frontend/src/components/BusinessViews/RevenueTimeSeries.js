import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { fetchBusinessRevenue } from '../../utils/api';

/**
 * Revenue Time Series Visualization
 * Shows monthly revenue trends for businesses
 */
function RevenueTimeSeries() {
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch data from API
    fetchBusinessRevenue()
      .then(response => {
        setData(response.timeseries || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching revenue data:', error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!data.length) return;

    const width = 600;
    const height = 400;
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove(); // Clear previous render

    // TODO: Implement D3 visualization
    // - Create scales (xScale, yScale)
    // - Generate line path with d3.line()
    // - Add axes
    // - Add interactivity (hover, brush)

    // Placeholder: render a simple message
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .text('Revenue Time Series Visualization')
      .style('font-size', '16px')
      .style('fill', '#666');

  }, [data]);

  if (loading) return <div>Loading revenue data...</div>;

  return (
    <div>
      <svg ref={svgRef}></svg>
    </div>
  );
}

export default RevenueTimeSeries;

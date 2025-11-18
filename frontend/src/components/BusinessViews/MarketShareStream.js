import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { fetchMarketShare } from '../../utils/api';

/**
 * Market Share Stream Graph
 * Shows market share changes over time
 */
function MarketShareStream() {
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketShare()
      .then(response => {
        setData(response.market_shares || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching market share:', error);
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

    // TODO: Implement stream graph visualization
    // - Use d3.stack() for stacking
    // - d3.area() for stream areas
    // - Color scale for different employers

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .text('Market Share Stream Graph')
      .style('font-size', '16px')
      .style('fill', '#666');

  }, [data]);

  if (loading) return <div>Loading market share data...</div>;

  return <svg ref={svgRef}></svg>;
}

export default MarketShareStream;

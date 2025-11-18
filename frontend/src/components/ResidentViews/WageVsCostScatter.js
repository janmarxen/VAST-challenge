import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { fetchWageVsCost } from '../../utils/api';

/**
 * Wage vs Cost of Living Scatter Plot
 * Shows relationship between wages and living costs
 */
function WageVsCostScatter() {
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWageVsCost()
      .then(response => {
        setData(response.participants || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching wage vs cost data:', error);
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
    // - x: hourly wage, y: cost of living
    // - Color by cluster, size by household size
    // - Add lasso selection for brushing

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .text('Wage vs Cost Scatter Plot')
      .style('font-size', '16px')
      .style('fill', '#666');

  }, [data]);

  if (loading) return <div>Loading wage vs cost data...</div>;

  return <svg ref={svgRef}></svg>;
}

export default WageVsCostScatter;

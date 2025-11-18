import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { fetchJobFlow } from '../../utils/api';

/**
 * Job Flow Sankey Diagram
 * Shows employee transitions between employers
 */
function JobFlowSankey() {
  const svgRef = useRef();
  const [data, setData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobFlow()
      .then(response => {
        setData(response);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching job flow:', error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!data.nodes || !data.nodes.length) return;

    const width = 600;
    const height = 400;
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // TODO: Implement Sankey diagram
    // - Use d3-sankey plugin
    // - Nodes: employers
    // - Links: job transitions (weighted by employee count)
    // - Color flows for visual distinction

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .text('Job Flow Sankey Diagram')
      .style('font-size', '16px')
      .style('fill', '#666');

  }, [data]);

  if (loading) return <div>Loading job flow data...</div>;

  return <svg ref={svgRef}></svg>;
}

export default JobFlowSankey;

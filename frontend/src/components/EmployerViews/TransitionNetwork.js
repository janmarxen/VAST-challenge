import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { fetchTransitionNetwork } from '../../utils/api';

/**
 * Transition Network Visualization
 * Network graph showing job transitions between employers
 */
function TransitionNetwork() {
  const svgRef = useRef();
  const [data, setData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransitionNetwork()
      .then(response => {
        setData(response);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching transition network:', error);
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

    // TODO: Implement force-directed network
    // - Use d3.forceSimulation()
    // - Nodes: employers (size by employee count)
    // - Edges: transitions (thickness by transition count)
    // - Drag interaction for exploration

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .text('Job Transition Network')
      .style('font-size', '16px')
      .style('fill', '#666');

  }, [data]);

  if (loading) return <div>Loading transition network...</div>;

  return <svg ref={svgRef}></svg>;
}

export default TransitionNetwork;

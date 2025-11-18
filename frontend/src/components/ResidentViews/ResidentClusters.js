import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { fetchResidentClusters } from '../../utils/api';

/**
 * Resident Clustering Visualization
 * Shows clustering results for similar financial patterns
 */
function ResidentClusters() {
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResidentClusters()
      .then(response => {
        setData(response.participants || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching clusters:', error);
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

    // TODO: Implement dimensionality reduction visualization
    // - t-SNE or UMAP projection to 2D
    // - Color by cluster assignment
    // - Show cluster centroids

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .text('Resident Clustering (t-SNE/UMAP)')
      .style('font-size', '16px')
      .style('fill', '#666');

  }, [data]);

  if (loading) return <div>Loading clustering data...</div>;

  return <svg ref={svgRef}></svg>;
}

export default ResidentClusters;

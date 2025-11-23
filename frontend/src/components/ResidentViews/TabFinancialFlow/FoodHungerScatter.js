import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';
import { CLUSTER_COLOR_RANGE, getSortedClusterDomain } from '../colorHelpers';

const FoodHungerScatter = ({ selectedMonth }) => {
  const svgRef = useRef(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sampleInfo, setSampleInfo] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setData([]);
      try {
        const response = await axios.get('/api/resident/expense-analysis', {
          params: { month: selectedMonth },
        });
        setSampleInfo(response.data?.sampled_counts ?? null);
        if (!isMounted) return;
        setData(response.data?.financial_vs_stability ?? []);
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching expense analysis:', error);
          setData([]);
            setSampleInfo(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [selectedMonth]);

  useEffect(() => {
    const svgEl = svgRef.current;
    const hasData = Array.isArray(data) && data.length > 0;

    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    if (!hasData) return;

    const sanitizedData = data.filter(
      d => Number.isFinite(d?.SavingsRate) && Number.isFinite(d?.FinancialStress)
    );

    if (sanitizedData.length === 0) return;

    const width = 500;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3.scaleLinear().domain([0, 1]).range([0, innerWidth]).nice();

    // Compute a capped y-axis so low instability values remain visible.
    const stressValues = sanitizedData.map(d => Math.max(0, Math.min(1, d.FinancialStress))).sort((a, b) => a - b);
    const p95 = stressValues.length ? d3.quantile(stressValues, 0.95) : 1;
    const displayMax = Math.max(p95 * 1.1, 0.05); // ensure some headroom and minimum range
    const yScale = d3.scaleLinear().domain([0, displayMax]).range([innerHeight, 0]).nice();

    const clusterDomain = getSortedClusterDomain(sanitizedData.map(d => d.Cluster));
    const colorScale = d3.scaleOrdinal()
      .domain(clusterDomain)
      .range(CLUSTER_COLOR_RANGE);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5));

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5));

    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 35)
      .attr('text-anchor', 'middle')
      .text('Savings Rate (%)')
      .style('font-size', '12px')
      .style('fill', '#666');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .text('Financial Stress')
      .style('font-size', '12px')
      .style('fill', '#666');

    g.selectAll('circle')
      .data(sanitizedData)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(Math.max(0, Math.min(1, d.SavingsRate))))
      .attr('cy', d => {
        const v = Math.max(0, Math.min(1, d.FinancialStress));
        return yScale(Math.min(v, displayMax));
      })
      .attr('r', d => (d.FinancialStress > displayMax ? 4.5 : 3))
      .attr('fill', d => colorScale(d.Cluster ?? 'Unclustered'))
      .attr('stroke', d => (d.FinancialStress > displayMax ? '#000' : 'none'))
      .attr('stroke-width', d => (d.FinancialStress > displayMax ? 0.6 : 0))
      .attr('opacity', 0.75);

    // If we capped the axis, add a small note to explain that very large stress values were clipped to the top
    if (displayMax < 0.999) {
      g.append('text')
        .attr('x', innerWidth - 6)
        .attr('y', 10)
        .attr('text-anchor', 'end')
        .style('font-size', '10px')
        .style('fill', '#666')
        .text('Top values clipped to 95th percentile');
    }

  }, [data]);

  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <h4 className="font-bold text-gray-800 mb-2">Savings vs. Financial Stress</h4>
      <p className="text-xs text-gray-500 mb-4">
        Each point is a resident in the selected month. The Financial Stress score quantifies financial strain, rising when residents spend more than they earn and when they have many months with negative savings.
      </p>
      <div className="flex justify-center items-center" style={{ minHeight: 300 }}>
        {loading && (
          <div className="text-gray-400 italic">Loading analysis...</div>
        )}
        {!loading && !hasData && (
          <div className="text-gray-400 italic text-center px-6">
            No savings vs. instability observations are available for the selected month.
          </div>
        )}
        {!loading && hasData && (
          <svg ref={svgRef} width={500} height={300} className="overflow-visible"></svg>
        )}
      </div>
    </div>
  );
};

export default FoodHungerScatter;

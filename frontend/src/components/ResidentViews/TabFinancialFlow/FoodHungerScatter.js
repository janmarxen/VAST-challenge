import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';

const FoodHungerScatter = ({ selectedMonth }) => {
  const svgRef = useRef(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setData([]);
      try {
        const response = await axios.get('/api/resident/expense-analysis', {
          params: { month: selectedMonth },
        });
        if (!isMounted) return;
        setData(response.data?.food_vs_hunger ?? []);
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching expense analysis:', error);
          setData([]);
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
      d => Number.isFinite(d?.Food) && Number.isFinite(d?.HungerRate)
    );

    if (sanitizedData.length === 0) return;

    const width = 500;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xExtent = d3.extent(sanitizedData, d => Math.abs(d.Food));
    const yExtent = d3.extent(sanitizedData, d => d.HungerRate);

    const xMax = Number.isFinite(xExtent?.[1]) ? Math.max(xExtent[1], 1) : 1;
    const yMax = Number.isFinite(yExtent?.[1]) ? Math.max(yExtent[1], 1) : 1;

    const xScale = d3.scaleLinear()
      .domain([0, xMax])
      .range([0, innerWidth])
      .nice();

    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .range([innerHeight, 0])
      .nice();

    const clusters = Array.from(new Set(
      sanitizedData.map(d => d.Cluster ?? 'Unclustered')
    ));

    const colorScale = d3.scaleOrdinal()
      .domain(clusters)
      .range(d3.schemeTableau10);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5));

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5));

    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 35)
      .attr('text-anchor', 'middle')
      .text('Avg Monthly Food Cost ($)')
      .style('font-size', '12px')
      .style('fill', '#666');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -35)
      .attr('text-anchor', 'middle')
      .text('Hunger Probability')
      .style('font-size', '12px')
      .style('fill', '#666');

    g.selectAll('circle')
      .data(sanitizedData)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(Math.abs(d.Food)))
      .attr('cy', d => yScale(d.HungerRate))
      .attr('r', 3)
      .attr('fill', d => colorScale(d.Cluster ?? 'Unclustered'))
      .attr('opacity', 0.6);

  }, [data]);

  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <h4 className="font-bold text-gray-800 mb-2">Food Spending vs. Hunger</h4>
      <p className="text-xs text-gray-500 mb-4">
        Does spending more on food reduce the likelihood of going hungry? Point colors correspond to resident clusters, highlighting group-level differences.
      </p>
      <div className="flex justify-center items-center" style={{ minHeight: 300 }}>
        {loading && (
          <div className="text-gray-400 italic">Loading analysis...</div>
        )}
        {!loading && !hasData && (
          <div className="text-gray-400 italic text-center px-6">
            No food vs. hunger observations are available for the selected month.
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

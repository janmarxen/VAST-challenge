import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';

/**
 * Job Flow Sankey Diagram
 * Shows worker transitions between employers
 */
function JobFlowSankey({ selectedEmployer, minFlowThreshold = 1 }) {
  const svgRef = useRef();
  const [data, setData] = useState(null);
  const [metaData, setMetaData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [groupByIndustry, setGroupByIndustry] = useState(false);

  // Fetch data
  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get('/api/employers/job-flows'),
      axios.get('/api/employers/meta')
    ])
      .then(([flowsRes, metaRes]) => {
        // Flows
        let links = [];
        if (Array.isArray(flowsRes.data)) {
          links = flowsRes.data;
        } else if (flowsRes.data && Array.isArray(flowsRes.data.links)) {
          links = flowsRes.data.links;
        }
        
        // Meta
        let meta = [];
        if (Array.isArray(metaRes.data)) {
          meta = metaRes.data;
        }

        // Calculate total employees moved
        const total = links.reduce((sum, d) => sum + (d.count || 0), 0);
        setTotalEmployees(total);
        setData(links);
        setMetaData(meta);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching job flows:', error);
        setLoading(false);
      });
  }, []);

  // Draw Sankey
  useEffect(() => {
    if (!data || !svgRef.current) return;

    try {
      const width = 800;
      const height = 450;

      let nodes = [];
      let links = [];

      if (groupByIndustry) {
        // Group by buildingType
        const empToType = {};
        metaData.forEach(d => {
          empToType[d.employerId] = d.buildingType || 'Unknown';
        });

        const flowMap = {};
        data.forEach(d => {
          const fromType = empToType[d.fromEmployer] || 'Unknown';
          const toType = empToType[d.toEmployer] || 'Unknown';
          if (fromType === toType) return; // Skip self-loops in industry view? Or keep them?
          // Usually Sankey shows flows between categories. Self-loops are tricky.
          // Let's keep them if they exist, but usually we want to see transitions.
          
          const key = `${fromType}|${toType}`;
          if (!flowMap[key]) flowMap[key] = 0;
          flowMap[key] += d.count;
        });

        const nodeSet = new Set();
        Object.keys(flowMap).forEach(key => {
          const [from, to] = key.split('|');
          nodeSet.add(from);
          nodeSet.add(to);
        });

        nodes = Array.from(nodeSet).map(id => ({ id, name: id }));
        links = Object.entries(flowMap).map(([key, count]) => {
          const [from, to] = key.split('|');
          return {
            source: nodes.findIndex(n => n.id === from),
            target: nodes.findIndex(n => n.id === to),
            value: count,
            sourceId: from,
            targetId: to
          };
        });

      } else {
        // Original Employer-to-Employer logic
        // Filter flows by threshold
        const filteredFlows = data.filter(d => d.count >= minFlowThreshold);
        if (filteredFlows.length === 0) {
            // Clear SVG if no data
            d3.select(svgRef.current).selectAll('*').remove();
            return;
        }

        // Build nodes
        const nodeSet = new Set();
        filteredFlows.forEach(d => {
          nodeSet.add(d.fromEmployer);
          nodeSet.add(d.toEmployer);
        });
        nodes = Array.from(nodeSet).map(id => ({ id, name: `Employer ${id}` }));

        // Build links
        links = filteredFlows.map(d => ({
          source: nodes.findIndex(n => n.id === d.fromEmployer),
          target: nodes.findIndex(n => n.id === d.toEmployer),
          value: d.count,
          sourceId: d.fromEmployer,
          targetId: d.toEmployer
        }));
      }

      // Calculate node flows for hover info
      const nodeFlows = {};
      nodes.forEach(node => {
        nodeFlows[node.id] = {
          inflow: links.filter(l => l.targetId === node.id).reduce((sum, l) => sum + l.value, 0),
          outflow: links.filter(l => l.sourceId === node.id).reduce((sum, l) => sum + l.value, 0)
        };
      });

      // Sankey layout
      const graph = sankey()
        .nodeWidth(20)
        .nodePadding(groupByIndustry ? 50 : 20) // More padding for fewer nodes
        .extent([[1, 1], [width - 1, height - 1]])({
          nodes: nodes.map(d => ({ ...d })),
          links: links.map(d => ({ ...d })),
        });

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      // Color scale
      const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

      // Links
      const linkGroup = svg.append('g');
      
      linkGroup.selectAll('path')
        .data(graph.links)
        .enter()
        .append('path')
        .attr('d', sankeyLinkHorizontal())
        .attr('stroke', (d, i) => {
          if (selectedFlow !== null) {
            return selectedFlow === i ? colorScale(d.source.id) : '#ddd';
          }
          return colorScale(d.source.id);
        })
        .attr('stroke-opacity', (d, i) => {
          if (selectedFlow !== null) {
            return selectedFlow === i ? 0.8 : 0.1;
          }
          return 0.5;
        })
        .attr('stroke-width', d => Math.max(1, d.width))
        .style('cursor', 'pointer')
        .on('click', function(event, d, i) {
          event.stopPropagation();
          const linkIndex = graph.links.indexOf(d);
          setSelectedFlow(selectedFlow === linkIndex ? null : linkIndex);
        })
        .on('mouseover', function(event, d) {
          const percentage = ((d.value / totalEmployees) * 100).toFixed(1);
          setTooltip({
            x: event.pageX,
            y: event.pageY,
            content: {
              from: groupByIndustry ? d.sourceId : `Employer ${d.sourceId}`,
              to: groupByIndustry ? d.targetId : `Employer ${d.targetId}`,
              count: d.value,
              percentage: percentage,
              type: 'flow'
            }
          });
        })
        .on('mouseout', function() {
          setTooltip(null);
        });

      // Nodes
      const nodeGroup = svg.append('g');
      
      nodeGroup.selectAll('rect')
        .data(graph.nodes)
        .enter()
        .append('rect')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('height', d => d.y1 - d.y0)
        .attr('width', d => d.x1 - d.x0)
        .attr('fill', d => colorScale(d.id))
        .attr('opacity', 0.8)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          const flow = nodeFlows[d.id];
          const netGain = flow.inflow - flow.outflow;
          setTooltip({
            x: event.pageX,
            y: event.pageY,
            content: {
              employer: d.id,
              inflow: flow.inflow,
              outflow: flow.outflow,
              netGain: netGain,
              type: 'node'
            }
          });
        })
        .on('mouseout', function() {
          setTooltip(null);
        });

      // Node labels
      svg.append('g')
        .selectAll('text')
        .data(graph.nodes)
        .enter()
        .append('text')
        .attr('x', d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr('y', d => (d.y1 + d.y0) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', d => d.x0 < width / 2 ? 'start' : 'end')
        .attr('font-size', '11px')
        .attr('fill', '#333')
        .text(d => d.id);
    } catch (error) {
      console.error('Error rendering Sankey diagram:', error);
    }

  }, [data, metaData, minFlowThreshold, selectedFlow, totalEmployees, groupByIndustry]);

  if (loading) return <div className="text-center py-8 text-gray-500">Loading job flow data...</div>;

  return (
    <div className="flex flex-col gap-4">
      {/* Header with description */}
      <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded flex justify-between items-center">
        <div>
            <h3 className="font-semibold text-amber-900 text-sm">Job Flow Between Employers</h3>
            <p className="text-xs text-amber-800 mt-1">
            Visualizes how workers move between employers.
            </p>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-amber-900">Group by Industry:</span>
            <button 
                onClick={() => setGroupByIndustry(!groupByIndustry)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${groupByIndustry ? 'bg-amber-600' : 'bg-gray-200'}`}
            >
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${groupByIndustry ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
        </div>
      </div>

      <div className="relative overflow-x-auto flex justify-center">
        <svg ref={svgRef} width={800} height={450} style={{ maxWidth: '100%', border: '1px solid #e5e7eb' }}></svg>
      </div>

      {tooltip && (
        <div
          className="absolute z-50 bg-gray-900 text-white text-xs p-2 rounded shadow-lg pointer-events-none"
          style={{ left: tooltip.x + 10, top: tooltip.y - 50 }}
        >
          {tooltip.content.type === 'flow' ? (
            <>
              <div className="font-semibold">{tooltip.content.from} → {tooltip.content.to}</div>
              <div>Employees Moved: {tooltip.content.count}</div>
              <div>Percentage: {tooltip.content.percentage}%</div>
            </>
          ) : (
            <>
              <div className="font-semibold">Employer {tooltip.content.employer}</div>
              <div>Inflow (Joined): {tooltip.content.inflow}</div>
              <div>Outflow (Left): {tooltip.content.outflow}</div>
              <div className={tooltip.content.netGain >= 0 ? 'text-green-400' : 'text-red-400'}>
                Net Gain: {tooltip.content.netGain > 0 ? '+' : ''}{tooltip.content.netGain}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default JobFlowSankey;

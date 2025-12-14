import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';

/**
 * Employer Geographic Map
 * Visualizes turnover rates on the city map (using actual building polygons).
 * Heatmap style: Polygons colored by turnover rate.
 */
function EmployerGeographicMap({ selectedMonth }) {
  const [turnoverData, setTurnoverData] = useState([]);
  const [buildingData, setBuildingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const svgRef = useRef();
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [containerHeight, setContainerHeight] = useState(600);
  const [tooltip, setTooltip] = useState(null);
  const [hoverStats, setHoverStats] = useState(null);

  // Use prop if available, otherwise default
  const currentMonth = selectedMonth || '2022-03';

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get('/api/employers/geographic-turnover', {
        params: { month: currentMonth, fill_missing: true }
      }),
      axios.get('/api/resident/geographic-financial-health') // Reusing resident endpoint for building geometry
    ])
      .then(([turnoverRes, buildingsRes]) => {
        setTurnoverData(turnoverRes.data || []);
        setBuildingData(buildingsRes.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching map data:', error);
        setLoading(false);
      });
  }, [currentMonth]);

  // Measure container size
  useEffect(() => {
    const setSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const w = Math.min(rect.width, 1400);
        const h = Math.max(600, Math.round(w * 0.6));
        setContainerWidth(w);
        setContainerHeight(h);
      }
    };
    setSize();
    window.addEventListener('resize', setSize);
    return () => window.removeEventListener('resize', setSize);
  }, []);

  useEffect(() => {
    if (!turnoverData || !buildingData || !svgRef.current) return;

    const { buildings } = buildingData;
    // With month-scoped backend response this is already the selected month.
    const monthData = Array.isArray(turnoverData) ? turnoverData : [];
    
    // 1. Parse WKT Polygons
    const parsePolygon = (wkt) => {
      if (!wkt || typeof wkt !== 'string') return null;
      const match = wkt.match(/\(\(([^)]+)\)\)/);
      if (!match) return null;

      const coordsStr = match[1];
      const coords = coordsStr.split(',').map(pair => {
        const parts = pair.trim().split(/\s+/);
        const x = parseFloat(parts[0]);
        const y = parseFloat(parts[1]);
        return [x, y];
      }).filter(pt => Number.isFinite(pt[0]) && Number.isFinite(pt[1]));

      return coords.length > 0 ? coords : null;
    };

    const features = buildings.map(b => {
      const coords = parsePolygon(b.location);
      return coords ? {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [coords] },
        properties: { buildingId: String(b.buildingId), buildingType: b.buildingType }
      } : null;
    }).filter(Boolean);

    if (features.length === 0) return;

    // 2. Setup Projection
    const projection = d3.geoIdentity()
      .reflectY(true)
      .fitSize([containerWidth, containerHeight], { type: 'FeatureCollection', features: features });

    const path = d3.geoPath().projection(projection);

    // 3. Prepare Data Map
    // Group turnover by buildingId
    const buildingStats = new Map();
    monthData.forEach(d => {
      if (!d.buildingId) return;
      const bid = String(d.buildingId);
      if (!buildingStats.has(bid)) {
        buildingStats.set(bid, { 
          totalTurnoverRate: 0, 
          count: 0, 
          totalActivity: 0,
          employers: []
        });
      }
      const stat = buildingStats.get(bid);
      stat.totalTurnoverRate += d.turnoverRate;
      stat.count += 1;
      stat.totalActivity += (d.hires + d.quits);
      stat.employers.push(d.employerId);
    });

    const monthTotalActivity = Array.from(buildingStats.values()).reduce((sum, s) => sum + (s.totalActivity || 0), 0);

    // Color Scale
    const colorScale = d3.scaleSequential(d3.interpolateReds)
      .domain([0, 1.0]) // Cap at 100% turnover (adjusted for high churn rates)
      .clamp(true);

    // 4. Draw Buildings
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const g = svg.append('g');

    g.selectAll('path')
      .data(features)
      .enter().append('path')
      .attr('d', path)
      .attr('fill', d => {
        const bid = d.properties.buildingId;
        const stat = buildingStats.get(bid);
        // If the entire month has no turnover events, render neutral gray to signal stability.
        if (monthTotalActivity === 0) return '#f3f4f6';
        if (!stat) return '#f3f4f6'; // No employer data
        const avgTurnover = stat.totalTurnoverRate / stat.count;
        return colorScale(avgTurnover);
      })
      .attr('stroke', '#d1d5db')
      .attr('stroke-width', 0.5)
      .on('mouseover', (event, d) => {
        const bid = d.properties.buildingId;
        const stat = buildingStats.get(bid);
        
        d3.select(event.target).attr('stroke', '#333').attr('stroke-width', 2);

        if (stat) {
          const avgTurnover = stat.totalTurnoverRate / stat.count;
          setHoverStats({
            id: bid,
            type: d.properties.buildingType,
            turnoverRate: avgTurnover,
            activity: stat.totalActivity,
            employerCount: stat.count
          });
          
          setTooltip({
            x: event.pageX,
            y: event.pageY,
            content: {
              id: bid,
              turnover: (avgTurnover * 100).toFixed(1) + '%',
              activity: stat.totalActivity
            }
          });
        } else {
          setHoverStats({
            id: bid,
            type: d.properties.buildingType,
            turnoverRate: null
          });
        }
      })
      .on('mouseout', (event) => {
        d3.select(event.target).attr('stroke', '#d1d5db').attr('stroke-width', 0.5);
        setTooltip(null);
        setHoverStats(null);
      });

  }, [turnoverData, buildingData, currentMonth, containerWidth, containerHeight]);

  if (loading) return <div className="text-center py-8 text-gray-500">Loading map data...</div>;

  const cityAvgTurnover = turnoverData.length > 0 
    ? d3.mean(turnoverData.filter(d => d.month === currentMonth), d => d.turnoverRate) 
    : 0;

  return (
    <div className="flex flex-row w-full gap-8 items-start">
      {/* Map container */}
      <div className="flex-1 flex justify-center">
        <div ref={containerRef} className="relative border rounded-xl shadow-lg bg-white p-4 mb-8 w-full max-w-5xl">
          <svg ref={svgRef} width={containerWidth} height={containerHeight} className="bg-slate-50"></svg>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="absolute z-10 bg-gray-900 text-white p-2 rounded shadow-xl text-xs pointer-events-none"
              style={{ left: tooltip.x - 200, top: tooltip.y - 200 }} // Offset to avoid cursor
            >
              <div className="font-semibold">Building #{tooltip.content.id}</div>
              <div>Turnover: {tooltip.content.turnover}</div>
              <div>Activity: {tooltip.content.activity} events</div>
            </div>
          )}

          {/* Legend Overlay */}
          <div className="absolute bottom-6 right-6 bg-white/90 p-3 rounded-lg shadow-md text-xs">
            <div className="font-bold mb-2">Avg Turnover Rate</div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50"></div> <span>0% (Stable)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-300"></div> <span>50%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600"></div> <span>100%+ (High Churn)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right-hand commentary & big number */}
      <div className="w-80 flex flex-col mt-4 pr-4">
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Current Selection</div>
          <div className="text-5xl font-extrabold text-gray-900 leading-tight">
            {hoverStats && hoverStats.turnoverRate != null
              ? `${(hoverStats.turnoverRate * 100).toFixed(1)}%`
              : cityAvgTurnover
              ? `${(cityAvgTurnover * 100).toFixed(1)}%`
              : '--'}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {hoverStats
              ? `Building #${hoverStats.id} · ${hoverStats.type || 'Unknown type'}`
              : 'City-wide Average Turnover'}
          </div>
          {hoverStats && hoverStats.employerCount > 0 && (
            <div className="mt-2 text-xs text-gray-600">
              Contains {hoverStats.employerCount} employer(s) with {hoverStats.activity} total hires/quits.
            </div>
          )}
        </div>

        <div className="text-sm text-gray-700 leading-relaxed">
          This map highlights "churn hotspots" across the city. Buildings are colored by the average turnover rate of employers located within them.
          <br /><br />
          <span className="font-semibold text-red-700">Dark Red</span> areas indicate locations with high workforce instability. These may be commercial hubs with high-turnover industries (e.g., retail, dining) or specific large employers facing retention issues.
          <br /><br />
          Hover over any building to see specific turnover metrics and activity levels.
        </div>
      </div>
    </div>
  );
}

export default EmployerGeographicMap;
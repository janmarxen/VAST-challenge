import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';

const GeographicFinancialHeatmap = ({ selectedMonth }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1000);
  const [containerHeight, setContainerHeight] = useState(700);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const [hoverStats, setHoverStats] = useState(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use a runtime-relative path so nginx can proxy `/api` to the backend.
        const requestUrl = `/api/resident/geographic-financial-health`;
        console.log('Requesting geographic data from:', requestUrl);
        const response = await axios.get(requestUrl);
        console.log('Geographic Data Response:', response.data);
        setData(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching geographic data:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Draw Map
  useEffect(() => {
    if (!data || !data.buildings || !data.stats || !svgRef.current) return;

    const { buildings, stats } = data;
    const width = containerWidth || 1000;
    const height = containerHeight || 700;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous

    // 1. Parse WKT Polygons
    // Simple WKT parser for POLYGON ((x y, x y, ...))
    const parsePolygon = (wkt) => {
      if (!wkt || typeof wkt !== 'string') return null;
      const match = wkt.match(/\(\(([^)]+)\)\)/);
      if (!match) return null;

      const coordsStr = match[1];
      const coords = coordsStr.split(',').map(pair => {
        // allow multiple spaces; trim
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

    console.log('Parsed Features:', features.length);
    if (features.length > 0) {
      console.log('Sample Feature:', features[0]);
    }

    if (features.length === 0) {
      console.warn('No valid building geometries parsed; aborting draw');
      return;
    }

    // 2. Setup Projection
    // Calculate bounds to fit map
    const allCoords = features.flatMap(f => f.geometry.coordinates[0]);
    const xExtent = d3.extent(allCoords, d => d[0]);
    const yExtent = d3.extent(allCoords, d => d[1]);

    const projection = d3.geoIdentity()
      .reflectY(true) // SVG y is down, map y is up usually
      .fitSize([width, height], { type: 'FeatureCollection', features: features });

    console.log('Projection Scale:', projection.scale());
    console.log('Projection Translate:', projection.translate());

    const path = d3.geoPath().projection(projection);

    // 3. Prepare Color Scale
    // Filter stats for selected month
    const monthStats = stats.filter(s => s.month === selectedMonth);
    // stringify keys so buildingId types match between backend and features
    const statsMap = new Map(monthStats.map(s => [String(s.buildingId), s]));

    // Color scale: Red (0%) -> Yellow (50%) -> Green (100%)
    // User requested 0 to 100% range
    const colorScale = d3.scaleDiverging(d3.interpolateRdYlGn)
      .domain([0, 0.5, 1]) 
      .clamp(true);

    // 4. Draw Buildings
    // set svg sizing and responsive viewBox
    svg.attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', 'auto');

    const g = svg.append('g');

    g.selectAll('path')
      .data(features)
      .enter()
      .append('path')
      .attr('d', d => {
        try {
          return path(d);
        } catch (err) {
          console.warn('Path generation failed for feature', d, err);
          return null;
        }
      })
      .attr('fill', d => {
        const stat = statsMap.get(d.properties.buildingId);
        if (!stat) return '#eee'; // No data
        return colorScale(stat.SavingsRate);
      })
      .attr('stroke', '#ccc')
      .attr('stroke-width', 0.5)
      .on('mouseover', (event, d) => {
        const stat = statsMap.get(d.properties.buildingId);
        setTooltip({
          x: event.pageX,
          y: event.pageY,
          content: {
            id: d.properties.buildingId,
            type: d.properties.buildingType,
            savings: stat ? (stat.SavingsRate * 100).toFixed(1) + '%' : 'N/A',
            pop: stat ? stat.population : 0
          }
        });

        // Stats for the right-hand panel
        setHoverStats({
          id: d.properties.buildingId,
          type: d.properties.buildingType,
          savingsRate: stat ? stat.SavingsRate : null,
          population: stat ? stat.population : null
        });
        d3.select(event.target).attr('stroke', '#333').attr('stroke-width', 2);
      })
      .on('mouseout', (event) => {
        setTooltip(null);
        setHoverStats(null);
        d3.select(event.target).attr('stroke', '#ccc').attr('stroke-width', 0.5);
      });

    // Add Legend
    // ... (Simplified legend)

  }, [data, selectedMonth, containerWidth, containerHeight]);

  // Measure container size and update SVG dimensions responsively
  useEffect(() => {
    const setSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Limit the max width to avoid extremely large maps
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

  if (loading) return <div>Loading map data...</div>;

  if (!data || !data.stats) {
    console.warn('Data missing or invalid:', data);
    return <div>No data available</div>;
  }

  const cityStats = data.city_stats ? data.city_stats.find(s => s.month === selectedMonth) : null;
  const eduStats = data.education_stats ? data.education_stats.filter(s => s.month === selectedMonth) : null;

  return (
    <div className="flex flex-row w-full gap-8 items-start">
      {/* Map container */}
      <div className="flex-1 flex justify-center">
        <div ref={containerRef} className="relative border rounded-xl shadow-lg bg-white p-4 mb-8 w-full max-w-5xl">
          <svg ref={svgRef} width={containerWidth} height={containerHeight} className="bg-blue-50/30"></svg>

          {/* Optional small tooltip near cursor (can be removed if unwanted) */}
          {tooltip && (
            <div
              className="absolute z-10 bg-white p-3 rounded shadow-xl border border-gray-200 text-xs pointer-events-none"
              style={{ left: tooltip.x - 150, top: tooltip.y - 150 }}
            >
              <div className="font-semibold text-gray-800">Building #{tooltip.content.id}</div>
              <div className="text-gray-600">{tooltip.content.type}</div>
              <div className="mt-1">Population: {tooltip.content.pop}</div>
            </div>
          )}

          {/* Legend Overlay */}
          <div className="absolute bottom-6 right-6 bg-white/90 p-3 rounded-lg shadow-md text-xs">
            <div className="font-bold mb-2">Avg Savings Rate</div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500"></div> <span>0% (Break-even)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100"></div> <span>50% (Healthy)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500"></div> <span>100% (High Savings)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right-hand commentary & big number */}
      <div className="w-80 flex flex-col mt-4 pr-4">
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Current Selection</div>
          <div className="text-5xl font-extrabold text-gray-900 leading-tight">
            {hoverStats && hoverStats.savingsRate != null
              ? `${(hoverStats.savingsRate * 100).toFixed(1)}%`
              : cityStats && cityStats.avgSavingsRate != null
              ? `${(cityStats.avgSavingsRate * 100).toFixed(1)}%`
              : '--'}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {hoverStats
              ? `Building #${hoverStats.id} · ${hoverStats.type || 'Unknown type'}`
              : 'Hover over any building to explore its savings rate.'}
          </div>
        </div>

        <div className="text-sm text-gray-700 leading-relaxed">
          The geographic financial health map reveals clear spatial disparities in
          savings behavior across Engagement, OH. Each building segment is colored by
          its average savings rate, where deep reds indicate households operating at or
          near break-even, yellows reflect moderate financial security, and greens
          highlight areas with strong savings cushions.
          <br />
          <br />
          As you move across the map, look for small red pockets next to healthier
          zones. These local clusters of financial stress may signal neighborhoods
          where targeted support or policy interventions could have an impact.
        </div>
      </div>
    </div>
  );
};

export default GeographicFinancialHeatmap;

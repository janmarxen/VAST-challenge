# Frontend - React + D3.js Visualization

React frontend for VAST Challenge 3 data visualization dashboard.

## Structure

```
frontend/
├── public/
│   └── index.html              # HTML entry point
├── src/
│   ├── App.js                  # Main application with navigation
│   ├── App.css                 # Global styles
│   ├── index.js                # React entry point
│   ├── components/             # Visualization components
│   │   ├── BusinessViews/      # Question 1 components
│   │   │   ├── BusinessDashboard.js
│   │   │   ├── RevenueTimeSeries.js
│   │   │   ├── MarketShareStream.js
│   │   │   └── PerformanceScatter.js
│   │   ├── ResidentViews/      # Question 2 components
│   │   │   ├── ResidentDashboard.js
│   │   │   ├── WageVsCostScatter.js
│   │   │   ├── FinancialTrajectories.js
│   │   │   └── ResidentClusters.js
│   │   └── EmployerViews/      # Question 3 components
│   │       ├── EmployerDashboard.js
│   │       ├── TurnoverHeatmap.js
│   │       ├── JobFlowSankey.js
│   │       └── TransitionNetwork.js
│   └── utils/
│       └── api.js               # API fetch functions
├── package.json                 # Dependencies and scripts
└── Dockerfile                   # Docker configuration
```

## Development Setup

### Local Development (without Docker)

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm start
```

Application runs on `http://localhost:3000`

3. Build for production:
```bash
npm run build
```

## Component Organization

### Business Views (Question 1)
Each team member working on business prosperity should:
- Implement data processing in `backend/services/business_service.py`
- Implement D3 visualizations in respective component files
- Follow the React + D3 pattern: React for DOM, D3 for scales/paths

### Resident Views (Question 2)
Owner implements:
- Wage vs cost scatter plot with clustering
- Financial health trajectories with confidence bands
- Clustering visualization (t-SNE/UMAP)

### Employer Views (Question 3)
Owner implements:
- Turnover heatmap
- Job flow Sankey diagram
- Network graph with force simulation

## D3 Integration Pattern

**Best Practice**: Let React manage the DOM, use D3 for data transformations

```jsx
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

function MyVisualization({ data }) {
  const svgRef = useRef();

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    
    // D3 creates scales and generators
    const xScale = d3.scaleLinear()...
    const yScale = d3.scaleLinear()...
    const line = d3.line()...
    
    // React renders, D3 provides computed values
    svg.select('.path').attr('d', line(data));
  }, [data]);

  return <svg ref={svgRef}>...</svg>;
}
```

## Team Development Workflow

1. **Claim your dashboard**: Each person owns one of the three dashboards
2. **Implement visualizations**: Add D3 logic to component files
3. **Test with backend**: Ensure API integration works
4. **Push when working**: Coordinate with team to avoid conflicts

```bash
# Work on your branch
git checkout -b feature/your-dashboard
# Make changes
git add .
git commit -m "Implement [visualization]"
# Push and merge when ready
git push origin feature/your-dashboard
```

## API Integration

All API calls are centralized in `src/utils/api.js`. Import and use:

```javascript
import { fetchBusinessRevenue } from '../../utils/api';

// In component
fetchBusinessRevenue(employerId, startDate, endDate)
  .then(data => setData(data))
  .catch(error => console.error(error));
```

## Styling

- Global styles in `App.css`
- Component-specific styles can be added as `.module.css` files
- Visualization cards use consistent layout from global styles

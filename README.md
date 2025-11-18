# VAST Challenge 3: Economics Visualization Dashboard

Full-stack visualization dashboard for analyzing business prosperity, resident financial health, and employer turnover patterns in the fictional city of Engagement, Ohio.

## Project Structure

```
VAST-challenge/
├── backend/                    # Python Flask API
│   ├── routers/               # Modular API endpoints (Blueprints)
│   │   ├── business_router.py  # Question 1: Business prosperity
│   │   ├── resident_router.py  # Question 2: Resident financial health
│   │   └── employer_router.py  # Question 3: Employer health & turnover
│   ├── services/              # Data processing logic
│   │   ├── business_service.py
│   │   ├── resident_service.py
│   │   └── employer_service.py
│   ├── tests/                 # Unit tests for each router
│   ├── app.py                 # Flask application entry point
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile            # Backend container configuration
│   └── README.md             # Backend-specific documentation
├── frontend/                  # React + D3.js visualization
│   ├── src/
│   │   ├── components/
│   │   │   ├── BusinessViews/    # Question 1 visualizations
│   │   │   ├── ResidentViews/    # Question 2 visualizations
│   │   │   └── EmployerViews/    # Question 3 visualizations
│   │   ├── utils/
│   │   │   └── api.js            # API integration
│   │   └── App.js                # Main application
│   ├── package.json           # Node dependencies
│   ├── Dockerfile            # Frontend container configuration
│   └── README.md             # Frontend-specific documentation
├── data/                      # Data storage
│   ├── raw/                  # Original VAST Challenge CSV files
│   └── processed/            # Aggregated/transformed data
├── docker-compose.yml        # Container orchestration
└── README.md                 # This file
```

## Tech Stack

### Backend
- **Python 3.11** with Flask
- **Pandas** for data processing
- **Scikit-learn** for clustering and dimensionality reduction
- **Pytest** for unit testing

### Frontend
- **React 18** for UI components
- **D3.js v7** for data visualization
- **Axios** for API communication

### Infrastructure
- **Docker** & **Docker Compose** for containerization
- **PostgreSQL** (optional, for better performance than CSV)

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git

### Running with Docker (Recommended)

1. Clone the repository:
```bash
cd /path/to/VAST-challenge
```

2. Start all services:
```bash
docker-compose up --build
```

3. Access the application:
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:5000
   - **Health check**: http://localhost:5000/health

4. Stop services:
```bash
docker-compose down
```

### Running Locally (Development)

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Backend runs on `http://localhost:5000`

#### Frontend Setup
```bash
cd frontend
npm install
npm start
```

Frontend runs on `http://localhost:3000`

## Team Development Workflow

### Division of Work

The project is divided by the three VAST Challenge questions:

1. **Question 1: Business Prosperity** (`BusinessViews/`, `business_router.py`)
   - Revenue time series
   - Market share evolution
   - Performance metrics scatter plot

2. **Question 2: Resident Financial Health** (`ResidentViews/`, `resident_router.py`)
   - Wage vs cost of living
   - Financial health trajectories
   - Clustering analysis

3. **Question 3: Employer Health** (`EmployerViews/`, `employer_router.py`)
   - Turnover heatmap
   - Job flow Sankey diagram
   - Transition network graph

### Development Process

Each team member:
1. **Claims one topic** (Business, Resident, or Employer)
2. **Implements backend logic** in corresponding service file
3. **Implements frontend visualizations** in corresponding view components
4. **Writes unit tests** for their API routes
5. **Runs tests locally** before pushing

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/business-visualizations

# Make changes and commit
git add .
git commit -m "Implement revenue time series visualization"

# Run tests before pushing
cd backend
pytest tests/test_business_router.py

# If tests pass, push to main
git checkout main
git merge feature/business-visualizations
git push origin main
```

**Rule**: Only push to `main` after local tests pass. This prevents frontend issues from untested backend changes.

## API Endpoints

### Business Prosperity (`/api/business`)
- `GET /revenue-timeseries` - Monthly revenue trends
- `GET /market-share` - Market share over time
- `GET /performance-metrics` - Multi-dimensional business metrics

### Resident Financial Health (`/api/resident`)
- `GET /wage-vs-cost` - Wage vs cost of living data
- `GET /financial-trajectories` - Financial health trajectories
- `GET /clusters` - Clustering results
- `GET /parallel-coordinates` - Multi-dimensional data

### Employer Health (`/api/employer`)
- `GET /turnover-heatmap` - Turnover rate matrix
- `GET /job-flow` - Job transition flows (Sankey)
- `GET /transition-network` - Network graph data
- `GET /turnover-distribution` - Statistical distributions

## Testing

### Backend Tests
```bash
cd backend

# Run all tests
pytest

# Run specific test file
pytest tests/test_business_router.py

# Run with coverage
pytest --cov=routers --cov=services
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Data Processing Pipeline

1. **Extract**: Load raw CSV files from `data/raw/`
2. **Transform**: 
   - Aggregate 5-minute data to monthly summaries
   - Calculate derived metrics (turnover rates, cost of living index)
   - Perform clustering and dimensionality reduction
3. **Load**: Save processed data to `data/processed/` or PostgreSQL

Data transformation scripts should be added to `backend/services/` files.

## Deployment

### Production Build

```bash
# Build Docker images
docker-compose build

# Run in production mode
docker-compose -f docker-compose.yml up -d
```

### Environment Variables

Create `.env` file in project root:
```
FLASK_ENV=production
REACT_APP_API_URL=http://your-backend-url/api
```

## Visualization Guidelines

### D3 Integration Pattern

**Best Practice**: React manages DOM, D3 for data transformations

```jsx
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

function MyChart({ data }) {
  const svgRef = useRef();

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    
    // D3 creates scales
    const xScale = d3.scaleTime()...
    const yScale = d3.scaleLinear()...
    
    // React renders, D3 provides path data
    const line = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value));
    
    svg.select('.line').attr('d', line(data));
  }, [data]);

  return <svg ref={svgRef}>...</svg>;
}
```

### Interaction Techniques
- **Brushing and Linking**: Shared React state for coordinated views
- **Hover Tooltips**: D3 event handlers updating React state
- **Filtering**: Dropdown controls re-fetching filtered data

## Resources

- [VAST Challenge 3 Details](https://vast-challenge.github.io/2025/)
- [D3.js Documentation](https://d3js.org/)
- [React Documentation](https://react.dev/)
- [Flask Documentation](https://flask.palletsprojects.com/)

## Team

Data Visualization Project | EUMaster4HPC | Semester 3

---

For component-specific documentation, see:
- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)

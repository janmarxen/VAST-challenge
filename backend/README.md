# Backend - Flask API

Python Flask backend for VAST Challenge 3 data analysis and API serving.

## Structure

```
backend/
├── app.py                  # Main Flask application
├── routers/                # Modular API endpoints (Blueprints)
│   ├── business_router.py  # Question 1: Business prosperity
│   ├── resident_router.py  # Question 2: Resident financial health
│   └── employer_router.py  # Question 3: Employer health & turnover
├── services/               # Data processing logic layer
│   ├── business_service.py
│   ├── resident_service.py
│   └── employer_service.py
├── tests/                  # Unit tests for each router
│   ├── test_business_router.py
│   ├── test_resident_router.py
│   └── test_employer_router.py
├── requirements.txt        # Python dependencies
└── Dockerfile             # Docker container configuration
```

## Development Setup

### Running Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_business_router.py

# Run with coverage
pytest --cov=routers --cov=services
```

## API Endpoints

### Business Prosperity (`/api/business`)
- `GET /revenue-timeseries` - Monthly revenue trends
- `GET /market-share` - Market share over time
- `GET /performance-metrics` - Multi-dimensional metrics

### Resident Financial Health (`/api/resident`)
- `GET /wage-vs-cost` - Wage vs cost of living data
- `GET /financial-trajectories` - Financial health over time
- `GET /clusters` - Clustering results
- `GET /parallel-coordinates` - Multi-dimensional data

### Employer Health (`/api/employer`)
- `GET /turnover-heatmap` - Turnover rate matrix
- `GET /job-flow` - Job transition flows
- `GET /transition-network` - Network graph data
- `GET /turnover-distribution` - Statistical distributions

## Team Development Workflow

1. **Claim your topic**: Each team member owns one of the three routers
2. **Implement service layer**: Add data processing logic in corresponding service file
3. **Write tests**: Maintain your test file with comprehensive coverage
4. **Run tests locally**: Ensure all tests pass before pushing
5. **Push to main**: Only push when local tests pass

```bash
# Before pushing
pytest tests/test_your_router.py
# If all pass:
git add .
git commit -m "Implement [feature]"
git push origin main
```

## Data Processing

Place processed CSV files or database in `../data/` directory:
- `../data/processed/` for aggregated data
- `../data/raw/` for original VAST Challenge files

Update service files to load from these locations.

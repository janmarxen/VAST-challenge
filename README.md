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

### Running with Docker

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

4. Stop services:
```bash
docker-compose down
```

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

## Data Processing Pipeline

1. **Extract**: Load raw CSV files from `data/raw/`
2. **Transform**: 
   - Example: Aggregate 5-minute data to monthly summaries
   - Example: Calculate derived metrics (turnover rates, cost of living index)
   - Example: Perform clustering and dimensionality reduction
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
---

For component-specific documentation, see:
- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)

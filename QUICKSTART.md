# Quick Start Guide

## Prerequisites Check

Ensure you have:
- [ ] Docker and Docker Compose installed
- [ ] Git installed
- [ ] VAST Challenge dataset downloaded

## Step 1: Project Setup

```bash
# Navigate to project directory
cd "/home/jan/Documents/Career_Academics/EUMaster4HPC/Courses/Semester_3/Data Visualization/VAST-challenge"

# Initialize git repository (if not already done)
git init
git add .
git commit -m "Initial project structure"
```

## Step 2: Add VAST Challenge Data

Place your raw data CSV files in the `data/raw/` directory:

```bash
# Example: if data is in Downloads
cp ~/Downloads/VAST-Challenge-2022/*.csv ./data/raw/
```

## Step 3: Start with Docker 

```bash
# Build and start all services
docker-compose up --build
```

Wait for:
- Backend: `Running on http://0.0.0.0:5000`
- Frontend: `webpack compiled successfully`

Then open:
- **Dashboard**: http://localhost:8080
- **API Health Check**: http://localhost:5000/health

## Step 4: Verify Installation

Test backend API:
```bash
curl http://localhost:5000/health
# Should return: {"status":"healthy"}
```

"""
Unit tests for Resident Router API endpoints.
Each team member maintains their own test file.

Run tests with: pytest tests/test_resident_router.py
"""
import pytest
from app import app

@pytest.fixture
def client():
    """Create test client"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_wage_vs_cost_endpoint(client):
    """Test GET /api/resident/wage-vs-cost"""
    response = client.get('/api/resident/wage-vs-cost')
    assert response.status_code == 200
    data = response.get_json()
    assert 'participants' in data or 'wages' in data

def test_wage_vs_cost_with_filters(client):
    """Test filtering by education and household_size"""
    response = client.get('/api/resident/wage-vs-cost?education=Bachelors&household_size=2')
    assert response.status_code == 200

def test_financial_trajectories_endpoint(client):
    """Test GET /api/resident/financial-trajectories"""
    response = client.get('/api/resident/financial-trajectories')
    assert response.status_code == 200
    data = response.get_json()
    assert 'segments' in data or 'timeseries' in data

def test_clusters_endpoint(client):
    """Test GET /api/resident/clusters"""
    response = client.get('/api/resident/clusters')
    assert response.status_code == 200
    data = response.get_json()
    assert 'participants' in data or 'clusters' in data

def test_parallel_coordinates_endpoint(client):
    """Test GET /api/resident/parallel-coordinates"""
    response = client.get('/api/resident/parallel-coordinates')
    assert response.status_code == 200
    data = response.get_json()
    assert 'participants' in data or 'dimensions' in data

def test_invalid_endpoint(client):
    """Test invalid endpoint returns 404"""
    response = client.get('/api/resident/invalid')
    assert response.status_code == 404

# TODO: Add more comprehensive tests as data processing is implemented
# - Test clustering algorithm outputs
# - Test demographic filtering logic
# - Test data validation

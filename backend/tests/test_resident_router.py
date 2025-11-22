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
    # Expect a list of records
    assert isinstance(data, list)
    if len(data) > 0:
        assert 'participantId' in data[0]
        assert 'Income' in data[0]

def test_wage_vs_cost_with_filters(client):
    """Test filtering by education and household_size"""
    response = client.get('/api/resident/wage-vs-cost?education=Bachelors&household_size=2')
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)

def test_financial_trajectories_endpoint(client):
    """Test GET /api/resident/financial-trajectories"""
    response = client.get('/api/resident/financial-trajectories')
    assert response.status_code == 200
    data = response.get_json()
    assert 'by_education' in data
    assert 'by_cluster' in data
    assert 'overall' in data

def test_clusters_endpoint(client):
    """Test GET /api/resident/clusters"""
    response = client.get('/api/resident/clusters')
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    if len(data) > 0:
        assert 'Cluster' in data[0]

def test_parallel_coordinates_endpoint(client):
    """Test GET /api/resident/parallel-coordinates"""
    response = client.get('/api/resident/parallel-coordinates')
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    if len(data) > 0:
        assert 'Income' in data[0]
        assert 'SavingsRate' in data[0]

def test_invalid_endpoint(client):
    """Test invalid endpoint returns 404"""
    response = client.get('/api/resident/invalid')
    assert response.status_code == 404

def test_geographic_financial_health_endpoint(client):
    """Test GET /api/resident/geographic-financial-health"""
    response = client.get('/api/resident/geographic-financial-health')
    assert response.status_code == 200
    data = response.get_json()
    assert 'buildings' in data
    assert 'stats' in data
    assert isinstance(data['buildings'], list)
    assert isinstance(data['stats'], list)
    if len(data['buildings']) > 0:
        assert 'location' in data['buildings'][0]
        assert 'buildingId' in data['buildings'][0]

# TODO: Add more comprehensive tests as data processing is implemented
# - Test clustering algorithm outputs
# - Test demographic filtering logic
# - Test data validation

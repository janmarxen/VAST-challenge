"""
Unit tests for Employer Router API endpoints.

Run tests with: pytest tests/test_employer_router.py
"""
import pytest
from app import app


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_turnover_heatmap_returns_200(client):
    response = client.get('/api/employers/turnover-heatmap')
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, dict)
    assert 'data' in data


def test_job_flows_returns_200(client):
    response = client.get('/api/employers/job-flows')
    assert response.status_code == 200
    data = response.get_json()
    assert 'nodes' in data and 'links' in data


def test_transition_network_returns_200(client):
    response = client.get('/api/employers/transition-network')
    assert response.status_code == 200
    data = response.get_json()
    assert 'nodes' in data and 'edges' in data


def test_turnover_distribution_returns_200(client):
    response = client.get('/api/employers/turnover-distribution')
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, dict)
    assert 'data' in data


def test_invalid_endpoint_returns_404(client):
    response = client.get('/api/employers/invalid-endpoint')
    assert response.status_code == 404

"""
Unit tests for Employer Router API endpoints.

Run tests with: pytest tests/test_employer_router.py
"""
import pytest
from app import app
from services import employer_service


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


def test_turnover_heatmap_fill_missing_month_returns_all_employers(client, tmp_path, monkeypatch):
    # Patch service cache dir to a temp location and create minimal processed CSVs.
    monkeypatch.setattr(employer_service, 'CACHE_DIR', tmp_path)
    monkeypatch.setattr(employer_service, 'UNIFIED_CACHE_FILE', tmp_path / 'unified_employer_dataset.pkl')

    # Universe: 3 employers
    meta_csv = tmp_path / 'employer_meta.csv'
    meta_csv.write_text(
        'employerId,location_x,location_y,buildingId,buildingType\n'
        '1,0,0,10,Commercial\n'
        '2,0,0,20,Residential\n'
        '3,0,0,30,Commercial\n'
    )

    # Only 1 employer has an event for the month
    turnover_csv = tmp_path / 'turnover.csv'
    turnover_csv.write_text(
        'month,employerId,hires,quits,net_change,turnoverRate\n'
        '2022-04,2,1,1,0,0.5\n'
    )

    resp = client.get('/api/employers/turnover-heatmap?month=2022-04&fill_missing=true')
    assert resp.status_code == 200
    payload = resp.get_json()
    assert isinstance(payload, dict)
    assert payload.get('meta', {}).get('filledMissing') is True
    rows = payload.get('data')
    assert isinstance(rows, list)
    assert len(rows) == 3

    by_emp = {int(r['employerId']): r for r in rows}
    assert by_emp[2]['hires'] == 1 and by_emp[2]['quits'] == 1
    assert by_emp[1]['hires'] == 0 and by_emp[1]['quits'] == 0
    assert float(by_emp[1]['turnoverRate']) == 0.0


def test_geographic_turnover_fill_missing_month_returns_all_employers(client, tmp_path, monkeypatch):
    monkeypatch.setattr(employer_service, 'CACHE_DIR', tmp_path)
    monkeypatch.setattr(employer_service, 'UNIFIED_CACHE_FILE', tmp_path / 'unified_employer_dataset.pkl')

    meta_csv = tmp_path / 'employer_meta.csv'
    meta_csv.write_text(
        'employerId,location_x,location_y,buildingId,buildingType\n'
        '1,0,0,10,Commercial\n'
        '2,0,0,20,Residential\n'
        '3,0,0,30,Commercial\n'
    )

    turnover_csv = tmp_path / 'turnover.csv'
    turnover_csv.write_text(
        'month,employerId,hires,quits,net_change,turnoverRate\n'
        '2022-05,3,0,0,0,0\n'
    )

    resp = client.get('/api/employers/geographic-turnover?month=2022-05&fill_missing=true')
    assert resp.status_code == 200
    rows = resp.get_json()
    assert isinstance(rows, list)
    assert len(rows) == 3

    # Ensure shape includes location + building columns
    sample = rows[0]
    for key in ('month', 'employerId', 'buildingId', 'buildingType', 'turnoverRate', 'hires', 'quits'):
        assert key in sample


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

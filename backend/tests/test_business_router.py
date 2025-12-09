"""
Unit tests for Business Router API endpoints.
Tests the Restaurant and Pub analysis API.

Run tests with: pytest tests/test_business_router.py
"""
import pytest
from app import app


@pytest.fixture
def client():
    """Create test client"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


class TestVenueTimeseriesEndpoint:
    """Tests for GET /api/business/venue-timeseries"""
    
    def test_venue_timeseries_returns_200(self, client):
        """Test basic endpoint returns 200"""
        response = client.get('/api/business/venue-timeseries')
        assert response.status_code == 200
        data = response.get_json()
        assert 'timeseries' in data
        assert 'max_occupancy' in data
    
    def test_venue_timeseries_with_venue_id(self, client):
        """Test filtering by venue_id"""
        response = client.get('/api/business/venue-timeseries?venue_id=445')
        assert response.status_code == 200
        data = response.get_json()
        assert 'timeseries' in data
    
    def test_venue_timeseries_with_venue_type_restaurant(self, client):
        """Test filtering by venue_type Restaurant"""
        response = client.get('/api/business/venue-timeseries?venue_type=Restaurant')
        assert response.status_code == 200
        data = response.get_json()
        assert 'timeseries' in data
    
    def test_venue_timeseries_with_venue_type_pub(self, client):
        """Test filtering by venue_type Pub"""
        response = client.get('/api/business/venue-timeseries?venue_type=Pub')
        assert response.status_code == 200
        data = response.get_json()
        assert 'timeseries' in data
    
    def test_venue_timeseries_invalid_venue_type(self, client):
        """Test invalid venue_type returns 400"""
        response = client.get('/api/business/venue-timeseries?venue_type=Invalid')
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
    
    def test_venue_timeseries_with_date_range(self, client):
        """Test filtering by date range"""
        response = client.get('/api/business/venue-timeseries?start_date=2022-03-01&end_date=2022-03-31')
        assert response.status_code == 200
        data = response.get_json()
        assert 'timeseries' in data
    
    def test_venue_timeseries_with_participant(self, client):
        """Test filtering by participant_id"""
        response = client.get('/api/business/venue-timeseries?participant_id=619')
        assert response.status_code == 200
        data = response.get_json()
        assert 'timeseries' in data
    
    def test_venue_timeseries_resolution_day(self, client):
        """Test day resolution"""
        response = client.get('/api/business/venue-timeseries?resolution=day')
        assert response.status_code == 200
    
    def test_venue_timeseries_resolution_week(self, client):
        """Test week resolution"""
        response = client.get('/api/business/venue-timeseries?resolution=week')
        assert response.status_code == 200
    
    def test_venue_timeseries_resolution_month(self, client):
        """Test month resolution"""
        response = client.get('/api/business/venue-timeseries?resolution=month')
        assert response.status_code == 200
    
    def test_venue_timeseries_invalid_resolution(self, client):
        """Test invalid resolution returns 400"""
        response = client.get('/api/business/venue-timeseries?resolution=invalid')
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data


class TestMarketShareEndpoint:
    """Tests for GET /api/business/market-share"""
    
    def test_market_share_returns_200(self, client):
        """Test basic endpoint returns 200"""
        response = client.get('/api/business/market-share')
        assert response.status_code == 200
        data = response.get_json()
        assert 'venues' in data
        assert 'total_spending' in data
    
    def test_market_share_with_venue_type(self, client):
        """Test filtering by venue_type"""
        response = client.get('/api/business/market-share?venue_type=Restaurant')
        assert response.status_code == 200
        data = response.get_json()
        assert 'venues' in data
        # All venues should be Restaurant
        for venue in data['venues']:
            assert venue['venue_type'] == 'Restaurant'
    
    def test_market_share_with_date_range(self, client):
        """Test filtering by date range"""
        response = client.get('/api/business/market-share?start_date=2022-03-01&end_date=2022-03-31')
        assert response.status_code == 200
        data = response.get_json()
        assert 'venues' in data
    
    def test_market_share_invalid_venue_type(self, client):
        """Test invalid venue_type returns 400"""
        response = client.get('/api/business/market-share?venue_type=Invalid')
        assert response.status_code == 400
    
    def test_market_share_percentages_sum_to_100(self, client):
        """Test that percentage shares sum to approximately 100"""
        response = client.get('/api/business/market-share')
        assert response.status_code == 200
        data = response.get_json()
        if data['venues']:
            total_percentage = sum(v['percentage'] for v in data['venues'])
            assert abs(total_percentage - 100) < 0.01  # Allow small floating point error


class TestVenuesEndpoint:
    """Tests for GET /api/business/venues"""
    
    def test_venues_returns_200(self, client):
        """Test basic endpoint returns 200"""
        response = client.get('/api/business/venues')
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
    
    def test_venues_contains_restaurants_and_pubs(self, client):
        """Test that venues list contains both types"""
        response = client.get('/api/business/venues')
        assert response.status_code == 200
        data = response.get_json()
        venue_types = set(v['venue_type'] for v in data)
        assert 'Restaurant' in venue_types
        assert 'Pub' in venue_types
    
    def test_venues_have_required_fields(self, client):
        """Test that venues have required fields"""
        response = client.get('/api/business/venues')
        assert response.status_code == 200
        data = response.get_json()
        for venue in data:
            assert 'venue_id' in venue
            assert 'venue_type' in venue
            assert 'max_occupancy' in venue


class TestUnifiedDatasetEndpoint:
    """Tests for GET /api/business/unified-dataset"""
    
    def test_unified_dataset_returns_200(self, client):
        """Test basic endpoint returns 200"""
        response = client.get('/api/business/unified-dataset')
        assert response.status_code == 200
        data = response.get_json()
        assert 'total_records' in data
        assert 'sample' in data
    
    def test_unified_dataset_with_limit(self, client):
        """Test custom limit parameter"""
        response = client.get('/api/business/unified-dataset?limit=10')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['sample']) <= 10
    
    def test_unified_dataset_invalid_limit(self, client):
        """Test invalid limit returns 400"""
        response = client.get('/api/business/unified-dataset?limit=0')
        assert response.status_code == 400
        
        response = client.get('/api/business/unified-dataset?limit=20000')
        assert response.status_code == 400
    
    def test_unified_dataset_has_required_columns(self, client):
        """Test that unified dataset has all required columns"""
        response = client.get('/api/business/unified-dataset?limit=1')
        assert response.status_code == 200
        data = response.get_json()
        if data['sample']:
            record = data['sample'][0]
            assert 'timestamp' in record
            assert 'participant_id' in record
            assert 'venue_id' in record
            assert 'venue_type' in record
            assert 'amount' in record
            assert 'max_occupancy' in record


class TestLegacyEndpoints:
    """Tests for backward compatibility endpoints"""
    
    def test_revenue_timeseries_legacy(self, client):
        """Test legacy revenue-timeseries endpoint"""
        response = client.get('/api/business/revenue-timeseries')
        assert response.status_code == 200
    
    def test_performance_metrics_legacy(self, client):
        """Test legacy performance-metrics endpoint"""
        response = client.get('/api/business/performance-metrics')
        assert response.status_code == 200
        data = response.get_json()
        assert 'venues' in data


def test_invalid_endpoint(client):
    """Test invalid endpoint returns 404"""
    response = client.get('/api/business/invalid')
    assert response.status_code == 404

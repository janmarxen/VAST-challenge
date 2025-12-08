"""
Business API Router
Handles Restaurant and Pub analysis endpoints.

Endpoints:
- GET /api/business/venue-timeseries: Time series data per venue
- GET /api/business/market-share: Market share distribution
- GET /api/business/venues: List all venues
- GET /api/business/unified-dataset: Sample of unified dataset
"""
from flask import Blueprint, jsonify, request
import pandas as pd
from services.business_service import (
    get_venue_timeseries,
    get_market_share_data,
    get_venue_list,
    get_unified_dataset_sample
)

bp = Blueprint('business', __name__)


@bp.route('/venue-timeseries', methods=['GET'])
def venue_timeseries():
    """
    Get time series data for venues.
    
    Query params:
    - venue_id: Optional, filter by specific venue
    - venue_type: Optional, filter by "Restaurant" or "Pub"
    - participant_id: Optional, filter by participant
    - start_date: Optional, filter start date (YYYY-MM-DD)
    - end_date: Optional, filter end date (YYYY-MM-DD)
    - resolution: Optional, time aggregation ('hour', 'day', 'week', 'month'), default 'day'
    
    Returns:
    - timeseries: Array of {timestamp, checkin_count, total_spending}
    - max_occupancy: Venue capacity (if single venue selected)
    """
    venue_id = request.args.get('venue_id', type=int)
    venue_type = request.args.get('venue_type')
    participant_id = request.args.get('participant_id', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    resolution = request.args.get('resolution', default='day')
    
    # Validate venue_type if provided
    if venue_type and venue_type not in ['Restaurant', 'Pub']:
        return jsonify({'error': 'venue_type must be "Restaurant" or "Pub"'}), 400
    
    # Validate resolution
    valid_resolutions = ['hour', 'day', 'week', 'month']
    if resolution not in valid_resolutions:
        return jsonify({'error': f'resolution must be one of {valid_resolutions}'}), 400
    
    try:
        data = get_venue_timeseries(
            venue_id=venue_id,
            venue_type=venue_type,
            participant_id=participant_id,
            start_date=start_date,
            end_date=end_date,
            resolution=resolution
        )
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/market-share', methods=['GET'])
def market_share():
    """
    Get market share distribution for venues.
    
    Query params:
    - venue_type: Optional, filter by "Restaurant" or "Pub"
    - start_date: Optional, filter start date (YYYY-MM-DD)
    - end_date: Optional, filter end date (YYYY-MM-DD)
    
    Returns:
    - venues: Array of {venue_id, venue_type, total_spending, visit_count, percentage}
    - total_spending: Total spending across all venues
    """
    venue_type = request.args.get('venue_type')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Validate venue_type if provided
    if venue_type and venue_type not in ['Restaurant', 'Pub']:
        return jsonify({'error': 'venue_type must be "Restaurant" or "Pub"'}), 400
    
    try:
        data = get_market_share_data(
            start_date=start_date,
            end_date=end_date,
            venue_type=venue_type
        )
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/venues', methods=['GET'])
def venues():
    """
    Get list of all venues with their details.
    
    Returns:
    - Array of {venue_id, venue_type, max_occupancy, food_cost/hourly_cost}
    """
    try:
        data = get_venue_list()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/unified-dataset', methods=['GET'])
def unified_dataset():
    """
    Get a sample of the unified dataset for debugging/exploration.
    
    Query params:
    - limit: Number of records to return (default 100)
    
    Returns:
    - total_records: Total number of records in dataset
    - sample: Array of {timestamp, participant_id, venue_id, venue_type, amount, max_occupancy}
    """
    limit = request.args.get('limit', default=100, type=int)
    
    if limit < 1 or limit > 10000:
        return jsonify({'error': 'limit must be between 1 and 10000'}), 400
    
    try:
        data = get_unified_dataset_sample(limit=limit)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Legacy endpoints for backward compatibility
@bp.route('/revenue-timeseries', methods=['GET'])
def revenue_timeseries():
    """
    Legacy endpoint - redirects to venue-timeseries.
    """
    return venue_timeseries()


@bp.route('/performance-metrics', methods=['GET'])
def performance_metrics():
    """
    Legacy endpoint - returns venue list as performance metrics.
    """
    try:
        data = get_venue_list()
        return jsonify({'venues': data, 'metrics': []}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

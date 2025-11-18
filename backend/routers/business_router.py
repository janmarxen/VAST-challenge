"""
Business Prosperity API Router
Handles Question 1: Which businesses are thriving or struggling over time

Endpoints:
- GET /api/business/revenue-timeseries: Monthly revenue trends per employer
- GET /api/business/market-share: Market share changes over time
- GET /api/business/performance-metrics: Multi-dimensional business metrics
"""
from flask import Blueprint, jsonify, request
import pandas as pd
from services.business_service import (
    get_revenue_timeseries,
    get_market_share_data,
    get_business_performance_metrics
)

bp = Blueprint('business', __name__)

@bp.route('/revenue-timeseries', methods=['GET'])
def revenue_timeseries():
    """
    Get revenue time series data for businesses.
    
    Query params:
    - employer_id: Optional, filter by specific employer
    - start_date: Optional, filter start date (YYYY-MM-DD)
    - end_date: Optional, filter end date (YYYY-MM-DD)
    """
    employer_id = request.args.get('employer_id', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        data = get_revenue_timeseries(employer_id, start_date, end_date)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/market-share', methods=['GET'])
def market_share():
    """
    Get market share distribution over time for stream graph visualization.
    """
    try:
        data = get_market_share_data()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/performance-metrics', methods=['GET'])
def performance_metrics():
    """
    Get multi-dimensional performance metrics for scatter plot matrix.
    
    Returns: employee_count, avg_wage, revenue, retention_rate per employer
    """
    try:
        data = get_business_performance_metrics()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

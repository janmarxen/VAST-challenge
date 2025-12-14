"""
Employer API Router

Routes under `/api/employers/*`.

Follows the same structure and error-handling style as `resident_router.py`.
"""
from flask import Blueprint, jsonify, request
from services.employer_service import (
    get_turnover_heatmap_data,
    get_job_flow_data,
    get_transition_network_data,
    get_turnover_distribution,
    get_employer_meta_data,
    get_employee_counts_data,
    get_tenure_data,
    get_city_metrics,
    get_employer_market_share_data,
    get_geographic_turnover_data,
    get_employer_financials,
)

employer_bp = Blueprint('employer', __name__)


@employer_bp.route('/api/employers/financials', methods=['GET'])
def financials():
    """Return employer financial estimates."""
    try:
        data = get_employer_financials()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@employer_bp.route('/api/employers/geographic-turnover', methods=['GET'])
def geographic_turnover():
    """Return geographic turnover data."""
    try:
        month = request.args.get('month')
        fill_missing = request.args.get('fill_missing', 'false').lower() in ('1', 'true', 'yes')
        data = get_geographic_turnover_data(month=month, fill_missing=fill_missing)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@employer_bp.route('/api/employers/market-share', methods=['GET'])
def market_share():
    """Return employer market share data (monthly avg employment)."""
    try:
        data = get_employer_market_share_data()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@employer_bp.route('/api/employers/city-metrics', methods=['GET'])
def city_metrics():
    """Return aggregated city-wide metrics per month."""
    try:
        data = get_city_metrics()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@employer_bp.route('/api/employers/turnover-heatmap', methods=['GET'])
def turnover_heatmap():
    """Return turnover heatmap data."""
    try:
        month = request.args.get('month')
        fill_missing = request.args.get('fill_missing', 'false').lower() in ('1', 'true', 'yes')
        data = get_turnover_heatmap_data(month=month, fill_missing=fill_missing)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@employer_bp.route('/api/employers/job-flows', methods=['GET'])
def job_flows():
    """Return job flow (Sankey) data."""
    # Optional query params can be forwarded to service later
    try:
        data = get_job_flow_data()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@employer_bp.route('/api/employers/transition-network', methods=['GET'])
def transition_network():
    """Return transition network graph data."""
    try:
        data = get_transition_network_data()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@employer_bp.route('/api/employers/turnover-distribution', methods=['GET'])
def turnover_distribution():
    """Return turnover distribution statistics."""
    try:
        data = get_turnover_distribution()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@employer_bp.route('/api/employers/meta', methods=['GET'])
def employer_meta():
    """Return employer metadata (location, building, etc)."""
    try:
        data = get_employer_meta_data()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@employer_bp.route('/api/employers/employee-counts', methods=['GET'])
def employee_counts():
    """Return daily employee counts by employer."""
    try:
        data = get_employee_counts_data()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@employer_bp.route('/api/employers/tenure', methods=['GET'])
def tenure():
    """Return tenure statistics by employer."""
    try:
        data = get_tenure_data()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

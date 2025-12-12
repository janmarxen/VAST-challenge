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
)

employer_bp = Blueprint('employer', __name__)


@employer_bp.route('/api/employers/turnover-heatmap', methods=['GET'])
def turnover_heatmap():
    """Return turnover heatmap data."""
    try:
        data = get_turnover_heatmap_data()
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

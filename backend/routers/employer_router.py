"""
Employer Health & Turnover API Router
Handles Question 3: Employment patterns and turnover analysis

Endpoints:
- GET /api/employer/turnover-heatmap: Turnover rates by employer and time
- GET /api/employer/job-flow: Job transition flow data for Sankey diagram
- GET /api/employer/transition-network: Network graph data for job transitions
- GET /api/employer/turnover-distribution: Statistical distribution by industry
"""
from flask import Blueprint, jsonify, request
from services.employer_service import (
    get_turnover_heatmap_data,
    get_job_flow_data,
    get_transition_network_data,
    get_turnover_distribution
)

bp = Blueprint('employer', __name__)

@bp.route('/turnover-heatmap', methods=['GET'])
def turnover_heatmap():
    """
    Get turnover rate matrix for heatmap visualization.
    
    Returns: employers x months matrix with turnover rates
    """
    try:
        data = get_turnover_heatmap_data()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/job-flow', methods=['GET'])
def job_flow():
    """
    Get job transition flow data for Sankey/Alluvial diagram.
    
    Query params:
    - time_period: Optional, filter by quarter (Q1, Q2, etc.)
    """
    time_period = request.args.get('time_period')
    
    try:
        data = get_job_flow_data(time_period)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/transition-network', methods=['GET'])
def transition_network():
    """
    Get network graph data for job transitions.
    
    Returns: nodes (employers) and edges (transitions with weights)
    """
    try:
        data = get_transition_network_data()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/turnover-distribution', methods=['GET'])
def turnover_distribution():
    """
    Get turnover rate distribution statistics by employer category.
    
    Returns: boxplot data (median, Q1, Q3, outliers) per category
    """
    try:
        data = get_turnover_distribution()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

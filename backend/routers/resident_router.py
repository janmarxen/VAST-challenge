"""
Resident Financial Health API Router
Handles Question 2: How wages compare to cost of living, similar patterns

Endpoints:
- GET /api/resident/wage-vs-cost: Wage vs cost of living scatter data
- GET /api/resident/financial-trajectories: Time series of financial health by group
- GET /api/resident/clusters: Clustering results for similar financial patterns
- GET /api/resident/parallel-coordinates: Multi-dimensional data for PCP
"""
from flask import Blueprint, jsonify, request
from services.resident_service import (
    get_wage_vs_cost_data,
    get_financial_trajectories,
    get_resident_clusters,
    get_parallel_coordinates_data,
    get_geographic_financial_health,
    get_expense_analysis_data
)

bp = Blueprint('resident', __name__)

@bp.route('/expense-analysis', methods=['GET'])
def expense_analysis():
    """
    Get analysis of expenses vs health/stability metrics.
    """
    month = request.args.get('month')
    try:
        data = get_expense_analysis_data(month)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/wage-vs-cost', methods=['GET'])
def wage_vs_cost():
    """
    Get wage vs cost of living data for scatter plot.
    
    Query params:
    - education: Optional, filter by education level
    - household_size: Optional, filter by household size
    - haveKids: Optional, filter by whether participants have kids (true/false)
    - month: Optional, filter by specific month (YYYY-MM)
    """
    education = request.args.get('education')
    household_size = request.args.get('household_size', type=int)
    have_kids_str = request.args.get('haveKids')
    month = request.args.get('month')
    
    have_kids = None
    if have_kids_str is not None:
        have_kids = have_kids_str.lower() == 'true'
    
    try:
        data = get_wage_vs_cost_data(education, household_size, have_kids, month)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/financial-trajectories', methods=['GET'])
def financial_trajectories():
    """
    Get financial health trajectories over time, segmented by demographics.
    
    Returns: median balance, P25/P75 percentiles per demographic group per month
    """
    try:
        data = get_financial_trajectories()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/clusters', methods=['GET'])
def clusters():
    """
    Get clustering results identifying similar financial patterns.
    
    Returns: participant data with cluster assignments
    """
    try:
        data = get_resident_clusters()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/parallel-coordinates', methods=['GET'])
def parallel_coordinates():
    """
    Get multi-dimensional data for parallel coordinates plot.
    
    Query params:
    - haveKids: Optional, filter by whether participants have kids (true/false)
    - month: Optional, filter by specific month (YYYY-MM)
    
    Returns: wage, rent, food_cost, balance, age, education per participant sample
    """
    have_kids_str = request.args.get('haveKids')
    month = request.args.get('month')
    
    have_kids = None
    if have_kids_str is not None:
        have_kids = have_kids_str.lower() == 'true'
    
    try:
        data = get_parallel_coordinates_data(have_kids, month)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/geographic-financial-health', methods=['GET'])
def geographic_financial_health():
    """
    Get geographic distribution of financial health (savings rate) by building over time.
    """
    try:
        data = get_geographic_financial_health()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

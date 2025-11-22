"""
Resident Service Layer
Contains data processing logic for resident financial health analysis.
"""
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
import os

# Global cache for data
_DATA_CACHE = {}

def _get_data():
    """
    Load and process data with caching.
    Returns:
        merged_df: Participant data with aggregated financial metrics and clusters
        financial_df: Raw financial journal data with month column
    """
    if 'merged' in _DATA_CACHE:
        return _DATA_CACHE['merged'], _DATA_CACHE['financial'], _DATA_CACHE['monthly_financial']
    
    # Define paths relative to this file
    # In Docker, the app is in /app, so data is in /app/data/raw
    # But locally it might be different. We use a robust way.
    
    # Check if we are in docker (simple check)
    if os.path.exists('/app/data/raw'):
        base_path = '/app/data/raw'
    else:
        # Local development fallback
        base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data/raw'))
    
    print(f"Loading data from: {base_path}")
    
    # Load Participants
    participants = pd.read_csv(os.path.join(base_path, 'Participants.csv'))
    
    # Load Financial Journal
    # This file is large, so we process it carefully
    financial = pd.read_csv(os.path.join(base_path, 'FinancialJournal.csv'))
    financial['timestamp'] = pd.to_datetime(financial['timestamp'])
    financial['month'] = financial['timestamp'].dt.to_period('M')
    
    # Calculate Monthly Aggregates per Participant
    # Pivot to get columns for each category
    monthly_financial = financial.groupby(['participantId', 'month', 'category'])['amount'].sum().unstack(fill_value=0).reset_index()
    
    # Ensure columns exist
    expected_cols = ['Wage', 'Shelter', 'Food', 'Recreation', 'Education', 'RentAdjustment']
    for col in expected_cols:
        if col not in monthly_financial.columns:
            monthly_financial[col] = 0
            
    # Calculate Income and Cost of Living
    # Expenses are negative in the CSV, Wage is positive.
    monthly_financial['Income'] = monthly_financial['Wage']
    # Cost of Living is the sum of expenses (negated to be positive for comparison)
    monthly_financial['CostOfLiving'] = -(monthly_financial['Shelter'] + monthly_financial['Food'] + monthly_financial['Recreation'] + monthly_financial['Education'] + monthly_financial['RentAdjustment'])
    # SavingsRate per month for downstream filtering
    monthly_financial['SavingsRate'] = np.where(monthly_financial['Income'] > 0,
                                               (monthly_financial['Income'] - monthly_financial['CostOfLiving']) / monthly_financial['Income'],
                                               0)
    
    # Aggregate to Participant Level (Average Monthly)
    participant_financial = monthly_financial.groupby('participantId').agg({
        'Income': 'mean',
        'CostOfLiving': 'mean',
        'Wage': 'mean',
        'Shelter': 'mean',
        'Food': 'mean',
        'Recreation': 'mean',
        'Education': 'mean'
    }).reset_index()
    
    # Merge with Demographics
    merged = pd.merge(participants, participant_financial, on='participantId')
    
    # Add Savings Rate
    merged['Savings'] = merged['Income'] - merged['CostOfLiving']
    # Avoid division by zero
    merged['SavingsRate'] = np.where(merged['Income'] > 0, merged['Savings'] / merged['Income'], 0)
    
    # Perform Clustering
    # Features for clustering: Age, HouseholdSize, Income, CostOfLiving
    features = merged[['age', 'householdSize', 'Income', 'CostOfLiving']].copy()
    # Simple normalization
    features = (features - features.mean()) / features.std()
    # Fill NaNs if any
    features = features.fillna(0)
    
    kmeans = KMeans(n_clusters=4, random_state=42)
    merged['Cluster'] = kmeans.fit_predict(features)
    
    # Load Buildings for Geometry
    buildings = pd.read_csv(os.path.join(base_path, 'Buildings.csv'))
    
    # Load Apartments for Location
    apartments = pd.read_csv(os.path.join(base_path, 'Apartments.csv'))
    
    # Load Participant Status Log (Sample) to map Participant -> Apartment
    # We use the first log file as a baseline for residence
    status_log = pd.read_csv(os.path.join(base_path, 'ParticipantStatusLogs1.csv'))
    # Get unique mapping of participantId -> apartmentId
    # Assuming residence is relatively stable or we take the first known location
    residence_map = status_log[['participantId', 'apartmentId']].drop_duplicates(subset=['participantId'])
    
    _DATA_CACHE['merged'] = merged
    _DATA_CACHE['financial'] = financial
    _DATA_CACHE['monthly_financial'] = monthly_financial
    _DATA_CACHE['buildings'] = buildings
    _DATA_CACHE['apartments'] = apartments
    _DATA_CACHE['residence_map'] = residence_map
    
    return merged, financial, monthly_financial

def get_wage_vs_cost_data(education=None, household_size=None, have_kids=None, month=None):
    """
    Calculate wage vs cost of living for scatter plot.
    """
    try:
        merged_df, _, monthly_financial = _get_data()
        
        if month:
            # Use specific month data
            df = monthly_financial[monthly_financial['month'].astype(str) == month].copy()
            # Merge with static attributes (demographics + cluster) from merged_df
            # We use the global cluster assignment
            static_attrs = merged_df[['participantId', 'educationLevel', 'householdSize', 'haveKids', 'age', 'Cluster']]
            df = pd.merge(df, static_attrs, on='participantId')
        else:
            # Use average data
            df = merged_df.copy()
        
        # Apply filters
        if education:
            df = df[df['educationLevel'] == education]
        if household_size is not None:
            df = df[df['householdSize'] == household_size]
        if have_kids is not None:
            df = df[df['haveKids'] == have_kids]
            
        # Convert month to string if it exists to avoid serialization error
        if 'month' in df.columns:
            df['month'] = df['month'].astype(str)
            
        # Return relevant columns
        return df.to_dict(orient='records')
    except Exception as e:
        print("Error in get_wage_vs_cost_data:")
        traceback.print_exc()
        raise e

def get_financial_trajectories():
    """
    Calculate financial health trajectories by demographic segment.
    Returns monthly aggregated income/expenses for different groups.
    """
    try:
        merged_df, financial_df, monthly_financial = _get_data()
        
        # We need to link financial back to participants to get demographics/clusters
        # Use monthly_financial which is already summed by participant/month
        # This fixes the issue of averaging individual transactions
        
        # Merge with demographics
        participants_map = merged_df[['participantId', 'educationLevel', 'Cluster']]
        merged_ts = pd.merge(monthly_financial, participants_map, on='participantId')
        
        # Melt the dataframe to get 'category' and 'amount' columns back for grouping
        # monthly_financial has columns: participantId, month, Wage, Shelter, Food, etc.
        value_vars = ['Wage', 'Shelter', 'Food', 'Recreation', 'Education', 'RentAdjustment']
        melted = pd.melt(merged_ts, id_vars=['participantId', 'month', 'educationLevel', 'Cluster'], 
                         value_vars=value_vars, var_name='category', value_name='amount')
        
        # Helper to aggregate by group
        def aggregate_by_group(group_col):
            # Group by Month, GroupCol, Category
            # We take the mean of the monthly totals across participants in the group
            grouped = melted.groupby(['month', group_col, 'category'])['amount'].mean().unstack(fill_value=0).reset_index()
            grouped['month'] = grouped['month'].astype(str)
            return grouped.to_dict(orient='records')

        # For overall, we add a dummy column
        melted['All'] = 'All'

        return {
            'by_education': aggregate_by_group('educationLevel'),
            'by_cluster': aggregate_by_group('Cluster'),
            'overall': aggregate_by_group('All')
        }
    except Exception as e:
        print("Error in get_financial_trajectories:")
        traceback.print_exc()
        raise e

def get_resident_clusters():
    """
    Return participant data with cluster labels.
    """
    try:
        df, _, _ = _get_data()
        return df[['participantId', 'Cluster']].to_dict(orient='records')
    except Exception as e:
        print("Error in get_resident_clusters:")
        traceback.print_exc()
        raise e

def get_parallel_coordinates_data(have_kids=None, month=None):
    """
    Get multi-dimensional data for PCP.
    """
    try:
        merged_df, _, monthly_financial = _get_data()
        
        if month:
            # Use specific month data
            df = monthly_financial[monthly_financial['month'].astype(str) == month].copy()
            # Merge with static attributes
            static_attrs = merged_df[['participantId', 'educationLevel', 'householdSize', 'haveKids', 'age', 'Cluster']]
            df = pd.merge(df, static_attrs, on='participantId')
            
            # Calculate SavingsRate for this month
            df['Savings'] = df['Income'] - df['CostOfLiving']
            df['SavingsRate'] = np.where(df['Income'] > 0, df['Savings'] / df['Income'], 0)
        else:
            df = merged_df.copy()
        
        # Apply filter if provided
        if have_kids is not None:
            df = df[df['haveKids'] == have_kids]
        
        # Select relevant columns
        cols = ['participantId', 'educationLevel', 'age', 'householdSize', 'Income', 'CostOfLiving', 'SavingsRate', 'Cluster']
        # If month is in df, we might want to keep it or just ensure it doesn't break things if we selected it.
        # But cols doesn't include 'month', so it should be fine unless we add it.
        # However, let's be safe and convert it if we ever decide to include it or if it leaks in.
        
        result_df = df[cols].copy()
        return result_df.to_dict(orient='records')
    except Exception as e:
        print("Error in get_parallel_coordinates_data:")
        traceback.print_exc()
        raise e

import traceback

def get_geographic_financial_health():
    """
    Aggregate financial health by building/location over time.
    Returns:
        buildings_geo: GeoJSON-like structure of buildings
        financial_data: List of {month, buildingId, avgSavingsRate, population}
    """
    try:
        merged_df, financial_df, _ = _get_data()
        buildings = _DATA_CACHE['buildings']
        apartments = _DATA_CACHE['apartments']
        residence_map = _DATA_CACHE['residence_map']
        
        # 1. Calculate Monthly Financial Health per Participant
        # We need monthly data, not just the average in merged_df
        # Re-use the logic from _get_data but keep month
        monthly_financial = financial_df.groupby(['participantId', 'month', 'category'])['amount'].sum().unstack(fill_value=0).reset_index()
        
        # Ensure columns
        expected_cols = ['Wage', 'Shelter', 'Food', 'Recreation', 'Education', 'RentAdjustment']
        for col in expected_cols:
            if col not in monthly_financial.columns:
                monthly_financial[col] = 0
                
        monthly_financial['Income'] = monthly_financial['Wage']
        monthly_financial['CostOfLiving'] = -(monthly_financial['Shelter'] + monthly_financial['Food'] + monthly_financial['Recreation'] + monthly_financial['Education'] + monthly_financial['RentAdjustment'])
        monthly_financial['SavingsRate'] = np.where(monthly_financial['Income'] > 0, (monthly_financial['Income'] - monthly_financial['CostOfLiving']) / monthly_financial['Income'], 0)
        
        # 2. Link Participant -> Apartment -> Building
        # Merge monthly data with residence map
        df = pd.merge(monthly_financial, residence_map, on='participantId', how='inner')
        
        # Merge with Apartments to get buildingId
        df = pd.merge(df, apartments[['apartmentId', 'buildingId']], on='apartmentId', how='inner')
        
        # 3. Aggregate by Building and Month
        building_stats = df.groupby(['buildingId', 'month']).agg({
            'SavingsRate': 'mean',
            'participantId': 'count'  # Population count
        }).reset_index()
        
        building_stats.rename(columns={'participantId': 'population'}, inplace=True)
        building_stats['month'] = building_stats['month'].astype(str)

        # 4. Calculate City-wide and Demographic Stats
        # Merge with demographics
        participants_demo = merged_df[['participantId', 'educationLevel']]
        monthly_financial_demo = pd.merge(monthly_financial, participants_demo, on='participantId', how='left')

        # City-wide Stats
        city_stats = monthly_financial_demo.groupby('month').agg({
            'Income': 'mean',
            'CostOfLiving': 'mean',
            'SavingsRate': 'mean',
            'Wage': 'mean',
            'Shelter': 'mean',
            'Food': 'mean',
            'Recreation': 'mean',
            'Education': 'mean'
        }).reset_index()
        city_stats['month'] = city_stats['month'].astype(str)

        # Education Stats
        education_stats = monthly_financial_demo.groupby(['month', 'educationLevel']).agg({
            'SavingsRate': 'mean',
            'Income': 'mean'
        }).reset_index()
        education_stats['month'] = education_stats['month'].astype(str)

        # Household Size Stats
        # Merge with household size
        participants_hh = merged_df[['participantId', 'householdSize']]
        monthly_financial_hh = pd.merge(monthly_financial, participants_hh, on='participantId', how='left')
        
        household_stats = monthly_financial_hh.groupby(['month', 'householdSize']).agg({
            'SavingsRate': 'mean',
            'Income': 'mean',
            'CostOfLiving': 'mean'
        }).reset_index()
        household_stats['month'] = household_stats['month'].astype(str)
        
        # 5. Prepare Geometry (Buildings)
        # We need to parse the WKT polygon to something frontend can use (or just send WKT and parse there)
        # For simplicity, let's send WKT and buildingId
        buildings_data = buildings[['buildingId', 'location', 'buildingType']].to_dict(orient='records')
        
        return {
            'buildings': buildings_data,
            'stats': building_stats.to_dict(orient='records'),
            'city_stats': city_stats.to_dict(orient='records'),
            'education_stats': education_stats.to_dict(orient='records'),
            'household_stats': household_stats.to_dict(orient='records')
        }
    except Exception as e:
        print("Error in get_geographic_financial_health:")
        traceback.print_exc()
        raise e

def get_expense_analysis_data(month=None):
    """
    Analyze relationship between expenses and participant status (Hunger, Financial Stability).
    Uses a sample of status logs to estimate health metrics.
    """
    try:
        merged_df, _, monthly_financial = _get_data()
        
        # Load Status Logs (Sample)
        # We use Logs1 as a representative sample. 
        # In a real scenario, we might want to process more, but for speed we stick to one or a few.
        
        # Robust path finding similar to _get_data
        if os.path.exists('/app/data/raw'):
            base_path = '/app/data/raw'
        else:
            base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data/raw'))

        status_log_path = os.path.join(base_path, 'ParticipantStatusLogs1.csv')
        print(f"Loading status logs from: {status_log_path}")
        status_logs = pd.read_csv(status_log_path)
        
        # Aggregate Status Metrics per Participant
        # 1. Hunger Rate: % of logs where status is 'Hungry' or 'Starving'
        status_logs['is_hungry'] = status_logs['hungerStatus'].isin(['Hungry', 'Starving']).astype(int)
        status_logs['is_unstable'] = (status_logs['financialStatus'] == 'Unstable').astype(int)
        
        status_metrics = status_logs.groupby('participantId').agg({
            'is_hungry': 'mean',
            'is_unstable': 'mean',
            'dailyFoodBudget': 'mean'
        }).reset_index()
        
        status_metrics.rename(columns={
            'is_hungry': 'HungerRate', 
            'is_unstable': 'InstabilityRate',
            'dailyFoodBudget': 'AvgFoodBudget'
        }, inplace=True)
        
        # Merge with Financial Data
        # If month is provided, use that month's financial data
        if month:
            financial_data = monthly_financial[monthly_financial['month'].astype(str) == month].copy()
        else:
            # Fallback to average if no month (or use merged_df)
            financial_data = merged_df.copy()
            
        # Ensure we have the columns we need
        # monthly_financial has 'Food', 'Income', 'CostOfLiving' etc.
        
        # Merge financial data with status metrics
        # We also need Cluster and Education from merged_df if using monthly_financial
        if month:
            static_attrs = merged_df[['participantId', 'Cluster', 'educationLevel']]
            financial_data = pd.merge(financial_data, static_attrs, on='participantId')
        
        analysis_df = pd.merge(financial_data, status_metrics, on='participantId', how='inner')
        
        # Prepare response
        # We want to send data for scatter plots
        
        return {
            'food_vs_hunger': analysis_df[['participantId', 'Food', 'HungerRate', 'Cluster', 'educationLevel']].to_dict(orient='records'),
            'financial_vs_stability': analysis_df[['participantId', 'SavingsRate', 'InstabilityRate', 'Cluster', 'Income']].to_dict(orient='records')
        }
        
    except Exception as e:
        print("Error in get_expense_analysis_data:")
        traceback.print_exc()
        raise e



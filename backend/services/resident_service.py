"""
Resident Service Layer
Contains data processing logic for resident financial health analysis.
"""
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
import os
import pickle
from pathlib import Path

# Global cache for data
_DATA_CACHE = {}


_EDUCATION_LEVEL_CATEGORIES = [
    'Low',
    'HighSchoolOrCollege',
    'Bachelors',
    'Graduate',
    'Unknown',
]


def _coerce_have_kids_to_int(series: pd.Series) -> pd.Series:
    if series is None:
        return pd.Series(dtype='int64')

    if series.dtype == bool:
        return series.astype('int64')

    text = series.astype(str).str.strip().str.lower()
    truthy = {'true', 't', 'yes', 'y'}
    falsy = {'false', 'f', 'no', 'n', 'none', 'nan', ''}

    out = pd.Series(np.nan, index=series.index, dtype='float64')
    out[text.isin(truthy)] = 1
    out[text.isin(falsy)] = 0

    remaining = out.isna()
    if remaining.any():
        numeric = pd.to_numeric(series[remaining], errors='coerce')
        out.loc[remaining] = numeric.fillna(0).clip(0, 1)

    return out.fillna(0).astype('int64')


def _build_resident_cluster_features(merged: pd.DataFrame) -> pd.DataFrame:
    """Build the feature matrix used for resident clustering.

    Keeps the existing numeric features and adds:
    - `haveKids` (0/1)
    - One-hot encoded `educationLevel`
    """
    numeric_cols = ['age', 'householdSize', 'Income', 'CostOfLiving', 'Education', 'SavingsRate']
    features = merged[numeric_cols].copy()

    if 'Food' in merged.columns:
        features['Food'] = merged['Food']
    if 'Recreation' in merged.columns:
        features['Recreation'] = merged['Recreation']

    if 'haveKids' in merged.columns:
        features['haveKids'] = _coerce_have_kids_to_int(merged['haveKids'])

    if 'educationLevel' in merged.columns:
        education = merged['educationLevel'].fillna('Unknown')
        education = pd.Categorical(education, categories=_EDUCATION_LEVEL_CATEGORIES)
        dummies = pd.get_dummies(education, prefix='educationLevel')
        features = pd.concat([features, dummies], axis=1)

    return features

def _resolve_data_dirs():
    repo_root = Path(__file__).resolve().parents[2]
    if Path('/app/data').exists():
        data_root = Path('/app/data')
    else:
        data_root = repo_root / 'data'
    raw_dir = data_root / 'raw'
    processed_dir = data_root / 'processed'
    processed_dir.mkdir(parents=True, exist_ok=True)
    return raw_dir, processed_dir

RAW_DATA_DIR, PROCESSED_DATA_DIR = _resolve_data_dirs()

def _latest_raw_mtime(raw_dir: Path) -> float:
    csv_files = list(raw_dir.glob('*.csv'))
    if not csv_files:
        return 0
    return max(f.stat().st_mtime for f in csv_files)

def _load_disk_cache(processed_dir: Path, raw_mtime: float):
    cache_path = processed_dir / 'resident_data_cache.pkl'
    if not cache_path.exists():
        return None
    try:
        with cache_path.open('rb') as f:
            payload = pickle.load(f)
    except Exception as exc:
        print(f"Failed to load resident cache: {exc}")
        return None
    if payload.get('raw_mtime', 0) < raw_mtime:
        return None
    return payload.get('frames')

def _persist_disk_cache(frames: dict, processed_dir: Path, raw_mtime: float):
    cache_path = processed_dir / 'resident_data_cache.pkl'
    try:
        with cache_path.open('wb') as f:
            pickle.dump({'raw_mtime': raw_mtime, 'frames': frames}, f)
    except Exception as exc:
        print(f"Failed to persist resident cache: {exc}")


def _sample_dataframe(df, max_rows=1200, random_state=42):
    if df is None:
        return None
    if len(df) <= max_rows:
        return df
    return df.sample(n=max_rows, random_state=random_state)


def _load_status_metrics(max_rows=400000):
    raw_latest_mtime = _latest_raw_mtime(RAW_DATA_DIR)
    cache_path = PROCESSED_DATA_DIR / 'status_metrics_cache.pkl'

    if 'status_metrics' in _DATA_CACHE:
        return _DATA_CACHE['status_metrics']

    if cache_path.exists():
        try:
            with cache_path.open('rb') as f:
                payload = pickle.load(f)
            if payload.get('raw_mtime', 0) >= raw_latest_mtime:
                _DATA_CACHE['status_metrics'] = payload.get('data')
                if _DATA_CACHE['status_metrics'] is not None:
                    return _DATA_CACHE['status_metrics']
        except Exception as exc:
            print(f"Failed to load status metrics cache: {exc}")

    status_log_path = RAW_DATA_DIR / 'ParticipantStatusLogs1.csv'
    print(f"Loading status logs from: {status_log_path}")
    usecols = ['participantId', 'hungerStatus', 'financialStatus', 'dailyFoodBudget']
    status_logs = pd.read_csv(status_log_path, usecols=usecols)

    if len(status_logs) > max_rows:
        status_logs = status_logs.sample(n=max_rows, random_state=42)

    status_logs['is_hungry'] = status_logs['hungerStatus'].isin(['Hungry', 'Starving']).astype(int)

    # NOTE: We no longer compute per-row 'is_unstable' or expose an InstabilityRate.
    # Downstream analyses should use composite metrics (FinancialStress) computed from
    # financial history and negative-savings behavior instead of a single coarse
    # probability derived from the status logs.

    status_metrics = status_logs.groupby('participantId').agg({
        'is_hungry': 'mean',
        'dailyFoodBudget': 'mean'
    }).reset_index()

    status_metrics.rename(columns={
        'is_hungry': 'HungerRate',
        'dailyFoodBudget': 'AvgFoodBudget'
    }, inplace=True)

    _DATA_CACHE['status_metrics'] = status_metrics
    try:
        with cache_path.open('wb') as f:
            pickle.dump({'raw_mtime': raw_latest_mtime, 'data': status_metrics}, f)
    except Exception as exc:
        print(f"Failed to persist status metrics cache: {exc}")

    return status_metrics

def _get_data():
    """
    Load and process data with caching.
    Returns:
        merged_df: Participant data with aggregated financial metrics and clusters
        financial_df: Raw financial journal data with month column
    """
    if 'merged' in _DATA_CACHE:
        return _DATA_CACHE['merged'], _DATA_CACHE['financial'], _DATA_CACHE['monthly_financial']

    raw_latest_mtime = _latest_raw_mtime(RAW_DATA_DIR)
    disk_frames = _load_disk_cache(PROCESSED_DATA_DIR, raw_latest_mtime)
    if disk_frames:
        _DATA_CACHE.update(disk_frames)
        return _DATA_CACHE['merged'], _DATA_CACHE['financial'], _DATA_CACHE['monthly_financial']

    base_path = str(RAW_DATA_DIR)
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
    expected_cols = ['Wage', 'Shelter', 'Food', 'Recreation', 'Education']
    for col in expected_cols:
        if col not in monthly_financial.columns:
            monthly_financial[col] = 0
            
    # Calculate Income and Cost of Living
    # Expenses are negative in the CSV, Wage is positive.
    monthly_financial['Income'] = monthly_financial['Wage']
    # Cost of Living is the sum of expenses (negated to be positive for comparison)
    monthly_financial['CostOfLiving'] = -(monthly_financial['Shelter'] + monthly_financial['Food'] + monthly_financial['Recreation'] + monthly_financial['Education'])
    # SavingsRate per month for downstream filtering
    monthly_financial['SavingsRate'] = np.where(monthly_financial['Income'] > 0,
                                               (monthly_financial['Income'] - monthly_financial['CostOfLiving']) / monthly_financial['Income'],
                                               0)

    # Exclude the first month from analysis (drop earliest month across the dataset)
    try:
        first_month = monthly_financial['month'].min()
        if pd.notnull(first_month):
            # Filter out rows that belong to the earliest month
            monthly_financial = monthly_financial[monthly_financial['month'] != first_month].reset_index(drop=True)
            print(f"Excluding first month from analysis: {first_month}")
    except Exception:
        # In case 'month' isn't comparable or missing, skip silently
        pass
    
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
    # Features for clustering: existing numeric financial/demographic metrics
    # plus one-hot encoded educationLevel and haveKids (0/1).
    features = _build_resident_cluster_features(merged)

    # Simple normalization (robust to constant columns)
    means = features.mean(numeric_only=True)
    stds = features.std(numeric_only=True).replace(0, 1)
    features = (features - means) / stds
    features = features.replace([np.inf, -np.inf], np.nan).fillna(0)
    
    kmeans = KMeans(n_clusters=3, random_state=42)
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
    
    frames_to_cache = {
        'merged': merged,
        'financial': financial,
        'monthly_financial': monthly_financial,
        'buildings': buildings,
        'apartments': apartments,
        'residence_map': residence_map
    }

    _DATA_CACHE.update(frames_to_cache)
    _persist_disk_cache(frames_to_cache, PROCESSED_DATA_DIR, raw_latest_mtime)
    
    return merged, financial, monthly_financial

def get_wage_vs_cost_data(education=None, household_size=None, have_kids=None, month=None):
    """
    Calculate wage vs cost of living for scatter plot.
    """
    try:
        merged_df, _, monthly_financial = _get_data()
        
        if month and month != 'all':
            # Use specific month data
            df = monthly_financial[monthly_financial['month'].astype(str) == month].copy()
            # Merge with static attributes (demographics + cluster) from merged_df
            # We use the global cluster assignment
            static_attrs = merged_df[['participantId', 'educationLevel', 'householdSize', 'haveKids', 'age', 'Cluster']]
            df = pd.merge(df, static_attrs, on='participantId')
        elif month == 'all':
            # Use all monthly data
            df = monthly_financial.copy()
            df['month'] = df['month'].astype(str)
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
        cols = ['participantId', 'Income', 'CostOfLiving', 'Cluster', 'haveKids']
        if month == 'all':
            cols.append('month')
            
        return df[cols].to_dict(orient='records')
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
        value_vars = ['Wage', 'Shelter', 'Food', 'Recreation', 'Education']
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
        
        if month and month != 'all':
            # Use specific month data
            df = monthly_financial[monthly_financial['month'].astype(str) == month].copy()
            # Merge with static attributes
            static_attrs = merged_df[['participantId', 'educationLevel', 'householdSize', 'haveKids', 'age', 'Cluster']]
            df = pd.merge(df, static_attrs, on='participantId')
            
            # Calculate SavingsRate for this month
            df['Savings'] = df['Income'] - df['CostOfLiving']
            df['SavingsRate'] = np.where(df['Income'] > 0, df['Savings'] / df['Income'], 0)
        elif month == 'all':
            # Use all monthly data
            df = monthly_financial.copy()
            df['month'] = df['month'].astype(str)
            
            # Merge with static attributes
            static_attrs = merged_df[['participantId', 'educationLevel', 'householdSize', 'haveKids', 'age', 'Cluster']]
            df = pd.merge(df, static_attrs, on='participantId')
        else:
            df = merged_df.copy()
        
        # Apply filter if provided
        if have_kids is not None:
            df = df[df['haveKids'] == have_kids]
        
        # Select relevant columns
        cols = ['participantId', 'educationLevel', 'age', 'householdSize', 'Income', 'CostOfLiving', 'SavingsRate', 'Cluster', 'haveKids']
        if month == 'all':
            cols.append('month')
        
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
        expected_cols = ['Wage', 'Shelter', 'Food', 'Recreation', 'Education']
        for col in expected_cols:
            if col not in monthly_financial.columns:
                monthly_financial[col] = 0
                
        monthly_financial['Income'] = monthly_financial['Wage']
        monthly_financial['CostOfLiving'] = -(monthly_financial['Shelter'] + monthly_financial['Food'] + monthly_financial['Recreation'] + monthly_financial['Education'])
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
        
        status_metrics = _load_status_metrics()
        
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

        # Build a composite FinancialStress metric to increase dynamic range for visualization.
        # Components:
        #  - NegativeSavingsFraction: fraction of months where SavingsRate < 0 (0..1)
        #  - AvgExpenseIncomeRatioScaled: mean(CostOfLiving / Income) across months, scaled to 0..1 via r/(r+1)
        try:
            pm = monthly_financial[['participantId', 'SavingsRate', 'Income', 'CostOfLiving']].copy()
            pm['NegativeSavings'] = (pm['SavingsRate'] < 0).astype(int)
            neg_frac = pm.groupby('participantId')['NegativeSavings'].mean().reset_index().rename(columns={'NegativeSavings': 'NegativeSavingsFraction'})

            pm['ExpenseIncomeRatio'] = np.where(pm['Income'] > 0, pm['CostOfLiving'] / pm['Income'], np.nan)
            avg_ratio = pm.groupby('participantId')['ExpenseIncomeRatio'].mean().reset_index().rename(columns={'ExpenseIncomeRatio': 'AvgExpenseIncomeRatio'})

            # Merge the per-participant metrics into analysis_df
            analysis_df = pd.merge(analysis_df, neg_frac, on='participantId', how='left')
            analysis_df = pd.merge(analysis_df, avg_ratio, on='participantId', how='left')

            # Scale the expense/income ratio into 0..1 range
            analysis_df['AvgExpenseIncomeRatioScaled'] = analysis_df['AvgExpenseIncomeRatio'] / (analysis_df['AvgExpenseIncomeRatio'] + 1)
            # For participants where ratio is NaN (e.g., zero income across months), treat as high-stress
            analysis_df['AvgExpenseIncomeRatioScaled'].fillna(1.0, inplace=True)

            # Fill missing NegativeSavingsFraction with 0 (conservative)
            analysis_df['NegativeSavingsFraction'].fillna(0.0, inplace=True)

            # Compose the FinancialStress metric (weights chosen to emphasize negative savings)
            analysis_df['FinancialStress'] = (
                0.6 * analysis_df['NegativeSavingsFraction']
                + 0.4 * analysis_df['AvgExpenseIncomeRatioScaled']
            )
        except Exception:
            # If anything goes wrong computing the composite metric, fall back to NegativeSavingsFraction if present
            if 'NegativeSavingsFraction' in analysis_df.columns:
                analysis_df['FinancialStress'] = analysis_df['NegativeSavingsFraction'].fillna(0)
            else:
                analysis_df['FinancialStress'] = 0

        # Reduce payload sizes for expensive visualizations
        food_vs_hunger_df = analysis_df[['participantId', 'Food', 'HungerRate', 'Cluster', 'educationLevel']].copy()
        food_vs_hunger_df.replace([np.inf, -np.inf], np.nan, inplace=True)
        food_vs_hunger_df.dropna(subset=['Food', 'HungerRate'], inplace=True)
        food_vs_hunger_df['Food'] = food_vs_hunger_df['Food'].abs()
        food_vs_hunger_df = _sample_dataframe(food_vs_hunger_df, max_rows=1500)

        # Include FinancialStress in the returned stability dataframe so frontend can use it if desired
        financial_vs_stability_df = analysis_df[['participantId', 'SavingsRate', 'FinancialStress', 'Cluster', 'Income']].copy()
        financial_vs_stability_df.replace([np.inf, -np.inf], np.nan, inplace=True)
        financial_vs_stability_df.dropna(subset=['SavingsRate'], inplace=True)
        financial_vs_stability_df = _sample_dataframe(financial_vs_stability_df, max_rows=1500)
        
        return {
            'food_vs_hunger': food_vs_hunger_df.to_dict(orient='records'),
            'financial_vs_stability': financial_vs_stability_df.to_dict(orient='records'),
            'sampled_counts': {
                'food_vs_hunger': len(food_vs_hunger_df),
                'financial_vs_stability': len(financial_vs_stability_df)
            }
        }
        
    except Exception as e:
        print("Error in get_expense_analysis_data:")
        traceback.print_exc()
        raise e


def _compute_gini(values):
    """
    Compute the Gini coefficient for a given array of values.
    
    The Gini coefficient measures inequality on a scale of 0 to 1:
    - 0 = perfect equality (everyone has the same value)
    - 1 = perfect inequality (one person has everything)
    
    Formula: G = (2 * sum(i * y_i)) / (n * sum(y_i)) - (n + 1) / n
    where y_i are the sorted values and i is the rank (1-indexed).
    """
    values = np.array(values, dtype=float)
    # Remove NaN and infinite values
    values = values[np.isfinite(values)]
    if len(values) == 0:
        return np.nan
    
    # For Gini on income/savings, we need non-negative values
    # Shift values if there are negatives (for SavingsRate which can be negative)
    if np.any(values < 0):
        values = values - values.min()
    
    # Handle edge case where all values are zero
    if np.sum(values) == 0:
        return 0.0
    
    # Sort values
    sorted_values = np.sort(values)
    n = len(sorted_values)
    
    # Compute Gini using the formula
    cumsum = np.cumsum(sorted_values)
    gini = (2 * np.sum((np.arange(1, n + 1) * sorted_values))) / (n * np.sum(sorted_values)) - (n + 1) / n
    
    return float(gini)


def get_inequality_over_time():
    """
    Compute Gini coefficient for Income and SavingsRate over time.
    
    Returns monthly Gini coefficients showing how inequality evolves
    across the 15-month observation period.
    """
    try:
        merged_df, _, monthly_financial = _get_data()
        
        # monthly_financial has: participantId, month, Income, CostOfLiving, SavingsRate, etc.
        results = []
        
        # Group by month and compute Gini for each
        for month, month_data in monthly_financial.groupby('month'):
            income_values = month_data['Income'].dropna()
            savings_rate_values = month_data['SavingsRate'].dropna()
            
            # Filter to positive incomes for meaningful Gini
            positive_income = income_values[income_values > 0]
            
            gini_income = _compute_gini(positive_income) if len(positive_income) > 10 else np.nan
            gini_savings = _compute_gini(savings_rate_values) if len(savings_rate_values) > 10 else np.nan
            
            results.append({
                'month': str(month),
                'giniIncome': round(gini_income, 4) if not np.isnan(gini_income) else None,
                'giniSavingsRate': round(gini_savings, 4) if not np.isnan(gini_savings) else None,
                'sampleSize': len(month_data),
                'meanIncome': round(float(income_values.mean()), 2) if len(income_values) > 0 else None,
                'meanSavingsRate': round(float(savings_rate_values.mean()), 4) if len(savings_rate_values) > 0 else None
            })
        
        # Sort by month
        results.sort(key=lambda x: x['month'])
        
        return {
            'timeline': results,
            'description': {
                'giniIncome': 'Gini coefficient of monthly income distribution (0=equality, 1=inequality)',
                'giniSavingsRate': 'Gini coefficient of savings rate distribution',
                'formula': 'G = (2 * Σ(i × yᵢ)) / (n × Σyᵢ) − (n+1)/n, where yᵢ are sorted values'
            }
        }
        
    except Exception as e:
        print("Error in get_inequality_over_time:")
        import traceback
        traceback.print_exc()
        raise e



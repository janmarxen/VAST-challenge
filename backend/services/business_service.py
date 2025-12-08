"""
Business Service Layer
Contains data processing logic for Restaurant and Pub analysis.

Creates a unified dataset combining check-in activity, inferred spending,
and capacity information for Restaurants and Pubs.
"""
import pandas as pd
import numpy as np
from pathlib import Path
from functools import lru_cache
import os

# Path to raw data files - handle both Docker and local environments
# In Docker: backend is at /app, data is mounted at /app/data
# Locally: backend is at ./backend, data is at ./data
_APP_DIR = Path(__file__).parent.parent  # /app or ./backend
_DATA_BASE = _APP_DIR / "data"  # /app/data or ./backend/data

# Fallback for local development where data is at project root level
if not _DATA_BASE.exists():
    _DATA_BASE = _APP_DIR.parent / "data"  # ./data (project root)

DATA_DIR = _DATA_BASE / "raw"
CACHE_DIR = _DATA_BASE / "processed"
UNIFIED_CACHE_FILE = CACHE_DIR / "unified_business_dataset.parquet"

print(f"[business_service] DATA_DIR resolved to: {DATA_DIR}")
print(f"[business_service] CACHE_DIR resolved to: {CACHE_DIR}")
print(f"[business_service] DATA_DIR exists: {DATA_DIR.exists()}")
print(f"[business_service] CACHE_DIR exists: {CACHE_DIR.exists()}")


@lru_cache(maxsize=1)
def _load_checkin_journal():
    """Load and cache CheckinJournal.csv"""
    print("[business_service] Loading CheckinJournal.csv...")
    df = pd.read_csv(DATA_DIR / "CheckinJournal.csv")
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    print(f"[business_service] Loaded {len(df)} check-in records")
    return df


@lru_cache(maxsize=1)
def _load_financial_journal():
    """Load and cache FinancialJournal.csv"""
    print("[business_service] Loading FinancialJournal.csv...")
    df = pd.read_csv(DATA_DIR / "FinancialJournal.csv")
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    print(f"[business_service] Loaded {len(df)} financial records")
    return df


@lru_cache(maxsize=1)
def _load_restaurants():
    """Load and cache Restaurants.csv"""
    print("[business_service] Loading Restaurants.csv...")
    df = pd.read_csv(DATA_DIR / "Restaurants.csv")
    # Clean column name (has trailing space in original)
    df.columns = df.columns.str.strip()
    print(f"[business_service] Loaded {len(df)} restaurants")
    return df


@lru_cache(maxsize=1)
def _load_pubs():
    """Load and cache Pubs.csv"""
    print("[business_service] Loading Pubs.csv...")
    df = pd.read_csv(DATA_DIR / "Pubs.csv")
    print(f"[business_service] Loaded {len(df)} pubs")
    return df


def _load_cached_unified_dataset():
    """Try to load the unified dataset from cache."""
    print(f"[business_service] Checking for cache file at {UNIFIED_CACHE_FILE}")
    print(f"[business_service] Cache file exists: {UNIFIED_CACHE_FILE.exists()}")
    if UNIFIED_CACHE_FILE.exists():
        try:
            print(f"[business_service] Loading cached unified dataset from {UNIFIED_CACHE_FILE}...")
            df = pd.read_parquet(UNIFIED_CACHE_FILE)
            print(f"[business_service] Loaded {len(df)} records from cache")
            return df
        except Exception as e:
            print(f"[business_service] ERROR loading cache: {e}")
            return None
    return None


def _save_unified_dataset_to_cache(df):
    """Save the unified dataset to cache."""
    # Ensure cache directory exists
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[business_service] Saving unified dataset to {UNIFIED_CACHE_FILE}...")
    df.to_parquet(UNIFIED_CACHE_FILE, index=False)
    print(f"[business_service] Saved {len(df)} records to cache")


# Global variable to store the dataset in memory after first load
_unified_dataset_cache = None


def build_unified_dataset():
    """
    Build the unified analysis dataset for Restaurants and Pubs.
    
    Returns a DataFrame with columns:
    - timestamp: datetime of the check-in
    - participant_id: unique participant id
    - venue_id: restaurantId or pubId
    - venue_type: "Restaurant" or "Pub"
    - amount: money spent for this visit (inferred)
    - max_occupancy: venue capacity
    """
    global _unified_dataset_cache
    
    # Check memory cache first
    if _unified_dataset_cache is not None:
        print("[business_service] Returning dataset from memory cache")
        return _unified_dataset_cache
    
    # Check disk cache
    cached = _load_cached_unified_dataset()
    if cached is not None:
        _unified_dataset_cache = cached
        return cached
    
    print("[business_service] Building unified dataset from scratch...")
    
    # Step 1: Load and filter check-ins
    print("[business_service] Step 1: Loading and filtering check-ins...")
    checkins = _load_checkin_journal()
    checkins = checkins[checkins['venueType'].isin(['Restaurant', 'Pub'])].copy()
    print(f"[business_service] Filtered to {len(checkins)} Restaurant/Pub check-ins")
    
    # Rename columns
    checkins = checkins.rename(columns={
        'participantId': 'participant_id',
        'venueId': 'venue_id',
        'venueType': 'venue_type'
    })
    
    # Step 2: Load venue capacities and create mappings
    print("[business_service] Step 2: Adding venue capacities...")
    restaurants = _load_restaurants()
    pubs = _load_pubs()
    
    # Create capacity mappings
    restaurant_capacity = restaurants.set_index('restaurantId')['maxOccupancy'].to_dict()
    pub_capacity = pubs.set_index('pubId')['maxOccupancy'].to_dict()
    
    # Add max_occupancy based on venue_type and venue_id
    def get_capacity(row):
        if row['venue_type'] == 'Restaurant':
            return restaurant_capacity.get(row['venue_id'], np.nan)
        else:
            return pub_capacity.get(row['venue_id'], np.nan)
    
    checkins['max_occupancy'] = checkins.apply(get_capacity, axis=1)
    print(f"[business_service] Added capacity info to {len(checkins)} check-ins")
    
    # Step 3: Infer spending per check-in
    print("[business_service] Step 3: Inferring spending per check-in...")
    financial = _load_financial_journal()
    
    # Filter transactions: Food for Restaurants, Recreation for Pubs
    food_transactions = financial[financial['category'] == 'Food'].copy()
    food_transactions = food_transactions.rename(columns={'participantId': 'participant_id'})
    food_transactions['amount'] = food_transactions['amount'].abs()  # Make positive
    print(f"[business_service] Found {len(food_transactions)} Food transactions")
    
    recreation_transactions = financial[financial['category'] == 'Recreation'].copy()
    recreation_transactions = recreation_transactions.rename(columns={'participantId': 'participant_id'})
    recreation_transactions['amount'] = recreation_transactions['amount'].abs()  # Make positive
    print(f"[business_service] Found {len(recreation_transactions)} Recreation transactions")
    
    # Attribution: For each check-in, find the nearest financial transaction after it
    def attribute_spending(checkin_df, transaction_df, venue_type_name):
        """Attribute spending to check-ins using nearest transaction after check-in."""
        print(f"[business_service] Attributing spending for {len(checkin_df)} {venue_type_name} check-ins...")
        amounts = []
        
        # Sort transactions by participant and timestamp for efficient lookup
        transaction_df = transaction_df.sort_values(['participant_id', 'timestamp'])
        
        # Group transactions by participant for faster lookup
        txn_by_participant = {pid: group for pid, group in transaction_df.groupby('participant_id')}
        
        total = len(checkin_df)
        for i, (_, checkin) in enumerate(checkin_df.iterrows()):
            if i % 10000 == 0 and i > 0:
                print(f"[business_service] Processing {venue_type_name} check-in {i}/{total} ({100*i/total:.1f}%)")
            
            pid = checkin['participant_id']
            checkin_time = checkin['timestamp']
            
            if pid not in txn_by_participant:
                amounts.append(0.0)
                continue
            
            participant_txns = txn_by_participant[pid]
            # Find transactions after check-in time
            future_txns = participant_txns[participant_txns['timestamp'] >= checkin_time]
            
            if len(future_txns) == 0:
                amounts.append(0.0)
            else:
                # Get the nearest (first) transaction after check-in
                amounts.append(future_txns.iloc[0]['amount'])
        
        print(f"[business_service] Completed attribution for {venue_type_name}")
        return amounts
    
    # Split checkins by venue type
    restaurant_checkins = checkins[checkins['venue_type'] == 'Restaurant'].copy()
    pub_checkins = checkins[checkins['venue_type'] == 'Pub'].copy()
    
    # Attribute spending
    restaurant_checkins['amount'] = attribute_spending(restaurant_checkins, food_transactions, "Restaurant")
    pub_checkins['amount'] = attribute_spending(pub_checkins, recreation_transactions, "Pub")
    
    # Combine back
    unified = pd.concat([restaurant_checkins, pub_checkins], ignore_index=True)
    
    # Step 4: Final consistency checks
    print("[business_service] Step 4: Final consistency checks...")
    unified = unified.drop_duplicates()
    unified['amount'] = unified['amount'].clip(lower=0)  # Ensure non-negative
    unified = unified.sort_values('timestamp').reset_index(drop=True)
    
    print(f"[business_service] Final dataset: {len(unified)} records")
    
    # Save to cache for future runs
    _save_unified_dataset_to_cache(unified)
    
    # Store in memory cache
    _unified_dataset_cache = unified
    
    print("[business_service] Unified dataset build complete!")
    return unified


def get_venue_timeseries(venue_id=None, venue_type=None, participant_id=None,
                         start_date=None, end_date=None, resolution='day'):
    """
    Get time series data for venues.
    
    Parameters:
    - venue_id: Optional filter by specific venue
    - venue_type: Optional filter by "Restaurant" or "Pub"
    - participant_id: Optional filter by participant
    - start_date: Optional start date filter (YYYY-MM-DD)
    - end_date: Optional end date filter (YYYY-MM-DD)
    - resolution: Time aggregation ('hour', 'day', 'week', 'month')
    
    Returns:
    - Dict with timeseries data for visualization
    """
    df = build_unified_dataset()
    
    # Apply filters
    if venue_id is not None:
        df = df[df['venue_id'] == venue_id]
    if venue_type is not None:
        df = df[df['venue_type'] == venue_type]
    if participant_id is not None:
        df = df[df['participant_id'] == participant_id]
    if start_date is not None:
        start_dt = pd.to_datetime(start_date)
        if start_dt.tzinfo is None and df['timestamp'].dt.tz is not None:
            start_dt = start_dt.tz_localize(df['timestamp'].dt.tz)
        df = df[df['timestamp'] >= start_dt]
    if end_date is not None:
        end_dt = pd.to_datetime(end_date)
        if end_dt.tzinfo is None and df['timestamp'].dt.tz is not None:
            end_dt = end_dt.tz_localize(df['timestamp'].dt.tz)
        df = df[df['timestamp'] <= end_dt]
    
    if len(df) == 0:
        return {
            'timeseries': [],
            'max_occupancy': None
        }
    
    # Get max_occupancy for the venue (if single venue selected)
    max_occupancy = None
    if venue_id is not None and len(df) > 0:
        max_occupancy = df['max_occupancy'].iloc[0]
    
    # Determine aggregation frequency
    freq_map = {
        'hour': 'H',
        'day': 'D',
        'week': 'W',
        'month': 'M'
    }
    freq = freq_map.get(resolution, 'D')
    
    # Aggregate by time period
    df_agg = df.set_index('timestamp').resample(freq).agg({
        'participant_id': 'count',  # Check-in count
        'amount': 'sum'  # Total spending
    }).rename(columns={'participant_id': 'checkin_count', 'amount': 'total_spending'})
    
    df_agg = df_agg.reset_index()
    
    timeseries = []
    for _, row in df_agg.iterrows():
        timeseries.append({
            'timestamp': row['timestamp'].isoformat(),
            'checkin_count': int(row['checkin_count']),
            'total_spending': float(row['total_spending'])
        })
    
    return {
        'timeseries': timeseries,
        'max_occupancy': float(max_occupancy) if max_occupancy is not None else None
    }


def get_market_share_data(start_date=None, end_date=None, venue_type=None, participant_id=None):
    """
    Calculate market share distribution for venues.
    
    Returns spending distribution by venue for bar/pie chart visualization.
    """
    df = build_unified_dataset()
    
    # Apply filters
    if venue_type is not None:
        df = df[df['venue_type'] == venue_type]
    if participant_id is not None:
        df = df[df['participant_id'] == participant_id]
    if start_date is not None:
        start_dt = pd.to_datetime(start_date)
        if start_dt.tzinfo is None and df['timestamp'].dt.tz is not None:
            start_dt = start_dt.tz_localize(df['timestamp'].dt.tz)
        df = df[df['timestamp'] >= start_dt]
    if end_date is not None:
        end_dt = pd.to_datetime(end_date)
        if end_dt.tzinfo is None and df['timestamp'].dt.tz is not None:
            end_dt = end_dt.tz_localize(df['timestamp'].dt.tz)
        df = df[df['timestamp'] <= end_dt]
    
    if len(df) == 0:
        return {
            'venues': [],
            'total_spending': 0
        }
    
    # Sum amount per venue
    venue_spending = df.groupby(['venue_id', 'venue_type']).agg({
        'amount': 'sum',
        'participant_id': 'count'  # Total visits
    }).reset_index()
    venue_spending = venue_spending.rename(columns={
        'amount': 'total_spending',
        'participant_id': 'visit_count'
    })
    
    # Calculate percentage share
    total = venue_spending['total_spending'].sum()
    venue_spending['percentage'] = (venue_spending['total_spending'] / total * 100) if total > 0 else 0
    
    # Sort by spending descending
    venue_spending = venue_spending.sort_values('total_spending', ascending=False)
    
    venues = []
    for _, row in venue_spending.iterrows():
        venues.append({
            'venue_id': int(row['venue_id']),
            'venue_type': row['venue_type'],
            'total_spending': float(row['total_spending']),
            'visit_count': int(row['visit_count']),
            'percentage': float(row['percentage'])
        })
    
    return {
        'venues': venues,
        'total_spending': float(total)
    }


def get_venue_list():
    """
    Get list of all venues with their details.
    """
    restaurants = _load_restaurants()
    pubs = _load_pubs()
    
    venues = []
    
    for _, row in restaurants.iterrows():
        venues.append({
            'venue_id': int(row['restaurantId']),
            'venue_type': 'Restaurant',
            'max_occupancy': int(row['maxOccupancy']),
            'food_cost': float(row['foodCost'])
        })
    
    for _, row in pubs.iterrows():
        venues.append({
            'venue_id': int(row['pubId']),
            'venue_type': 'Pub',
            'max_occupancy': int(row['maxOccupancy']),
            'hourly_cost': float(row['hourlyCost'])
        })
    
    return venues


def get_participant_list(venue_type=None, venue_id=None):
    """
    Get list of all participants who visited restaurants/pubs.
    
    Parameters:
    - venue_type: Optional filter by "Restaurant" or "Pub"
    - venue_id: Optional filter by specific venue
    
    Returns:
    - Array of {participant_id, visit_count, total_spending}
    """
    df = build_unified_dataset()
    
    # Apply filters
    if venue_type is not None:
        df = df[df['venue_type'] == venue_type]
    if venue_id is not None:
        df = df[df['venue_id'] == venue_id]
    
    # Aggregate by participant
    participant_stats = df.groupby('participant_id').agg({
        'venue_id': 'count',  # visit count
        'amount': 'sum'  # total spending
    }).rename(columns={'venue_id': 'visit_count', 'amount': 'total_spending'})
    
    participant_stats = participant_stats.reset_index().sort_values('visit_count', ascending=False)
    
    participants = []
    for _, row in participant_stats.iterrows():
        participants.append({
            'participant_id': int(row['participant_id']),
            'visit_count': int(row['visit_count']),
            'total_spending': round(float(row['total_spending']), 2)
        })
    
    return participants


def get_unified_dataset_sample(limit=100):
    """
    Get a sample of the unified dataset for debugging/exploration.
    """
    df = build_unified_dataset()
    sample = df.head(limit)
    
    records = []
    for _, row in sample.iterrows():
        records.append({
            'timestamp': row['timestamp'].isoformat(),
            'participant_id': int(row['participant_id']),
            'venue_id': int(row['venue_id']),
            'venue_type': row['venue_type'],
            'amount': float(row['amount']),
            'max_occupancy': float(row['max_occupancy']) if pd.notna(row['max_occupancy']) else None
        })
    
    return {
        'total_records': len(df),
        'sample': records
    }

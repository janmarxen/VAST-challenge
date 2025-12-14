"""
Employer Service Layer
Processes ParticipantStatusLogs, Jobs and Employers to produce
aggregated employer datasets used by the frontend.

Outputs (written to `backend/data/processed/` as CSVs):
- employer_meta.csv
- employee_counts.csv
- turnover.csv
- job_flows.csv
- tenure.csv
"""
import re
from pathlib import Path
from functools import lru_cache
import pandas as pd
import numpy as np

# /app/services/employer_service.py → /app
_APP_DIR = Path(__file__).resolve().parents[1]
# PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Data directory is always /app/data, because docker-compose mounts ./data → /app/data
DATA_BASE = _APP_DIR / "data"
# DATA_BASE = PROJECT_ROOT/"data" 
DATA_DIR = DATA_BASE / "raw"
CACHE_DIR = DATA_BASE / "processed"

UNIFIED_CACHE_FILE = CACHE_DIR / "unified_employer_dataset.pkl"

print(f"[employer_service] DATA_DIR = {DATA_DIR}")
print(f"[employer_service] CACHE_DIR = {CACHE_DIR}")


@lru_cache(maxsize=1)
def _load_jobs():
    """Load Jobs.csv and return DataFrame with jobId->employerId mapping."""
    path = DATA_DIR / "Jobs.csv"
    print("[employer_service] Loading Jobs.csv...")
    # Added hourlyRate
    df = pd.read_csv(path, usecols=["jobId", "employerId", "hourlyRate"]) 
    # Ensure types
    df = df.drop_duplicates(subset=["jobId"]).reset_index(drop=True)
    df['jobId'] = df['jobId'].astype(int)
    df['employerId'] = df['employerId'].astype(int)
    df['hourlyRate'] = pd.to_numeric(df['hourlyRate'], errors='coerce').fillna(0)
    print(f"[employer_service] Loaded {len(df)} jobs")
    return df


@lru_cache(maxsize=1)
def _load_employers():
    """Load Employers.csv"""
    path = DATA_DIR / "Employers.csv"
    print("[employer_service] Loading Employers.csv...")
    df = pd.read_csv(path)
    print(f"[employer_service] Loaded {len(df)} employers")
    return df


@lru_cache(maxsize=1)
def _load_buildings():
    """Load Buildings.csv"""
    path = DATA_DIR / "Buildings.csv"
    print("[employer_service] Loading Buildings.csv...")
    df = pd.read_csv(path)
    print(f"[employer_service] Loaded {len(df)} buildings")
    return df


def _iter_participant_status_logs(sample_rate=1):
    """Yield DataFrames for ParticipantStatusLogs1..72.csv if they exist.

    Reads only the columns we need: `timestamp`, `participantId`, `jobId`.
    Uses per-file reading so the process can scale.
    
    Args:
        sample_rate (int): If > 1, take every Nth row.
    """
    for i in range(1, 73):
        name = f"ParticipantStatusLogs{i}.csv"
        path = DATA_DIR / name
        if not path.exists():
            continue
        print(f"[employer_service] Processing {name} (sample_rate={sample_rate})...")
        # read with selected columns and parse timestamps
        try:
            df = pd.read_csv(path, usecols=["timestamp", "participantId", "jobId"], parse_dates=["timestamp"], low_memory=False)
        except Exception:
            # fallback: read without parse and convert
            df = pd.read_csv(path, usecols=["timestamp", "participantId", "jobId"], low_memory=False)
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        if sample_rate > 1:
            df = df.iloc[::sample_rate, :].copy()
            
        yield df


def _save_csv(df: pd.DataFrame, filename: str):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = CACHE_DIR / filename
    print(f"[employer_service] Saving {filename} to {path}...")
    df.to_csv(path, index=False)


def _load_cached_unified_employer_dataset():

    import pickle

    print(f"[employer_service] Checking for cache file at {UNIFIED_CACHE_FILE}")
    if not UNIFIED_CACHE_FILE.exists():
        return None

    try:
        print(f"[employer_service] Loading cached dataset from {UNIFIED_CACHE_FILE}")
        with open(UNIFIED_CACHE_FILE, "rb") as f:
            dataset = pickle.load(f)
        return dataset
    except Exception as e:
        print(f"[employer_service] ERROR loading cached employer dataset: {e}")
        return None


def _save_unified_employer_dataset(dataset_dict):
    import pickle
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    print(f"[employer_service] Saving unified employer dataset to {UNIFIED_CACHE_FILE}...")
    with open(UNIFIED_CACHE_FILE, "wb") as f:
        pickle.dump(dataset_dict, f)


def _process_employer_meta():
    """Create `employer_meta.csv` with columns:
    employerId, location_x, location_y, buildingId, buildingType
    """
    employers = _load_employers().copy()
    buildings = _load_buildings()

    # Parse POINT(x y)
    def _parse_point(val):
        if pd.isna(val):
            return (np.nan, np.nan)
        m = re.search(r"POINT\s*\(([-0-9\.eE]+)\s+([-0-9\.eE]+)\)", str(val))
        if m:
            x = float(m.group(1))
            y = float(m.group(2))
            return (x, y)
        # fallback: two numbers separated by comma or space
        parts = re.findall(r"-?\d+\.?\d*", str(val))
        if len(parts) >= 2:
            return (float(parts[0]), float(parts[1]))
        return (np.nan, np.nan)

    xy = employers['location'].apply(_parse_point)
    employers['location_x'] = [p[0] for p in xy]
    employers['location_y'] = [p[1] for p in xy]

    # Merge to get buildingType
    if 'buildingId' in employers.columns and 'buildingId' in buildings.columns:
        employers = pd.merge(employers, buildings[['buildingId', 'buildingType']], on='buildingId', how='left')

    # buildingId may already exist
    cols = ['employerId', 'location_x', 'location_y', 'buildingId', 'buildingType']
    out = employers.loc[:, [c for c in cols if c in employers.columns]].copy()
    _save_csv(out, 'employer_meta.csv')
    return out


def _process_employee_counts(all_logs_df=None):
    """Produce `employee_counts.csv` with columns: date, employerId, employeeCount

    For each status log, extract date and map jobId->employerId, then
    compute unique participant counts per (date, employerId).
    """
    if all_logs_df is None:
        # Legacy path: load from files
        jobs = _load_jobs()
        job_to_employer = jobs.set_index('jobId')['employerId'].to_dict()

        rows = []
        total_files = 0
        for df in _iter_participant_status_logs():
            total_files += 1
            # keep only needed columns
            df = df[['timestamp', 'participantId', 'jobId']].copy()
            
            # Optimize types
            df['participantId'] = pd.to_numeric(df['participantId'], errors='coerce').fillna(-1).astype('int32')
            
            # Some jobId may be missing or blank; coerce to numeric
            df['jobId'] = pd.to_numeric(df['jobId'], errors='coerce')
            df = df.dropna(subset=['jobId'])
            df['jobId'] = df['jobId'].astype('int32')
            
            # Map to employerId
            df['employerId'] = df['jobId'].map(job_to_employer)
            df = df.dropna(subset=['employerId'])
            df['employerId'] = df['employerId'].astype('int32')
            
            # Use datetime floor for day
            df['day'] = df['timestamp'].dt.floor('D')
            
            # Pre-aggregate: unique participants per day/employer in this chunk
            # This drastically reduces memory usage by storing only unique sets per day
            agg = df.groupby(['day', 'employerId'])['participantId'].unique().reset_index()
            rows.append(agg)

        if len(rows) == 0:
            print("[employer_service] No ParticipantStatusLogs found; writing empty employee_counts.csv")
            out = pd.DataFrame(columns=['date', 'employerId', 'employeeCount'])
            _save_csv(out, 'employee_counts.csv')
            return out

        print("[employer_service] Concatenating pre-aggregated counts...")
        combined = pd.concat(rows, ignore_index=True)
        
        # Final aggregation: merge the unique arrays from chunks
        print("[employer_service] Final aggregation of employee counts...")
        # We need to union the arrays for each (day, employerId) group
        # Since we just need the count, we can concat arrays and take len(unique)
        def count_unique_union(series):
            # series is a sequence of numpy arrays
            if len(series) == 0: return 0
            if len(series) == 1: return len(series.iloc[0])
            return len(np.unique(np.concatenate(series.values)))

        final_agg = combined.groupby(['day', 'employerId'])['participantId'].apply(count_unique_union).reset_index(name='employeeCount')
        
        # Reconstruct date/month strings
        final_agg['date'] = final_agg['day'].dt.strftime('%Y-%m-%d')
        final_agg['month'] = final_agg['day'].dt.to_period('M').astype(str)
        
        # Sort and save
        final_agg = final_agg.sort_values(['date', 'employerId']).reset_index(drop=True)
        _save_csv(final_agg, 'employee_counts.csv')
        print(f"[employer_service] Processed employee counts; rows: {len(final_agg)}")
        return final_agg
    else:
        # Optimized path: use pre-loaded dataframe
        # Expects all_logs_df to have: timestamp, participantId, jobId, employerId, date, month
        combined = all_logs_df.copy()
        # Ensure employerId is present (drop rows where it's NaN)
        combined = combined.dropna(subset=['employerId'])
        combined['employerId'] = combined['employerId'].astype(int)

    # group and count unique participants per date/employer
    agg = combined.groupby(['date', 'month', 'employerId'])['participantId'].nunique().reset_index()
    agg = agg.rename(columns={'participantId': 'employeeCount'})
    agg = agg.sort_values(['date', 'employerId']).reset_index(drop=True)
    _save_csv(agg, 'employee_counts.csv')
    print(f"[employer_service] Processed employee counts; rows: {len(agg)}")
    return agg


def _process_turnover(all_logs_df=None, employee_counts_df=None):
    """Produce `turnover.csv` with columns:
    month, employerId, hires, quits, net_change, turnoverRate
    
    net_change = hires - quits (positive: net growth, negative: net decline)
    turnoverRate = (hires + quits) / avgEmployeeCount
    """
    jobs = _load_jobs()
    job_to_employer = jobs.set_index('jobId')['employerId'].to_dict()

    if all_logs_df is None:
        # Streaming approach to avoid OOM
        events = []
        last_job_map = {} # participantId -> jobId
        
        for df in _iter_participant_status_logs():
            # Load minimal columns
            df = df[['timestamp', 'participantId', 'jobId']].copy()
            
            # Optimize types
            df['participantId'] = pd.to_numeric(df['participantId'], errors='coerce').fillna(-1).astype('int32')
            df['jobId'] = pd.to_numeric(df['jobId'], errors='coerce')
            # Treat NaN as -1 (Unemployed) to capture Quits
            df['jobId'] = df['jobId'].fillna(-1).astype('int32')
            
            if df.empty: continue

            # Sort by timestamp
            df = df.sort_values('timestamp')
            
            # Calculate prev_jobId within file
            df['prev_jobId'] = df.groupby('participantId')['jobId'].shift(1)
            
            # Fill NaN prev_jobId from last_job_map (carry over from previous files)
            nan_prev_mask = df['prev_jobId'].isna()
            if nan_prev_mask.any():
                # map returns NaN if key not found, which is what we want for new participants
                fill_values = df.loc[nan_prev_mask, 'participantId'].map(last_job_map)
                df.loc[nan_prev_mask, 'prev_jobId'] = fill_values

            # Detect changes
            # We are looking for rows where jobId != prev_jobId
            # Note: if prev_jobId is NaN (new participant), it is != jobId (int).
            # So this captures new hires too.
            changed = df[df['jobId'] != df['prev_jobId']].copy()
            
            # Update last_job_map with the last state of this file
            last_jobs = df.groupby('participantId')['jobId'].last()
            last_job_map.update(last_jobs.to_dict())
            
            # Process events
            for _, row in changed.iterrows():
                ts = row['timestamp']
                month = ts.strftime('%Y-%m') # timestamp is datetime
                prev = row['prev_jobId']
                curr = row['jobId']
                
                # Handle -1 as Unemployed/None
                prev_emp = None if (pd.isna(prev) or prev == -1) else job_to_employer.get(int(prev))
                curr_emp = None if (pd.isna(curr) or curr == -1) else job_to_employer.get(int(curr))

                if prev_emp is None and curr_emp is not None:
                    # Hire
                    events.append({'month': month, 'employerId': int(curr_emp), 'hires': 1, 'quits': 0, 'switches': 0})
                elif prev_emp is not None and curr_emp is None:
                    # Quit
                    events.append({'month': month, 'employerId': int(prev_emp), 'hires': 0, 'quits': 1, 'switches': 0})
                elif prev_emp is not None and curr_emp is not None and prev_emp != curr_emp:
                    # Switch
                    events.append({'month': month, 'employerId': int(prev_emp), 'hires': 0, 'quits': 1, 'switches': 1})
                    events.append({'month': month, 'employerId': int(curr_emp), 'hires': 1, 'quits': 0, 'switches': 0})

        if len(events) == 0:
            print("[employer_service] No transitions detected; writing empty turnover.csv")
            out = pd.DataFrame(columns=['month', 'employerId', 'hires', 'quits', 'net_change', 'turnoverRate'])
            _save_csv(out, 'turnover.csv')
            return out

        evdf = pd.DataFrame(events)
        # ... rest of processing ...
        
        # --- Verification for teammate's claim ---
        print("\n[employer_service] --- VERIFICATION: Job Change Distribution ---")
        print(f"[employer_service] Total events: {len(evdf)}")
        monthly_counts = evdf['month'].value_counts().sort_index()
        print(monthly_counts)
        print("[employer_service] -------------------------------------------\n")
        # -----------------------------------------
        
        grouped = evdf.groupby(['month', 'employerId']).sum().reset_index()
    else:
        all_df = all_logs_df.copy()
        # Ensure sorted
        all_df = all_df.sort_values(['participantId', 'timestamp']).reset_index(drop=True)

        # For each participant, compute previous jobId
        all_df['prev_jobId'] = all_df.groupby('participantId')['jobId'].shift(1)

        events = []
        # iterate rows where jobId != prev_jobId
        changed = all_df[~(all_df['jobId'].fillna(-9999) == all_df['prev_jobId'].fillna(-9999))].copy()
        for _, row in changed.iterrows():
            ts = row['timestamp']
            month = pd.to_datetime(ts).strftime('%Y-%m')
            prev = row['prev_jobId']
            curr = row['jobId']
            # Handle -1 as Unemployed/None
            prev_emp = None if (pd.isna(prev) or prev == -1) else job_to_employer.get(int(prev))
            curr_emp = None if (pd.isna(curr) or curr == -1) else job_to_employer.get(int(curr))

            if prev_emp is None and curr_emp is not None:
                # Hire
                events.append({'month': month, 'employerId': int(curr_emp), 'hires': 1, 'quits': 0, 'switches': 0})
            elif prev_emp is not None and curr_emp is None:
                # Quit
                events.append({'month': month, 'employerId': int(prev_emp), 'hires': 0, 'quits': 1, 'switches': 0})
            elif prev_emp is not None and curr_emp is not None and prev_emp != curr_emp:
                # Switch
                events.append({'month': month, 'employerId': int(prev_emp), 'hires': 0, 'quits': 1, 'switches': 1})
                events.append({'month': month, 'employerId': int(curr_emp), 'hires': 1, 'quits': 0, 'switches': 0})

        if len(events) == 0:
            print("[employer_service] No transitions detected; writing empty turnover.csv")
            out = pd.DataFrame(columns=['month', 'employerId', 'hires', 'quits', 'net_change', 'turnoverRate'])
            _save_csv(out, 'turnover.csv')
            return out

        evdf = pd.DataFrame(events)
        
        # --- Verification for teammate's claim ---
        print("\n[employer_service] --- VERIFICATION: Job Change Distribution ---")
        print(f"[employer_service] Total events: {len(evdf)}")
        monthly_counts = evdf['month'].value_counts().sort_index()
        print(monthly_counts)
        print("[employer_service] -------------------------------------------\n")
        # -----------------------------------------
        
        grouped = evdf.groupby(['month', 'employerId']).sum().reset_index()

    # Compute averageEmployeeCount per (month, employerId)
    if employee_counts_df is None:
        # try to load processed employee_counts.csv if present
        emp_path = CACHE_DIR / 'employee_counts.csv'
        if emp_path.exists():
            employee_counts_df = pd.read_csv(emp_path)
        else:
            employee_counts_df = None

    if employee_counts_df is not None and len(employee_counts_df) > 0:
        avg_emp = employee_counts_df.groupby(['month', 'employerId'])['employeeCount'].mean().reset_index()
        avg_emp = avg_emp.rename(columns={'employeeCount': 'avgEmployeeCount'})
        merged = pd.merge(grouped, avg_emp, on=['month', 'employerId'], how='left')
    else:
        merged = grouped.copy()
        merged['avgEmployeeCount'] = np.nan

    # Compute net_change and turnoverRate
    merged['net_change'] = merged['hires'] - merged['quits']
    
    def _calc_turnover(row):
        denom = row['avgEmployeeCount']
        if pd.isna(denom) or denom == 0:
            return 0.0
        # Standard turnover rate formula: (Hires + Quits) / 2 / AvgHeadcount
        # This represents the percentage of the workforce that changed during the period.
        return float((row.get('hires', 0) + row.get('quits', 0)) / 2.0 / denom)

    merged['turnoverRate'] = merged.apply(_calc_turnover, axis=1)
    out = merged[['month', 'employerId', 'hires', 'quits', 'net_change', 'turnoverRate']].copy()
    _save_csv(out, 'turnover.csv')
    print(f"[employer_service] Wrote turnover for {len(out)} (month,employer) groups")
    return out


def _process_job_flows(all_logs_df=None):
    """Produce `job_flows.csv` with columns: fromEmployer, toEmployer, count

    Count transitions where participant moved from employer X to employer Y.
    """
    jobs = _load_jobs()
    job_to_employer = jobs.set_index('jobId')['employerId'].to_dict()

    if all_logs_df is None:
        transitions = []
        last_job_map = {} # participantId -> jobId
        
        for df in _iter_participant_status_logs():
            df = df[['timestamp', 'participantId', 'jobId']].copy()
            df['participantId'] = pd.to_numeric(df['participantId'], errors='coerce').fillna(-1).astype('int32')
            df['jobId'] = pd.to_numeric(df['jobId'], errors='coerce')
            df = df.dropna(subset=['jobId'])
            df['jobId'] = df['jobId'].astype('int32')
            
            if df.empty: continue
            df = df.sort_values('timestamp')
            
            df['prev_jobId'] = df.groupby('participantId')['jobId'].shift(1)
            
            nan_prev_mask = df['prev_jobId'].isna()
            if nan_prev_mask.any():
                fill_values = df.loc[nan_prev_mask, 'participantId'].map(last_job_map)
                df.loc[nan_prev_mask, 'prev_jobId'] = fill_values
            
            changed = df[df['jobId'] != df['prev_jobId']].copy()
            
            last_jobs = df.groupby('participantId')['jobId'].last()
            last_job_map.update(last_jobs.to_dict())
            
            for _, row in changed.iterrows():
                prev = row['prev_jobId']
                curr = row['jobId']
                if pd.isna(prev) or pd.isna(curr): continue
                
                prev_emp = job_to_employer.get(int(prev))
                curr_emp = job_to_employer.get(int(curr))
                
                if prev_emp is None or curr_emp is None: continue
                if prev_emp == curr_emp: continue
                
                transitions.append({'fromEmployer': int(prev_emp), 'toEmployer': int(curr_emp)})
        
        if len(transitions) == 0:
            out = pd.DataFrame(columns=['fromEmployer', 'toEmployer', 'count'])
            _save_csv(out, 'job_flows.csv')
            return out

        tdf = pd.DataFrame(transitions)
        agg = tdf.groupby(['fromEmployer', 'toEmployer']).size().reset_index(name='count')
        agg = agg.sort_values('count', ascending=False).reset_index(drop=True)
        _save_csv(agg, 'job_flows.csv')
        print(f"[employer_service] Wrote {len(agg)} job flow rows")
        return agg
    else:
        all_df = all_logs_df.copy()
        all_df = all_df.sort_values(['participantId', 'timestamp']).reset_index(drop=True)

    all_df['prev_jobId'] = all_df.groupby('participantId')['jobId'].shift(1)

    transitions = []
    changed = all_df[~(all_df['jobId'].fillna(-9999) == all_df['prev_jobId'].fillna(-9999))].copy()
    for _, row in changed.iterrows():
        prev = row['prev_jobId']
        curr = row['jobId']
        if pd.isna(prev) or pd.isna(curr):
            continue
        prev_emp = job_to_employer.get(int(prev))
        curr_emp = job_to_employer.get(int(curr))
        if prev_emp is None or curr_emp is None:
            continue
        if prev_emp == curr_emp:
            continue
        transitions.append({'fromEmployer': int(prev_emp), 'toEmployer': int(curr_emp)})

    if len(transitions) == 0:
        out = pd.DataFrame(columns=['fromEmployer', 'toEmployer', 'count'])
        _save_csv(out, 'job_flows.csv')
        return out

    tdf = pd.DataFrame(transitions)
    agg = tdf.groupby(['fromEmployer', 'toEmployer']).size().reset_index(name='count')
    agg = agg.sort_values('count', ascending=False).reset_index(drop=True)
    _save_csv(agg, 'job_flows.csv')
    print(f"[employer_service] Wrote {len(agg)} job flow rows")
    return agg


def _process_tenure(all_logs_df=None):
    """Produce `tenure.csv` with employer-level tenure statistics.

    For each participant-jobId pair, compute tenure in days between first and last occurrence.
    Aggregate per employerId computing median, avg, min, max tenures.
    """
    jobs = _load_jobs()
    job_to_employer = jobs.set_index('jobId')['employerId'].to_dict()

    if all_logs_df is None:
        tenure_map = {} # (participantId, jobId) -> [min_ts, max_ts]
        
        for df in _iter_participant_status_logs():
            df = df[['timestamp', 'participantId', 'jobId']].copy()
            df['participantId'] = pd.to_numeric(df['participantId'], errors='coerce').fillna(-1).astype('int32')
            df['jobId'] = pd.to_numeric(df['jobId'], errors='coerce')
            df = df.dropna(subset=['jobId'])
            df['jobId'] = df['jobId'].astype('int32')
            
            if df.empty: continue
            
            # Group by participantId, jobId in this chunk
            grp = df.groupby(['participantId', 'jobId'])['timestamp'].agg(['min', 'max']).reset_index()
            
            for _, row in grp.iterrows():
                key = (int(row['participantId']), int(row['jobId']))
                ts_min = row['min']
                ts_max = row['max']
                
                if key in tenure_map:
                    # Update min/max
                    current_min, current_max = tenure_map[key]
                    if ts_min < current_min: tenure_map[key][0] = ts_min
                    if ts_max > current_max: tenure_map[key][1] = ts_max
                else:
                    tenure_map[key] = [ts_min, ts_max]
        
        if not tenure_map:
            out = pd.DataFrame(columns=['employerId', 'medianTenure', 'avgTenure', 'minTenure', 'maxTenure'])
            _save_csv(out, 'tenure.csv')
            return out
            
        # Convert map to dataframe
        records = []
        for (pid, jid), (tmin, tmax) in tenure_map.items():
            records.append({'participantId': pid, 'jobId': jid, 'min': tmin, 'max': tmax})
        
        grp = pd.DataFrame(records)
        grp['tenure_days'] = (pd.to_datetime(grp['max']) - pd.to_datetime(grp['min'])).dt.days
        grp['employerId'] = grp['jobId'].map(job_to_employer)
        grp = grp.dropna(subset=['employerId']).copy()
        grp['employerId'] = grp['employerId'].astype(int)
    else:
        all_df = all_logs_df.copy()
        # group by participantId and jobId to get first and last timestamp
        grp = all_df.groupby(['participantId', 'jobId'])['timestamp'].agg(['min', 'max']).reset_index()
        grp['tenure_days'] = (pd.to_datetime(grp['max']) - pd.to_datetime(grp['min'])).dt.days
        grp['employerId'] = grp['jobId'].map(job_to_employer)
        grp = grp.dropna(subset=['employerId']).copy()
        grp['employerId'] = grp['employerId'].astype(int)

    if len(grp) == 0:
        out = pd.DataFrame(columns=['employerId', 'medianTenure', 'avgTenure', 'minTenure', 'maxTenure'])
        _save_csv(out, 'tenure.csv')
        return out

    stats = grp.groupby('employerId')['tenure_days'].agg(['median', 'mean', 'min', 'max']).reset_index()
    stats = stats.rename(columns={'median': 'medianTenure', 'mean': 'avgTenure', 'min': 'minTenure', 'max': 'maxTenure'})
    # Round/convert to numeric
    stats['medianTenure'] = stats['medianTenure'].astype(float)
    stats['avgTenure'] = stats['avgTenure'].astype(float)
    stats['minTenure'] = stats['minTenure'].astype(int)
    stats['maxTenure'] = stats['maxTenure'].astype(int)

    _save_csv(stats, 'tenure.csv')
    print(f"[employer_service] Wrote tenure stats for {len(stats)} employers")
    return stats


def build_employer_datasets(force_rebuild=False, sample_rate=100):
    """Main entrypoint: runs all processing steps and writes CSVs.

    First checks for cached unified dataset; if found, returns it immediately.
    Otherwise processes all data from scratch and caches result.

    Returns a dictionary of DataFrames for convenience.
    """
    print("[employer_service] Building employer datasets...")
    
    # Check cache first (unless forced)
    if not force_rebuild:
        cached = _load_cached_unified_employer_dataset()
        if cached is not None:
            print("[employer_service] Using cached employer dataset")
            return cached

    # Step 1: employer meta
    meta = _process_employer_meta()

    # Step 2: Load all logs once with sampling
    # sample_rate=100 means 1% of data (every 100th row)
    # If sample_rate is 1 (full data), we skip loading everything into memory at once to avoid OOM.
    full_df = None
    if sample_rate > 1:
        print(f"[employer_service] Loading and preprocessing all logs (sample_rate={sample_rate})...")
        all_logs = []
        jobs = _load_jobs()
        job_to_employer = jobs.set_index('jobId')['employerId'].to_dict()
        
        for df in _iter_participant_status_logs(sample_rate=sample_rate):
            # Pre-calculate columns needed by all functions
            df['jobId'] = pd.to_numeric(df['jobId'], errors='coerce')
            df = df.dropna(subset=['jobId'])
            df['jobId'] = df['jobId'].astype(int)
            
            # Map employerId here to save time later
            df['employerId'] = df['jobId'].map(job_to_employer)
            
            # Add date/month columns immediately
            df['date'] = df['timestamp'].dt.strftime('%Y-%m-%d')
            df['month'] = df['timestamp'].dt.to_period('M').astype(str)
            
            all_logs.append(df)
            
        if not all_logs:
            print("[employer_service] No logs found!")
            full_df = pd.DataFrame(columns=['timestamp', 'participantId', 'jobId', 'employerId', 'date', 'month'])
        else:
            full_df = pd.concat(all_logs, ignore_index=True)
            full_df = full_df.sort_values(['participantId', 'timestamp']).reset_index(drop=True)
            print(f"[employer_service] Loaded {len(full_df)} rows of sampled logs")
    else:
        print("[employer_service] sample_rate=1: Skipping pre-loading of all logs to conserve memory.")

    # Step 3: employee counts
    emp_counts = _process_employee_counts(all_logs_df=full_df)

    # Step 4: turnover (needs employee counts for avg)
    turnover = _process_turnover(all_logs_df=full_df, employee_counts_df=emp_counts)

    # Step 5: job flows
    flows = _process_job_flows(all_logs_df=full_df)

    # Step 6: tenure
    tenure = _process_tenure(all_logs_df=full_df)

    # Build unified cache dictionary
    unified = {
        "employer_meta": meta,
        "employee_counts": emp_counts,
        "turnover": turnover,
        "job_flows": flows,
        "tenure": tenure
    }
    
    # Save to cache
    _save_unified_employer_dataset(unified)

    print("[employer_service] Employer dataset build complete!")
    return unified


def get_city_metrics():
    """
    Aggregate metrics for the entire city per month.
    Returns list of dicts: { month, avgTotalEmployment, totalHires, totalQuits, cityTurnoverRate }
    """
    cached = _load_cached_unified_employer_dataset()
    
    if cached is not None:
        emp_df = cached["employee_counts"]
        turnover_df = cached["turnover"]
    else:
        # Fallback to CSVs
        emp_path = CACHE_DIR / "employee_counts.csv"
        turnover_path = CACHE_DIR / "turnover.csv"
        
        if not emp_path.exists() or not turnover_path.exists():
            return []
            
        emp_df = pd.read_csv(emp_path)
        turnover_df = pd.read_csv(turnover_path)

    # 1. Calculate Average Total Employment per Month
    # emp_df: [date, month, employerId, employeeCount]
    # Sum across employers for each date -> Total Daily Employment
    daily_total = emp_df.groupby(['date', 'month'])['employeeCount'].sum().reset_index(name='totalDailyEmployment')
    # Average across days for each month -> Avg Total Employment
    monthly_emp = daily_total.groupby('month')['totalDailyEmployment'].mean().reset_index(name='avgTotalEmployment')

    # 2. Calculate Total Hires/Quits per Month
    # turnover_df: [month, employerId, hires, quits, ...]
    monthly_turnover = turnover_df.groupby('month')[['hires', 'quits']].sum().reset_index()
    monthly_turnover = monthly_turnover.rename(columns={'hires': 'totalHires', 'quits': 'totalQuits'})

    # 3. Merge
    merged = pd.merge(monthly_emp, monthly_turnover, on='month', how='outer').fillna(0)

    # 4. Calculate City Turnover Rate
    def _calc_rate(row):
        denom = row['avgTotalEmployment']
        if denom == 0:
            return 0.0
        return float((row['totalHires'] + row['totalQuits']) / denom)

    merged['cityTurnoverRate'] = merged.apply(_calc_rate, axis=1)
    
    # Sort by month
    merged = merged.sort_values('month')
    
    return merged.to_dict('records')


def get_employer_market_share_data():
    """
    Return average monthly employment per employer for stream graph.
    """
    cached = _load_cached_unified_employer_dataset()
    if cached is not None:
        df = cached["employee_counts"]
    else:
        path = CACHE_DIR / "employee_counts.csv"
        if not path.exists():
            return []
        df = pd.read_csv(path)

    # Group by month and employer
    agg = df.groupby(['month', 'employerId'])['employeeCount'].mean().reset_index(name='avgEmployeeCount')
    
    # Sort
    agg = agg.sort_values(['month', 'avgEmployeeCount'], ascending=[True, False])
    
    return agg.to_dict('records')


def _load_turnover_df():
    cached = _load_cached_unified_employer_dataset()
    if cached is not None:
        return cached.get("turnover")

    path = CACHE_DIR / "turnover.csv"
    if path.exists():
        return pd.read_csv(path)

    return pd.DataFrame(columns=['month', 'employerId', 'hires', 'quits', 'net_change', 'turnoverRate'])


def _load_employer_meta_df():
    cached = _load_cached_unified_employer_dataset()
    if cached is not None:
        return cached.get("employer_meta")

    path = CACHE_DIR / "employer_meta.csv"
    if path.exists():
        return pd.read_csv(path)

    return pd.DataFrame(columns=['employerId', 'location_x', 'location_y', 'buildingId', 'buildingType'])


def _fill_missing_turnover_month(turnover: pd.DataFrame, employer_meta: pd.DataFrame, month: str) -> pd.DataFrame:
    """Ensure one turnover row per employer for the given month.

    This avoids blank visualizations for months with zero turnover events without
    rebuilding the entire dataset.
    """
    if employer_meta is None or employer_meta.empty or 'employerId' not in employer_meta.columns:
        # No employer universe to fill against
        return turnover.loc[turnover.get('month', pd.Series(dtype=str)) == month].copy() if isinstance(turnover, pd.DataFrame) else pd.DataFrame()

    employer_ids = employer_meta['employerId'].dropna().astype(int).unique()
    base = pd.DataFrame({'employerId': employer_ids})
    base['month'] = month

    if turnover is None or turnover.empty:
        out = base.copy()
        out['hires'] = 0
        out['quits'] = 0
        out['net_change'] = 0
        out['turnoverRate'] = 0.0
        return out

    t = turnover.copy()
    if 'employerId' in t.columns:
        t['employerId'] = pd.to_numeric(t['employerId'], errors='coerce')
    if 'month' in t.columns:
        t['month'] = t['month'].astype(str)

    month_rows = t[t['month'] == month].copy() if 'month' in t.columns else pd.DataFrame(columns=t.columns)

    merged = pd.merge(base, month_rows, on=['month', 'employerId'], how='left')
    for col in ('hires', 'quits', 'net_change'):
        if col in merged.columns:
            merged[col] = pd.to_numeric(merged[col], errors='coerce').fillna(0).astype(int)
        else:
            merged[col] = 0
    if 'turnoverRate' in merged.columns:
        merged['turnoverRate'] = pd.to_numeric(merged['turnoverRate'], errors='coerce').fillna(0.0).astype(float)
    else:
        merged['turnoverRate'] = 0.0

    return merged


def get_geographic_turnover_data(month: str | None = None, fill_missing: bool = False):
    """Return employer locations and turnover rates.

    If `month` is provided with `fill_missing=True`, returns one row per employer
    for that month with 0-values filled for missing turnover entries.
    """
    meta = _load_employer_meta_df()
    turnover = _load_turnover_df()

    if fill_missing and month:
        turnover = _fill_missing_turnover_month(turnover, meta, month)
    elif month:
        # Month-scoped without filling
        if isinstance(turnover, pd.DataFrame) and 'month' in turnover.columns:
            turnover = turnover[turnover['month'].astype(str) == str(month)].copy()

    # Merge
    merged = pd.merge(turnover, meta, on='employerId', how='left')
    
    # Keep relevant columns
    # meta has location_x, location_y, buildingId, buildingType
    out = merged[['month', 'employerId', 'location_x', 'location_y', 'buildingId', 'buildingType', 'turnoverRate', 'hires', 'quits']].copy()
    
    return out.to_dict('records')


def get_turnover_heatmap_data(month: str | None = None, fill_missing: bool = False):
    """Return turnover rows.

    If `month` is provided with `fill_missing=True`, returns one row per employer
    for that month with 0-values filled for missing turnover entries.
    """
    df = _load_turnover_df()
    meta = _load_employer_meta_df()

    if fill_missing and month:
        filled = _fill_missing_turnover_month(df, meta, month)
        total_employers = int(meta['employerId'].nunique()) if isinstance(meta, pd.DataFrame) and 'employerId' in meta.columns else 0
        employers_with_events = int(((filled.get('hires', 0) + filled.get('quits', 0)) > 0).sum()) if isinstance(filled, pd.DataFrame) else 0
        return {
            "data": filled.to_dict("records"),
            "meta": {
                "month": str(month),
                "filledMissing": True,
                "totalEmployers": total_employers,
                "employersWithEvents": employers_with_events,
            },
        }

    if month and isinstance(df, pd.DataFrame) and 'month' in df.columns:
        df = df[df['month'].astype(str) == str(month)].copy()

    return {"data": df.to_dict("records") if isinstance(df, pd.DataFrame) else []}


def get_job_flow_data(time_period=None):
    """
    Calculate job transition flows for Sankey diagram.
    Loads from cache if available, otherwise from processed CSVs.
    """
    cached = _load_cached_unified_employer_dataset()
    if cached is not None:
        df = cached["job_flows"]
        return {"nodes": [], "links": df.to_dict("records")}
    
    # fallback: load from CSV
    path = CACHE_DIR / "job_flows.csv"
    if path.exists():
        df = pd.read_csv(path)
        return {"nodes": [], "links": df.to_dict("records")}
    
    return {"nodes": [], "links": []}


def get_transition_network_data():
    """
    Build network graph of job transitions.
    Loads from cache if available, otherwise from processed CSVs.
    """
    cached = _load_cached_unified_employer_dataset()
    if cached is not None:
        df = cached["job_flows"]
        return {"nodes": [], "edges": df.to_dict("records")}
    
    # fallback: load from CSV
    path = CACHE_DIR / "job_flows.csv"
    if path.exists():
        df = pd.read_csv(path)
        return {"nodes": [], "edges": df.to_dict("records")}
    
    return {"nodes": [], "edges": []}


def get_turnover_distribution():
    """
    Calculate turnover rate distribution statistics by category.
    Loads from cache if available, otherwise from processed CSVs.
    """
    cached = _load_cached_unified_employer_dataset()
    if cached is not None:
        df = cached["turnover"]
        return {"data": df.to_dict("records")}
    
    # fallback: load from CSV
    path = CACHE_DIR / "turnover.csv"
    if path.exists():
        df = pd.read_csv(path)
        return {"data": df.to_dict("records")}
    
    return {"data": []}


def get_employer_meta_data():
    """
    Return employer metadata (location, building).
    Loads from cache if available, otherwise from CSV.
    """
    cached = _load_cached_unified_employer_dataset()
    if cached is not None:
        df = cached["employer_meta"]
        return df.to_dict("records")
    
    # fallback: load from CSV
    path = CACHE_DIR / "employer_meta.csv"
    if path.exists():
        df = pd.read_csv(path)
        return df.to_dict("records")
    
    return []


def get_employee_counts_data():
    """
    Return daily employee counts by employer.
    Loads from cache if available, otherwise from CSV.
    """
    cached = _load_cached_unified_employer_dataset()
    if cached is not None:
        df = cached["employee_counts"]
        return df.to_dict("records")
    
    # fallback: load from CSV
    path = CACHE_DIR / "employee_counts.csv"
    if path.exists():
        df = pd.read_csv(path)
        return df.to_dict("records")
    
    return []


def get_tenure_data():
    """
    Return tenure statistics by employer.
    Loads from cache if available, otherwise from CSV.
    """
    cached = _load_cached_unified_employer_dataset()
    if cached is not None:
        df = cached["tenure"]
        return df.to_dict("records")
    
    # fallback: load from CSV
    path = CACHE_DIR / "tenure.csv"
    if path.exists():
        df = pd.read_csv(path)
        return df.to_dict("records")
    
    return []


def get_employer_financials():
    """
    Return estimated financial metrics per employer per month.
    Metrics: avgHourlyRate, estimatedMonthlyPayroll
    """
    # 1. Get Wage Data from Jobs
    jobs = _load_jobs()
    # Compute average hourly rate per employer
    wage_stats = jobs.groupby('employerId')['hourlyRate'].mean().reset_index(name='avgHourlyRate')
    
    # 2. Get Employee Counts (Monthly)
    cached = _load_cached_unified_employer_dataset()
    if cached is not None:
        emp_df = cached["employee_counts"]
    else:
        path = CACHE_DIR / "employee_counts.csv"
        if not path.exists():
            return []
        emp_df = pd.read_csv(path)

    # Group by month/employer to get avg employee count
    monthly_emp = emp_df.groupby(['month', 'employerId'])['employeeCount'].mean().reset_index(name='avgEmployeeCount')
    
    # 3. Merge
    merged = pd.merge(monthly_emp, wage_stats, on='employerId', how='left')
    
    # 4. Calculate Estimated Payroll
    # Assumption: 160 hours/month (40h/week * 4 weeks)
    merged['estimatedMonthlyPayroll'] = merged['avgEmployeeCount'] * merged['avgHourlyRate'] * 160
    
    # Sort
    merged = merged.sort_values(['month', 'estimatedMonthlyPayroll'], ascending=[True, False])
    
    return merged.to_dict('records')


if __name__ == '__main__':
    # quick local run
    build_employer_datasets(force_rebuild=False, sample_rate=1)

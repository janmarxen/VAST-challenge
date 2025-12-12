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
    df = pd.read_csv(path, usecols=["jobId", "employerId"]) 
    # Ensure types
    df = df.drop_duplicates(subset=["jobId"]).reset_index(drop=True)
    df['jobId'] = df['jobId'].astype(int)
    df['employerId'] = df['employerId'].astype(int)
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


def _iter_participant_status_logs():
    """Yield DataFrames for ParticipantStatusLogs1..72.csv if they exist.

    Reads only the columns we need: `timestamp`, `participantId`, `jobId`.
    Uses per-file reading so the process can scale.
    """
    for i in range(1, 73):
        name = f"ParticipantStatusLogs{i}.csv"
        path = DATA_DIR / name
        if not path.exists():
            continue
        print(f"[employer_service] Processing {name}...")
        # read with selected columns and parse timestamps
        try:
            df = pd.read_csv(path, usecols=["timestamp", "participantId", "jobId"], parse_dates=["timestamp"], low_memory=False)
        except Exception:
            # fallback: read without parse and convert
            df = pd.read_csv(path, usecols=["timestamp", "participantId", "jobId"], low_memory=False)
            df['timestamp'] = pd.to_datetime(df['timestamp'])
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
    employerId, location_x, location_y, buildingId
    """
    employers = _load_employers().copy()
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

    # buildingId may already exist
    cols = ['employerId', 'location_x', 'location_y']
    if 'buildingId' in employers.columns:
        cols.append('buildingId')
    out = employers.loc[:, [c for c in cols if c in employers.columns]].copy()
    _save_csv(out, 'employer_meta.csv')
    return out


def _process_employee_counts():
    """Produce `employee_counts.csv` with columns: date, employerId, employeeCount

    For each status log, extract date and map jobId->employerId, then
    compute unique participant counts per (date, employerId).
    """
    jobs = _load_jobs()
    job_to_employer = jobs.set_index('jobId')['employerId'].to_dict()

    rows = []
    total_files = 0
    for df in _iter_participant_status_logs():
        total_files += 1
        # keep only needed columns
        df = df[['timestamp', 'participantId', 'jobId']].copy()
        df['date'] = df['timestamp'].dt.strftime('%Y-%m-%d')
        # Some jobId may be missing or blank; coerce to numeric
        df['jobId'] = pd.to_numeric(df['jobId'], errors='coerce')
        df = df.dropna(subset=['jobId'])
        df['jobId'] = df['jobId'].astype(int)
        # Extract month for aggregation
        df['month'] = df['timestamp'].dt.to_period('M').astype(str)
        # Map to employerId
        df['employerId'] = df['jobId'].map(job_to_employer)
        df = df.dropna(subset=['employerId'])
        df['employerId'] = df['employerId'].astype(int)
        # keep only date, month, employerId, participantId
        rows.append(df[['date', 'month', 'employerId', 'participantId']])

    if len(rows) == 0:
        print("[employer_service] No ParticipantStatusLogs found; writing empty employee_counts.csv")
        out = pd.DataFrame(columns=['date', 'employerId', 'employeeCount'])
        _save_csv(out, 'employee_counts.csv')
        return out

    combined = pd.concat(rows, ignore_index=True)
    # group and count unique participants per date/employer
    agg = combined.groupby(['date', 'month', 'employerId'])['participantId'].nunique().reset_index()
    agg = agg.rename(columns={'participantId': 'employeeCount'})
    agg = agg.sort_values(['date', 'employerId']).reset_index(drop=True)
    _save_csv(agg, 'employee_counts.csv')
    print(f"[employer_service] Processed employee counts from {total_files} files; rows: {len(agg)}")
    return agg


def _process_turnover(employee_counts_df=None):
    """Produce `turnover.csv` with columns:
    month, employerId, hires, quits, switches, turnoverRate
    """
    jobs = _load_jobs()
    job_to_employer = jobs.set_index('jobId')['employerId'].to_dict()

    # Read all status logs minimally and sort by participantId,timestamp
    frames = []
    for df in _iter_participant_status_logs():
        df = df[['timestamp', 'participantId', 'jobId']].copy()
        df['jobId'] = pd.to_numeric(df['jobId'], errors='coerce')
        df = df.dropna(subset=['jobId'])
        df['jobId'] = df['jobId'].astype(int)
        frames.append(df)

    if len(frames) == 0:
        print("[employer_service] No status logs present; writing empty turnover.csv")
        out = pd.DataFrame(columns=['month', 'employerId', 'hires', 'quits', 'switches', 'turnoverRate'])
        _save_csv(out, 'turnover.csv')
        return out

    all_df = pd.concat(frames, ignore_index=True)
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
        prev_emp = None if pd.isna(prev) else job_to_employer.get(int(prev))
        curr_emp = None if pd.isna(curr) else job_to_employer.get(int(curr))

        if pd.isna(prev) and not pd.isna(curr):
            # hire into curr_emp
            if curr_emp is not None:
                events.append({'month': month, 'employerId': int(curr_emp), 'hires': 1, 'quits': 0, 'switches': 0})
        elif pd.isna(curr) and not pd.isna(prev):
            # quit from prev_emp
            if prev_emp is not None:
                events.append({'month': month, 'employerId': int(prev_emp), 'hires': 0, 'quits': 1, 'switches': 0})
        else:
            # prev -> curr and both not null
            if (prev_emp is not None) and (curr_emp is not None) and (prev_emp != curr_emp):
                # count as switch out for prev_emp
                events.append({'month': month, 'employerId': int(prev_emp), 'hires': 0, 'quits': 0, 'switches': 1})

    if len(events) == 0:
        print("[employer_service] No transitions detected; writing empty turnover.csv")
        out = pd.DataFrame(columns=['month', 'employerId', 'hires', 'quits', 'switches', 'turnoverRate'])
        _save_csv(out, 'turnover.csv')
        return out

    evdf = pd.DataFrame(events)
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

    # Compute turnoverRate
    def _calc_turnover(row):
        denom = row['avgEmployeeCount']
        if pd.isna(denom) or denom == 0:
            return 0.0
        return float((row.get('hires', 0) + row.get('quits', 0) + row.get('switches', 0)) / denom)

    merged['turnoverRate'] = merged.apply(_calc_turnover, axis=1)
    out = merged[['month', 'employerId', 'hires', 'quits', 'switches', 'turnoverRate']].copy()
    _save_csv(out, 'turnover.csv')
    print(f"[employer_service] Wrote turnover for {len(out)} (month,employer) groups")
    return out


def _process_job_flows():
    """Produce `job_flows.csv` with columns: fromEmployer, toEmployer, count

    Count transitions where participant moved from employer X to employer Y.
    """
    jobs = _load_jobs()
    job_to_employer = jobs.set_index('jobId')['employerId'].to_dict()

    frames = []
    for df in _iter_participant_status_logs():
        df = df[['timestamp', 'participantId', 'jobId']].copy()
        df['jobId'] = pd.to_numeric(df['jobId'], errors='coerce')
        df = df.dropna(subset=['jobId'])
        df['jobId'] = df['jobId'].astype(int)
        frames.append(df)

    if len(frames) == 0:
        out = pd.DataFrame(columns=['fromEmployer', 'toEmployer', 'count'])
        _save_csv(out, 'job_flows.csv')
        return out

    all_df = pd.concat(frames, ignore_index=True)
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


def _process_tenure():
    """Produce `tenure.csv` with employer-level tenure statistics.

    For each participant-jobId pair, compute tenure in days between first and last occurrence.
    Aggregate per employerId computing median, avg, min, max tenures.
    """
    jobs = _load_jobs()
    job_to_employer = jobs.set_index('jobId')['employerId'].to_dict()

    frames = []
    for df in _iter_participant_status_logs():
        df = df[['timestamp', 'participantId', 'jobId']].copy()
        df['jobId'] = pd.to_numeric(df['jobId'], errors='coerce')
        df = df.dropna(subset=['jobId'])
        df['jobId'] = df['jobId'].astype(int)
        frames.append(df)

    if len(frames) == 0:
        out = pd.DataFrame(columns=['employerId', 'medianTenure', 'avgTenure', 'minTenure', 'maxTenure'])
        _save_csv(out, 'tenure.csv')
        return out

    all_df = pd.concat(frames, ignore_index=True)

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


def build_employer_datasets():
    """Main entrypoint: runs all processing steps and writes CSVs.

    First checks for cached unified dataset; if found, returns it immediately.
    Otherwise processes all data from scratch and caches result.

    Returns a dictionary of DataFrames for convenience.
    """
    print("[employer_service] Building employer datasets...")
    
    # Check cache first
    cached = _load_cached_unified_employer_dataset()
    if cached is not None:
        print("[employer_service] Using cached employer dataset")
        return cached

    # Step 1: employer meta
    meta = _process_employer_meta()

    # Step 2: employee counts
    emp_counts = _process_employee_counts()

    # Step 3: turnover (needs employee counts for avg)
    turnover = _process_turnover(employee_counts_df=emp_counts)

    # Step 4: job flows
    flows = _process_job_flows()

    # Step 5: tenure
    tenure = _process_tenure()

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


def get_turnover_heatmap_data():
    """
    Calculate turnover rate matrix for heatmap.
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


if __name__ == '__main__':
    # quick local run
    build_employer_datasets()

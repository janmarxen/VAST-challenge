import pandas as pd
from pathlib import Path
import sys

DATA_DIR = Path('/app/data/raw')

def check_late_changes():
    print("Checking for job changes in late files...")
    # Check a few files from the second half of the period
    # Total 72 files. 
    # File 1 ~ March 2022. File 72 ~ May 2023.
    # If "no changes after April", then files > 20 (approx) should have 0 changes.
    
    files_to_check = [30, 40, 50, 60, 70]
    
    for i in files_to_check:
        path = DATA_DIR / f"ParticipantStatusLogs{i}.csv"
        if not path.exists():
            print(f"File {path} not found")
            continue
            
        print(f"Reading {path}...")
        df = pd.read_csv(path, usecols=['timestamp', 'participantId', 'jobId'])
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df['jobId'] = pd.to_numeric(df['jobId'], errors='coerce')
        
        # Sort
        df = df.sort_values(['participantId', 'timestamp'])
        
        # Shift to find changes
        df['prev_jobId'] = df.groupby('participantId')['jobId'].shift(1)
        
        # Find changes
        # We need to handle NaNs. fillna with -1 for comparison
        df['filled_job'] = df['jobId'].fillna(-1)
        df['filled_prev'] = df['prev_jobId'].fillna(-1)
        
        changes = df[df['filled_job'] != df['filled_prev']]
        
        if not changes.empty:
            print(f"Found {len(changes)} status changes in file {i}")
            print(f"Sample dates: {changes['timestamp'].dt.date.unique()[:5]}")
            
            # Breakdown
            hires = changes[(df['prev_jobId'].isna()) & (df['jobId'].notna())]
            quits = changes[(df['prev_jobId'].notna()) & (df['jobId'].isna())]
            switches = changes[(df['prev_jobId'].notna()) & (df['jobId'].notna())]
            
            print(f"  Hires: {len(hires)}")
            print(f"  Quits: {len(quits)}")
            print(f"  Switches: {len(switches)}")
        else:
            print(f"No job status changes in file {i}")

if __name__ == "__main__":
    check_late_changes()

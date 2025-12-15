# VAST Project - Containerized Web Application

This submission release contains a containerized backend (Flask API) and frontend (React + Nginx), provided as **pre-built Docker images** for execution without rebuilding.

## Requirements
- Docker ≥ 24
- Docker Compose (v2)

## Getting the Files
Download the release bundle from:
https://github.com/janmarxen/VAST-challenge/releases/tag/submission-v1.0.0

For the simplest setup, download `vast-submission.tar.gz` (prebuilt images + cached data). It contains:
- `backend.tar` - pre-built backend Docker image
- `frontend.tar` - pre-built frontend Docker image
- `docker-compose.yml` - production Docker Compose file
- `processed.tar.gz` - precomputed `data/processed` cache (recommended)
- `README.md` - instructions

Extract the bundle, then follow the steps below.

#### Linux / macOS
Open a terminal in the folder where `vast-submission.tar.gz` is located and run:

```bash
tar -xzf vast-submission.tar.gz
```
#### Windows (PowerShell)
```bash
Expand-Archive -Path vast-submission.zip -DestinationPath .
```

## Instructions: How to Run

1. Extract the precomputed cache into `data/processed`:

```bash
mkdir -p data
tar -xzf processed.tar.gz -C data
```

2. Load the Docker images:
```bash
docker load -i backend.tar
docker load -i frontend.tar
```

3. Start the application:

```bash
docker compose up
```

4. Open the frontend in your browser:

```
http://localhost:8080
```

**Important**: If you skip `processed.tar.gz`, the app will generate `data/processed` on first run, which can take 1–2 hours.

## Optional (if files are missing)

If `backend.tar` / `frontend.tar` are not available, build and run from source code (after unzipping the source code artifact from the submission release):

```bash
docker compose -f docker-compose.dev.yml up --build
```

If you want to recompute `data/processed` yourself (instead of using `processed.tar.gz`), extract all CSVs from `VAST-Challenge-2022.zip` into `data/raw` (flat, no subfolders):

```bash
mkdir -p data/raw
zipinfo -1 VAST-Challenge-2022.zip | grep -Ei '\.csv$' | while read -r f; do
	unzip -q -j VAST-Challenge-2022.zip "$f" -d data/raw
done
```

## Notes

* Images are provided as binaries to ensure reproducibility. No build step is required.
* Source code is available via the GitHub repository and tagged release referenced in the submission.

## Stopping the Application

```bash
docker compose down
```


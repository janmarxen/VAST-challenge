# VAST Project - Containerized Web Application

This submission contains a containerized backend (Flask API) and frontend (React + Nginx), provided as **pre-built Docker images** for execution without rebuilding.

## Requirements
- Docker ≥ 24
- Docker Compose (v2)

## Files Included
- `backend.tar` - pre-built backend Docker image
- `frontend.tar` - pre-built frontend Docker image
- `processed.tar.gz` - precomputed `data/processed` cache (recommended)
- `docker-compose.yml`
- `README.md`

Instead of building the application yourself, please download `backend.tar`, `frontend.tar`, and `processed.tar.gz` from:
https://github.com/janmarxen/VAST-challenge/releases/tag/submission-v1.0.0

## How to Run

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

If `backend.tar` / `frontend.tar` are not available, build and run from source:

```bash
docker compose up --build
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


# VAST Project - Containerized Web Application

This submission contains a containerized backend (Flask API) and frontend (React + Nginx), provided as **pre-built Docker images** for execution without rebuilding.

## Requirements
- Docker ≥ 24
- Docker Compose (v2)

## Files Included
- `backend.tar` - pre-built backend Docker image
- `frontend.tar` - pre-built frontend Docker image
- `docker-compose.yml`
- `README.md`

## How to Run

1. Extract all CSVs from `VAST-Challenge-2022.zip` into `data/raw` (flat, no subfolders):

```bash
mkdir -p data/raw
zipinfo -1 VAST-Challenge-2022.zip | grep -Ei '\.csv$' | while read -r f; do
	unzip -q -j VAST-Challenge-2022.zip "$f" -d data/raw
done
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

**Important**: When running the application for the first time, the system will generate data in the `data/processed` folder. This initial processing may take 1–2 hours due to the large volume of data. Once completed, the results are cached and subsequent runs of the application will be significantly faster.

## Notes

* Images are provided as binaries to ensure reproducibility. No build step is required.
* Source code is available via the GitHub repository and tagged release referenced in the submission.

## Stopping the Application

```bash
docker compose down
```


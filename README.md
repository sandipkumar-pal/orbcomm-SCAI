# Supply Chain Capacity Index Platform

This repository contains a full-stack implementation of the Supply Chain Capacity Index (SCCI) analytics platform. It includes a Node.js/Express backend for KPI computation and data APIs, a Streamlit frontend for visual analytics, and Docker-based deployment assets.

## Project Structure

```
backend/        # Node.js API service (Express, Sequelize)
streamlit_app/  # Streamlit dashboard that consumes the backend APIs
code/           # Python utilities for KPI experimentation and data science workflows
data/           # Local Parquet inputs consumed by the ingestion service (not committed)
docker/         # Container orchestration and reverse proxy assets
```

## Getting Started

1. Create a `.env` file based on `.env.example` and provide values for:
   - `PORT`
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `MAPBOX_TOKEN` (optional; enables Mapbox basemaps in the Streamlit map)
   - `DATA_DIR` (optional local path override for Parquet files)
   - `BACKEND_URL` (optional override for Streamlit when running outside Docker)

2. Install dependencies and start services locally:

```bash
# Backend
cd backend
npm install
npm run dev

# Streamlit dashboard
cd ../streamlit_app
python -m venv .venv
source .venv/bin/activate  # PowerShell: .venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
streamlit run app.py
```

On Windows, run the above commands from **PowerShell** or **Git Bash**. If your project path contains spaces (for example when the
repository is under OneDrive), quote the path when changing directories:

```powershell
Set-Location "C:\Users\you\OneDrive - Company\Orbcomm\backend"
npm install
```

If PowerShell is your default shell for npm, ensure scripts use it by running once:

```powershell
npm config set script-shell "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
```

The backend uses the pure JavaScript `parquets` reader so no native compilation is required on Windows. Streamlit runs on the system Python interpreter; install dependencies with `pip install -r streamlit_app/requirements.txt` if you prefer to reuse an existing environment.

3. Launch the Dockerized stack:

```bash
cd docker
docker compose up --build
```

The application will be served through the Nginx reverse proxy at [http://localhost:8080](http://localhost:8080).

## KPI Formulas

The backend exposes calculated KPIs via `/api/kpi/:routeCode/:week` using the following definitions:

- **SDEI** = Available ÷ Loaded
- **SDCUI** = Used ÷ Total
- **SII** = Average Stop Duration × (Trips over 5 minutes ÷ Total Trips)
- **RPI** = Route-level performance variation (from Transearch data)

Trend endpoints return KPI time series to power frontend visualizations. Use `GET /api/kpi` to retrieve the list of available routes and their active weeks, and `POST /api/kpi/:routeCode/trend` for multi-week trend data.

For data science workflows or rapid prototyping, equivalent Python helpers are available in
`code/kpi_utils.py`. These utilities expose the same calculations used by the production
backend, making it easier to validate new KPI ideas before porting them to the service
layer.

## Authentication

JWT-based authentication protects all API routes. Admin users can provision new accounts via `/auth/register`, while all users authenticate via `/auth/login`.

## Local Data Ingestion

Operational data can be read directly from Parquet files located in the repository-level `data/` directory (or another folder specified through the `DATA_DIR` environment variable). The backend exposes helper endpoints for analysts to validate imports without touching the database:

- `GET /api/ingestion/metadata` – returns schema metadata and a small sample from both required Parquet files.
- `GET /api/ingestion/preview?limit=25` – streams up to `limit` rows from each dataset to quickly inspect the payload.
- `POST /api/ingestion/load` – ingests both Parquet files into the PostgreSQL database. Accepts an optional JSON body: `{ "truncate": true }` clears existing records before loading, and `{ "files": { "countyPairMoves": "/custom/path.parquet" } }` overrides the default filenames.

The preview and metadata routes require an authenticated JWT with the `admin` or `analyst` role. Dataset loading is restricted to `admin` users.

### Python-first exploration

The `code/` package now includes `ingestion_utils.py`, a lightweight toolkit that mirrors the backend ingestion logic for analysts working in notebooks. It can read the Parquet files, iterate over records, and prepare payloads compatible with the REST API. Install `pandas` in your Python environment and explore the helpers:

```python
from code import (
    load_county_pair_moves,
    load_transearch_sample,
    iter_dict_rows,
    prepare_orbcomm_payload,
    prepare_transearch_payload,
)

orbcomm_frame = load_county_pair_moves()
transearch_frame = load_transearch_sample()

first_payload = prepare_orbcomm_payload(next(iter_dict_rows(orbcomm_frame)))
```

## Deployment

The Docker composition includes services for PostgreSQL, backend, Streamlit, and an Nginx reverse proxy. Update environment variables and secrets before deploying to production.

A GitHub Actions workflow (`.github/workflows/ci.yml`) is provided as a placeholder for future CI/CD automation.

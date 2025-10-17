# Running the Supply Chain Capacity Index Platform

This document explains how to start the backend API, launch the Streamlit dashboard, and preview the full experience through Docker. Follow the path that best matches your environment.

## 1. Prerequisites

- Node.js 18+
- npm 9+
- Python 3.10+ (for the local Streamlit dashboard)
- Docker Desktop 4.x (for the Docker-based option)
- Mapbox access token (optional for Mapbox basemaps in the telemetry view)
- PostgreSQL 13+ (for running the backend without Docker)

> **Windows tip:** Install the latest **Node.js 20 LTS** build and run commands from **PowerShell** or **Git Bash**. When npm prompt
s to install additional tools, allow it so native build tools are configured automatically.

## 2. Environment Configuration

1. Duplicate `.env.example` into `.env` at the repository root and supply the required values:
   ```bash
   cp .env.example .env
   ```

   **Windows alternative:**
   ```powershell
   Copy-Item .env.example .env
   ```
   - `PORT` – backend port (defaults to `4000`)
   - `DATABASE_URL` – PostgreSQL connection string (e.g. `postgres://user:password@localhost:5432/scci`)
   - `JWT_SECRET` – random string used to sign JWTs
   - `MAPBOX_TOKEN` – Mapbox access token (optional; enables Mapbox styles in the telemetry map)
   - `DATA_DIR` – optional absolute path to Parquet inputs (leave blank to use the `data/` folder)
   - `BACKEND_URL` – optional override for the Streamlit app when running outside Docker (defaults to `http://localhost:4000`)

## 3. Running the Backend Locally

```bash
cd backend
npm install
npm run dev
```

On Windows, quote directories that contain spaces and set npm to use PowerShell (run once):

```powershell
npm config set script-shell "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
Set-Location "C:\Users\you\OneDrive - Company\Orbcomm\backend"
npm install
npm run dev
```

The backend will run on `http://localhost:4000` (or the value of `PORT`). Ensure your PostgreSQL instance is reachable with the configured credentials. Sequelize migrations/seeders can be added later via the `backend/models` folder.

## 4. Running the Streamlit Dashboard Locally

Open a new terminal session (or activate a virtual environment) and install dependencies:

```bash
cd streamlit_app
python -m venv .venv
source .venv/bin/activate  # PowerShell: .venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
streamlit run app.py
```

When working from PowerShell, remember to activate the virtual environment before running Streamlit:

```powershell
Set-Location "C:\Users\you\OneDrive - Company\Orbcomm\streamlit_app"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
streamlit run app.py
```

Streamlit will print a local URL (typically `http://localhost:8501`). Open it in the browser, authenticate with the backend, and the dashboard UI will render using live API data. Set the `BACKEND_URL` environment variable if the backend runs on a non-default host or port.

## 5. Full Stack via Docker Compose

To start all services (PostgreSQL, backend, Streamlit, Nginx proxy) with one command:

```bash
cd docker
docker compose up --build
```

After the stack finishes building, navigate to [http://localhost:8080](http://localhost:8080) for the proxied UI. Backend APIs are exposed internally at `http://backend:4000` and externally at `http://localhost:4000`.

Use `Ctrl + C` to stop the stack. To remove containers and networks, run `docker compose down` from the same directory.

## 6. First-Time Account Setup

1. POST to `http://localhost:4000/auth/register` with admin credentials (or seed a user directly in the database).
2. Log in through the dashboard UI using the created account.
3. Explore filters, KPI widgets, trend charts, and the Leaflet map.

With these steps completed, you should see the full Supply Chain Capacity Index dashboard running locally.

## 7. Python KPI Utilities

For offline experimentation or rapid iteration on new metrics, reusable Python helpers live in
`code/kpi_utils.py`. The module mirrors the production KPI formulas and can be imported into
notebooks or data science scripts as follows:

```python
from code.kpi_utils import summarize_kpis, KpiInput

inputs = KpiInput(
    available=120,
    loaded=100,
    used=80,
    total=150,
    avg_stop_duration=12.5,
    trips_over_five=40,
    total_trips=90,
    performance_variation=0.87,
)

print(summarize_kpis(inputs))
```

This makes it simple to validate calculations or design additional KPIs before porting changes to the Node.js services.

## 8. Loading Local Parquet Data

Place the following datasets in the repository-level `data/` directory (create it if it does not yet exist):

- `county_pair_move_data_06037-04019.parquet`
- `transearch_data_sample.parquet`

Alternatively, set the `DATA_DIR` environment variable (for example in `.env`) to point at another directory containing the files.
On Windows, prefer absolute paths wrapped in quotes, such as `DATA_DIR="C:\\Users\\you\\Documents\\SCCIData"`.

Once the backend is running, you can confirm the ingestion pipeline with authenticated requests:

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4000/api/ingestion/metadata"

curl -H "Authorization: Bearer <token>" \
  "http://localhost:4000/api/ingestion/preview?limit=20"

curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"truncate": true}' \
  "http://localhost:4000/api/ingestion/load"
```

These routes read from the Parquet files on disk, emit schema information, and return sample rows so that analysts can validate the payload before seeding the database. The `load` endpoint persists both Parquet files into PostgreSQL and is restricted to accounts with the `admin` role. Omit the body for an append-only load or supply `{ "files": { "countyPairMoves": "/custom/path" } }` to override the default filenames on disk.

### Python exploration workflow

For offline validation, install `pandas` and use the helper module in `code/ingestion_utils.py`:

```python
from code import load_county_pair_moves, iter_dict_rows, prepare_orbcomm_payload

frame = load_county_pair_moves()
first_payload = prepare_orbcomm_payload(next(iter_dict_rows(frame)))
```

The resulting dictionaries can be posted directly to the backend ingestion API or manipulated locally when designing additional metrics.

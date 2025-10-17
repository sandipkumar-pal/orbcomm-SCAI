# Running the Supply Chain Capacity Index Platform

This document explains how to start the backend API, launch the React dashboard, and preview the full experience through Docker. Follow the path that best matches your environment.

## 1. Prerequisites

- Node.js 18+
- npm 9+
- Docker Desktop 4.x (for the Docker-based option)
- Mapbox access token (required for the Leaflet/Mapbox map)
- PostgreSQL 13+ (for running the backend without Docker)

## 2. Environment Configuration

1. Duplicate `.env.example` into `.env` at the repository root and supply the required values:
   ```bash
   cp .env.example .env
   ```
   - `PORT` – backend port (defaults to `5000`)
   - `DATABASE_URL` – PostgreSQL connection string (e.g. `postgres://user:password@localhost:5432/scci`)
   - `JWT_SECRET` – random string used to sign JWTs
   - `MAPBOX_TOKEN` – Mapbox access token

2. For the frontend, expose the token as `VITE_MAPBOX_TOKEN` by creating `frontend/.env`:
   ```bash
   echo "VITE_MAPBOX_TOKEN=YOUR_MAPBOX_TOKEN" > frontend/.env
   ```

## 3. Running the Backend Locally

```bash
cd backend
npm install
npm run dev
```

The backend will run on `http://localhost:5000` (or the value of `PORT`). Ensure your PostgreSQL instance is reachable with the configured credentials. Sequelize migrations/seeders can be added later via the `backend/models` folder.

## 4. Running the Frontend Locally

Open a new terminal session:

```bash
cd frontend
npm install
npm run dev
```

Vite prints a local URL (typically `http://localhost:5173`). Open it in the browser, log in, and the dashboard UI will render using live API data from the backend.

## 5. Full Stack via Docker Compose

To start all services (PostgreSQL, backend, frontend, Nginx proxy) with one command:

```bash
cd docker
docker compose up --build
```

After the stack finishes building, navigate to [http://localhost:8080](http://localhost:8080) for the proxied UI. Backend APIs are exposed internally at `http://backend:5000` and externally at `http://localhost:5000`.

Use `Ctrl + C` to stop the stack. To remove containers and networks, run `docker compose down` from the same directory.

## 6. First-Time Account Setup

1. POST to `http://localhost:5000/auth/register` with admin credentials (or seed a user directly in the database).
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

Once the backend is running, you can confirm the ingestion pipeline with authenticated requests:

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5000/api/ingestion/metadata"

curl -H "Authorization: Bearer <token>" \
  "http://localhost:5000/api/ingestion/preview?limit=20"
```

These routes read from the Parquet files on disk, emit schema information, and return sample rows so that analysts can validate the payload before seeding the database.

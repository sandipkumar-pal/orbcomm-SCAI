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

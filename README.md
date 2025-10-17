# Supply Chain Capacity Index Platform

This repository contains a full-stack implementation of the Supply Chain Capacity Index (SCCI) analytics platform. It includes a Node.js/Express backend for KPI computation and data APIs, a React + Tailwind frontend for visual analytics, and Docker-based deployment assets.

## Project Structure

```
backend/   # Node.js API service (Express, Sequelize)
frontend/  # React dashboard (Vite, Tailwind, Leaflet, Recharts)
docker/    # Container orchestration and reverse proxy assets
```

## Getting Started

1. Create a `.env` file based on `.env.example` and provide values for:
   - `PORT`
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `MAPBOX_TOKEN`

   For local development with the React app, expose the token as `VITE_MAPBOX_TOKEN` (e.g. by creating `frontend/.env` with `VITE_MAPBOX_TOKEN=$MAPBOX_TOKEN`).

2. Install dependencies and start services locally:

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd ../frontend
npm install
npm run dev
```

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

Trend endpoints return KPI time series to power frontend visualizations.

## Authentication

JWT-based authentication protects all API routes. Admin users can provision new accounts via `/auth/register`, while all users authenticate via `/auth/login`.

## Deployment

The Docker composition includes services for PostgreSQL, backend, frontend, and an Nginx reverse proxy. Update environment variables and secrets before deploying to production.

A GitHub Actions workflow (`.github/workflows/ci.yml`) is provided as a placeholder for future CI/CD automation.

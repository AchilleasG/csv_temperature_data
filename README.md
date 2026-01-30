# csv_temperature_data

Full-stack app for exploring historical monthly temperature data (°C) across multiple weather stations (1859–2019).

**Features**

- Select one or more stations
- Analytics summary (count/mean/std/min/max)
- Plot modes:
  - Monthly series
  - Annual averages
  - Annual averages with ±1σ overlay
- Zoom controls (center year input + window slider), plus Plotly drag-zoom/pan

## Run with Docker (recommended)

```bash
docker compose up --build
```

- Web UI: `http://127.0.0.1:5173`
- API docs (Swagger): `http://127.0.0.1:8000/api/docs`

## Run locally (dev)

### Backend (FastAPI)

Install deps (use a virtualenv if desired):

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
```

Configure CSV path (optional):

- Copy `.env.example` to `.env` and set `CSV_PATH`, or export `CSV_PATH` in your shell.

Run the server:

```bash
python -m uvicorn csv_temperature_data.main:app --reload --app-dir src
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

The dev server proxies `/api/*` to `http://localhost:8000` by default. To override:

```bash
VITE_API_PROXY_TARGET=http://127.0.0.1:8000 npm run dev
```

## API examples

Healthcheck:

```bash
curl http://127.0.0.1:8000/api/health
```

Stations:

```bash
curl http://127.0.0.1:8000/api/stations
```

Analytics summary:

```bash
curl "http://127.0.0.1:8000/api/analytics/summary?stations=66062&start_year=1859&end_year=1862"
```

Monthly data:

```bash
curl "http://127.0.0.1:8000/api/data/monthly?stations=66062&start_year=1859&end_year=1862"
```

Annual data:

```bash
curl "http://127.0.0.1:8000/api/data/annual?stations=66062&start_year=1859&end_year=1862&include_std=true"
```

## Tests

```bash
. .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m pytest
```

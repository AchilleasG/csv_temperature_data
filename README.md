# csv_temperature_data API

## Run locally

Install deps:

```bash
python3 -m pip install -r requirements.txt
```

Configure CSV path (optional):

- Copy `.env.example` to `.env` and set `CSV_PATH`, or export `CSV_PATH` in your shell.

Run the server:

```bash
python -m uvicorn csv_temperature_data.main:app --reload --app-dir src
```

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

## Docker

Build and run:

```bash
docker build -t csv-temperature-data .
docker run --rm -p 8000:8000 -v "$(pwd)/data:/app/data:ro" -e CSV_PATH=/app/data/temperature_data.csv csv-temperature-data
```

Or via compose:

```bash
docker compose up --build
```

Frontend (compose):

- Open `http://127.0.0.1:5173`
- API Swagger: `http://127.0.0.1:8000/api/docs`

## Tests

```bash
python3 -m pip install -r requirements-dev.txt
python3 -m pytest
```

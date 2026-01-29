from __future__ import annotations

from fastapi import HTTPException

from csv_temperature_data.core.config import settings
from csv_temperature_data.core.csv_data import station_set


def parse_stations_param(stations: str) -> list[str]:
    station_list = [s.strip() for s in stations.split(",") if s and s.strip()]
    if not station_list:
        raise HTTPException(status_code=422, detail="stations is required")
    return station_list


def validate_year_range(start_year: int | None, end_year: int | None) -> None:
    if start_year is not None and end_year is not None and start_year > end_year:
        raise HTTPException(status_code=422, detail="start_year must be <= end_year")


def ensure_stations_exist(stations: list[str]) -> None:
    available = station_set(settings.csv_path)
    missing = sorted(set(stations) - set(available))
    if missing:
        raise HTTPException(status_code=404, detail={"missing_stations": missing})


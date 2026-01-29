from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from csv_temperature_data.core.config import settings
from csv_temperature_data.core.csv_data import annual_data, data_year_range, monthly_data
from csv_temperature_data.api.utils import ensure_stations_exist, parse_stations_param, validate_year_range

router = APIRouter(prefix="/data", tags=["data"])

_MISSING_STATIONS_404 = {
    "description": "One or more requested stations do not exist in the dataset.",
    "content": {
        "application/json": {
            "example": {"detail": {"missing_stations": ["999"]}},
        }
    },
}


@router.get("/range")
def get_range() -> dict[str, int | None]:
    try:
        return data_year_range(settings.csv_path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"CSV_PATH not found: {settings.csv_path}") from e


@router.get("/monthly", responses={404: _MISSING_STATIONS_404})
def get_monthly(
    stations: str = Query(..., description="Comma-separated station numbers"),
    start_year: int | None = Query(None),
    end_year: int | None = Query(None),
) -> dict[str, object]:
    station_list = parse_stations_param(stations)
    validate_year_range(start_year, end_year)

    try:
        ensure_stations_exist(station_list)
        return monthly_data(
            settings.csv_path,
            stations=station_list,
            start_year=start_year,
            end_year=end_year,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"CSV_PATH not found: {settings.csv_path}") from e


@router.get("/annual", responses={404: _MISSING_STATIONS_404})
def get_annual(
    stations: str = Query(..., description="Comma-separated station numbers"),
    start_year: int | None = Query(None),
    end_year: int | None = Query(None),
    include_std: bool = Query(False),
) -> dict[str, object]:
    station_list = parse_stations_param(stations)
    validate_year_range(start_year, end_year)

    try:
        ensure_stations_exist(station_list)
        return annual_data(
            settings.csv_path,
            stations=station_list,
            start_year=start_year,
            end_year=end_year,
            include_std=include_std,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"CSV_PATH not found: {settings.csv_path}") from e

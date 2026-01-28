from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from csv_temperature_data.core.config import settings
from csv_temperature_data.core.csv_data import annual_data, monthly_data, station_set

router = APIRouter(prefix="/data", tags=["data"])

_MISSING_STATIONS_404 = {
    "description": "One or more requested stations do not exist in the dataset.",
    "content": {
        "application/json": {
            "example": {"detail": {"missing_stations": ["999"]}},
        }
    },
}


@router.get("/monthly", responses={404: _MISSING_STATIONS_404})
def get_monthly(
    stations: str = Query(..., description="Comma-separated station numbers"),
    start_year: int | None = Query(None),
    end_year: int | None = Query(None),
) -> dict[str, object]:
    station_list = [s.strip() for s in stations.split(",") if s and s.strip()]
    if not station_list:
        raise HTTPException(status_code=422, detail="stations is required")
    if start_year is not None and end_year is not None and start_year > end_year:
        raise HTTPException(status_code=422, detail="start_year must be <= end_year")

    try:
        available = station_set(settings.csv_path)
        missing = sorted(set(station_list) - set(available))
        if missing:
            raise HTTPException(status_code=404, detail={"missing_stations": missing})
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
    station_list = [s.strip() for s in stations.split(",") if s and s.strip()]
    if not station_list:
        raise HTTPException(status_code=422, detail="stations is required")
    if start_year is not None and end_year is not None and start_year > end_year:
        raise HTTPException(status_code=422, detail="start_year must be <= end_year")

    try:
        available = station_set(settings.csv_path)
        missing = sorted(set(station_list) - set(available))
        if missing:
            raise HTTPException(status_code=404, detail={"missing_stations": missing})
        return annual_data(
            settings.csv_path,
            stations=station_list,
            start_year=start_year,
            end_year=end_year,
            include_std=include_std,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"CSV_PATH not found: {settings.csv_path}") from e

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from csv_temperature_data.core.config import settings
from csv_temperature_data.core.csv_data import unique_stations

router = APIRouter(tags=["stations"])


@router.get("/stations")
def list_stations() -> dict[str, object]:
    try:
        stations = unique_stations(settings.csv_path)
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=500,
            detail=f"CSV_PATH not found: {settings.csv_path}",
        ) from e

    return {"count": len(stations), "stations": stations}


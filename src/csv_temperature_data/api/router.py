from fastapi import APIRouter

from csv_temperature_data.api.routes.health import router as health_router
from csv_temperature_data.api.routes.stations import router as stations_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(stations_router)

from fastapi import APIRouter

from csv_temperature_data.api.routes.health import router as health_router
from csv_temperature_data.api.routes.analytics import router as analytics_router
from csv_temperature_data.api.routes.data import router as data_router
from csv_temperature_data.api.routes.stations import router as stations_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(stations_router)
api_router.include_router(analytics_router)
api_router.include_router(data_router)

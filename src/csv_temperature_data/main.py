from fastapi import FastAPI

from csv_temperature_data.api.router import api_router
from csv_temperature_data.core.config import settings

app = FastAPI(
    title=settings.app_name,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)
app.include_router(api_router, prefix="/api")

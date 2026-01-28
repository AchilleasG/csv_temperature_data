from __future__ import annotations

import os
from typing import Literal

from pydantic import BaseModel


class Settings(BaseModel):
    env: Literal["development", "test", "production"] = "development"
    app_name: str = "csv_temperature_data"
    csv_path: str = "data/temperature_data.csv"

    @classmethod
    def from_env(cls) -> "Settings":
        raw_env = os.getenv("APP_ENV", "development").lower()
        env = raw_env if raw_env in {"development", "test", "production"} else "development"
        csv_path = os.getenv("CSV_PATH", "data/temperature_data.csv")
        return cls(env=env, csv_path=csv_path)


settings = Settings.from_env()

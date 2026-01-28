from __future__ import annotations

import os
import threading
from typing import Iterable
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    import pandas as pd


_MONTH_ORDER: list[tuple[str, int]] = [
    ("Jan", 1),
    ("Feb", 2),
    ("Mar", 3),
    ("Apr", 4),
    ("May", 5),
    ("Jun", 6),
    ("Jul", 7),
    ("Aug", 8),
    ("Sep", 9),
    ("Oct", 10),
    ("Nov", 11),
    ("Dec", 12),
]
_MONTH_NAMES = {name for name, _ in _MONTH_ORDER}


def _sort_station_key(value: str):
    try:
        return (0, int(value))
    except ValueError:
        return (1, value)


class _CsvStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._cache: dict[str, tuple[int, int, Any, list[str], frozenset[str]]] = {}

    def get(self, csv_path: str) -> tuple["pd.DataFrame", list[str], frozenset[str]]:
        stat = os.stat(csv_path)  # raises FileNotFoundError
        with self._lock:
            cached = self._cache.get(csv_path)
            if cached is not None:
                mtime_ns, size, df, month_cols, stations_set = cached
                if mtime_ns == stat.st_mtime_ns and size == stat.st_size:
                    return df, month_cols, stations_set

            df, month_cols, stations_set = self._load(csv_path)
            self._cache[csv_path] = (stat.st_mtime_ns, stat.st_size, df, month_cols, stations_set)
            return df, month_cols, stations_set

    @staticmethod
    def _load(csv_path: str) -> tuple["pd.DataFrame", list[str], frozenset[str]]:
        try:
            import pandas as pd
        except ModuleNotFoundError as e:
            raise RuntimeError("pandas is required. Install requirements.txt.") from e

        df = pd.read_csv(
            csv_path,
            sep=";",
            encoding="utf-8",
            engine="c",
            dtype={
                "Station Number": "string",
                "Year": "Int64",
                "Jan": "float32",
                "Feb": "float32",
                "Mar": "float32",
                "Apr": "float32",
                "May": "float32",
                "Jun": "float32",
                "Jul": "float32",
                "Aug": "float32",
                "Sep": "float32",
                "Oct": "float32",
                "Nov": "float32",
                "Dec": "float32",
            },
            na_values=["", "NA", "NaN", "null", "NULL"],
            keep_default_na=True,
        )
        df = df.rename(columns={c: c.strip() for c in df.columns})
        month_cols = [name for name, _ in _MONTH_ORDER if name in df.columns]
        stations_col = df.get("Station Number")
        if stations_col is None:
            stations_set: frozenset[str] = frozenset()
        else:
            stations_set = frozenset(stations_col.dropna().astype(str).tolist())
        return df, month_cols, stations_set


_STORE = _CsvStore()


def unique_stations(csv_path: str) -> list[str]:
    _, _, stations_set = _STORE.get(csv_path)
    values = list(stations_set)
    values.sort(key=_sort_station_key)
    return values


def station_set(csv_path: str) -> frozenset[str]:
    _, _, stations_set = _STORE.get(csv_path)
    return stations_set


def analytics_summary(
    csv_path: str,
    *,
    stations: Iterable[str],
    start_year: int | None = None,
    end_year: int | None = None,
) -> dict[str, int | float | None]:
    df, month_cols, _ = _STORE.get(csv_path)
    station_list = [s.strip() for s in stations if s and s.strip()]
    if not station_list or not month_cols:
        return {"count": 0, "mean": None, "std": None, "min": None, "max": None}

    mask = df["Station Number"].isin(station_list)
    if start_year is not None:
        mask &= df["Year"] >= start_year
    if end_year is not None:
        mask &= df["Year"] <= end_year

    try:
        import numpy as np
    except ModuleNotFoundError as e:
        raise RuntimeError("numpy is required (installed with pandas).") from e

    values = df.loc[mask, month_cols].to_numpy(copy=False).ravel()
    finite = np.isfinite(values)
    count = int(finite.sum())
    if count == 0:
        return {"count": 0, "mean": None, "std": None, "min": None, "max": None}

    values = values[finite]
    return {
        "count": count,
        "mean": float(values.mean()),
        "std": float(values.std(ddof=0)),
        "min": float(values.min()),
        "max": float(values.max()),
    }


def monthly_data(
    csv_path: str,
    *,
    stations: Iterable[str],
    start_year: int | None = None,
    end_year: int | None = None,
) -> dict[str, object]:
    df, month_cols, _ = _STORE.get(csv_path)
    stations_key = tuple(sorted({s.strip() for s in stations if s and s.strip()}, key=_sort_station_key))
    if not stations_key or not month_cols:
        return {"stations": []}

    mask = df["Station Number"].isin(stations_key)
    if start_year is not None:
        mask &= df["Year"] >= start_year
    if end_year is not None:
        mask &= df["Year"] <= end_year

    try:
        import numpy as np
    except ModuleNotFoundError as e:
        raise RuntimeError("numpy is required (installed with pandas).") from e

    month_map = {name: month_num for name, month_num in _MONTH_ORDER}
    filtered = df.loc[mask, ["Station Number", "Year", *month_cols]].sort_values(
        ["Station Number", "Year"], kind="mergesort"
    )

    out: list[dict[str, object]] = []
    for station in stations_key:
        sub = filtered[filtered["Station Number"] == station]
        if sub.empty:
            out.append({"station": station, "points": []})
            continue

        years = sub["Year"].to_numpy(copy=False)
        data = sub[month_cols].to_numpy(copy=False)
        points: list[dict[str, object]] = []

        for row_i in range(data.shape[0]):
            year_val = years[row_i]
            if year_val is None or (isinstance(year_val, float) and np.isnan(year_val)):
                continue
            year_int = int(year_val)
            row = data[row_i]
            for col_i, name in enumerate(month_cols):
                v = row[col_i]
                if np.isfinite(v):
                    points.append({"year": year_int, "month": month_map[name], "value": float(v)})

        out.append({"station": station, "points": points})

    return {"stations": out}


def annual_data(
    csv_path: str,
    *,
    stations: Iterable[str],
    start_year: int | None = None,
    end_year: int | None = None,
    include_std: bool = False,
) -> dict[str, object]:
    df, month_cols, _ = _STORE.get(csv_path)
    stations_key = tuple(sorted({s.strip() for s in stations if s and s.strip()}, key=_sort_station_key))
    if not stations_key or not month_cols:
        return {"stations": []}

    mask = df["Station Number"].isin(stations_key)
    if start_year is not None:
        mask &= df["Year"] >= start_year
    if end_year is not None:
        mask &= df["Year"] <= end_year

    try:
        import numpy as np
    except ModuleNotFoundError as e:
        raise RuntimeError("numpy is required (installed with pandas).") from e

    filtered = df.loc[mask, ["Station Number", "Year", *month_cols]].copy()
    if filtered.empty:
        return {"stations": [{"station": s, "points": []} for s in stations_key]}

    month_matrix = filtered[month_cols].to_numpy(copy=False)
    annual_mean = np.nanmean(month_matrix, axis=1)
    filtered["annual_mean"] = annual_mean

    if include_std:
        annual_std = np.nanstd(month_matrix, axis=1, ddof=0)
        filtered["annual_std"] = annual_std

    filtered = filtered.sort_values(["Station Number", "Year"], kind="mergesort")

    out: list[dict[str, object]] = []
    for station, group in filtered.groupby("Station Number", sort=False):
        years = group["Year"].to_numpy(copy=False)
        means = group["annual_mean"].to_numpy(copy=False)
        stds = group["annual_std"].to_numpy(copy=False) if include_std else None

        points: list[dict[str, object]] = []
        for i in range(len(group)):
            year_val = years[i]
            if year_val is None or (isinstance(year_val, float) and np.isnan(year_val)):
                continue
            mean_val = means[i]
            if not np.isfinite(mean_val):
                continue
            year_int = int(year_val)
            if include_std:
                std_val = stds[i]
                if np.isfinite(std_val):
                    std_f = float(std_val)
                    mean_f = float(mean_val)
                    points.append(
                        {
                            "year": year_int,
                            "mean": mean_f,
                            "std": std_f,
                            "lower": mean_f - std_f,
                            "upper": mean_f + std_f,
                        }
                    )
                else:
                    points.append({"year": year_int, "mean": float(mean_val), "std": None})
            else:
                points.append({"year": year_int, "mean": float(mean_val)})

        out.append({"station": str(station), "points": points})

    # Ensure stations with zero points still appear, in requested order.
    existing = {item["station"] for item in out}
    for station in stations_key:
        if station not in existing:
            out.append({"station": station, "points": []})

    out.sort(key=lambda x: _sort_station_key(x["station"]))  # stable, small S
    return {"stations": out}

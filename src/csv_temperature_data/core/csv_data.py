from __future__ import annotations

import csv
import os
from functools import lru_cache


def unique_stations(csv_path: str) -> list[str]:
    stat = os.stat(csv_path)  # raises FileNotFoundError
    return list(_unique_stations_cached(csv_path, stat.st_mtime_ns, stat.st_size))


@lru_cache(maxsize=8)
def _unique_stations_cached(csv_path: str, mtime_ns: int, size: int) -> tuple[str, ...]:
    _ = (mtime_ns, size)  # part of cache key; avoids unused warnings

    stations: set[str] = set()
    with open(csv_path, newline="", encoding="utf-8", errors="replace") as f:
        reader = csv.reader(f, delimiter=";")
        next(reader, None)  # header
        for row in reader:
            if not row:
                continue
            stations.add(row[0].strip())

    def sort_key(value: str):
        try:
            return (0, int(value))
        except ValueError:
            return (1, value)

    return tuple(sorted(stations, key=sort_key))

